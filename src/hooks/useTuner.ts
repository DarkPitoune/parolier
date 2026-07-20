import { type NoteReading, frequencyToNote } from "@/utils/pitch";
import {
	canCaptureMic,
	getTunerAudioContext,
	getTunerStream,
	isInsecureContext,
	micPermissionState,
	startTunerCapture,
	stopTunerCapture,
} from "@/utils/tunerAudio";
import { PitchDetector } from "pitchy";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

// Wider FFT window than the 2048 default so low bass (guitar/organ ~80 Hz)
// detects stably; still fine for voice and higher instruments.
const FFT_SIZE = 4096;
// Only trust readings the algorithm is confident about, so silence/noise
// doesn't produce a flailing needle.
const CLARITY_THRESHOLD = 0.9;
// Minimum input volume (dB) pitchy considers; below this it reports no pitch.
const MIN_VOLUME_DECIBELS = -10;
// Exponential smoothing factor for the displayed reading (0..1, higher = snappier).
const SMOOTHING = 0.25;

interface TunerState {
	reading: NoteReading | null;
	clarity: number;
	isListening: boolean;
	error: string | null;
}

interface UseTunerResult extends TunerState {
	/** Re-request mic access from a user gesture (e.g. the retry button). */
	retry: () => void;
}

/**
 * Real-time microphone pitch detection using the Web Audio API + pitchy.
 * Consumes the mic stream / AudioContext primed by the nav link gesture (see
 * tunerAudio.ts), listens while mounted, and releases everything on unmount.
 */
export function useTuner(): UseTunerResult {
	const [state, setState] = useState<TunerState>({
		reading: null,
		clarity: 0,
		isListening: false,
		error: null,
	});
	// Bumping this re-runs the effect to reacquire the mic.
	const [attempt, setAttempt] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` intentionally re-triggers mic acquisition
	useEffect(() => {
		let cancelled = false;
		let raf: number | null = null;
		let smoothFreq: number | null = null;

		const fail = (message: string) => {
			setState({
				reading: null,
				clarity: 0,
				isListening: false,
				error: message,
			});
			toast.error(message);
		};

		const run = async () => {
			if (!canCaptureMic()) {
				fail(
					isInsecureContext()
						? "Le micro nécessite une connexion sécurisée (HTTPS)"
						: "Micro non disponible sur cet appareil",
				);
				return;
			}

			try {
				const streamPromise = getTunerStream();
				if (!streamPromise) {
					fail("Micro non disponible sur cet appareil");
					return;
				}
				const stream = await streamPromise;
				// Unmounted during the permission grant → unmount cleanup handles it.
				if (cancelled) return;

				const audioContext = getTunerAudioContext();
				if (!audioContext) {
					fail("Micro non disponible sur cet appareil");
					return;
				}
				if (audioContext.state === "suspended") await audioContext.resume();
				if (cancelled) return;

				const analyser = audioContext.createAnalyser();
				analyser.fftSize = FFT_SIZE;
				audioContext.createMediaStreamSource(stream).connect(analyser);

				const detector = PitchDetector.forFloat32Array(analyser.fftSize);
				detector.minVolumeDecibels = MIN_VOLUME_DECIBELS;
				const input = new Float32Array(detector.inputLength);
				const sampleRate = audioContext.sampleRate;

				setState({ reading: null, clarity: 0, isListening: true, error: null });

				const loop = () => {
					if (cancelled) return;
					analyser.getFloatTimeDomainData(input);
					const [pitch, clarity] = detector.findPitch(input, sampleRate);

					if (clarity >= CLARITY_THRESHOLD && pitch > 0) {
						smoothFreq =
							smoothFreq === null
								? pitch
								: smoothFreq + (pitch - smoothFreq) * SMOOTHING;
						const reading = frequencyToNote(smoothFreq);
						setState((s) => ({ ...s, reading, clarity }));
					} else {
						smoothFreq = null;
						setState((s) =>
							s.reading === null ? s : { ...s, reading: null, clarity },
						);
					}

					raf = requestAnimationFrame(loop);
				};
				raf = requestAnimationFrame(loop);
			} catch (err) {
				if (cancelled) return;
				console.error("Tuner microphone error:", err);
				const isDenied =
					err instanceof DOMException && err.name === "NotAllowedError";
				let message = "Impossible d'accéder au micro";
				if (isDenied) {
					// A persisted "denied" means retrying is futile — point the user
					// to their browser settings instead of the generic refusal.
					message =
						(await micPermissionState()) === "denied"
							? "Micro bloqué. Réactivez-le dans les réglages du navigateur."
							: "Accès au micro refusé.";
				}
				if (cancelled) return;
				fail(message);
			}
		};

		run();

		return () => {
			cancelled = true;
			if (raf !== null) cancelAnimationFrame(raf);
			stopTunerCapture();
		};
	}, [attempt]);

	const retry = useCallback(() => {
		// This runs inside the button-click gesture, so re-priming here lets iOS
		// grant the mic on the retry even if the first (non-gesture) try failed.
		stopTunerCapture();
		startTunerCapture();
		setAttempt((a) => a + 1);
	}, []);

	return { ...state, retry };
}
