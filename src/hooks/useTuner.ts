import { type NoteReading, frequencyToNote } from "@/utils/pitch";
import {
	getTunerAudioContext,
	releaseTunerAudioContext,
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
	/** Re-request mic access (e.g. after the user granted permission). */
	retry: () => void;
}

/**
 * Real-time microphone pitch detection using the Web Audio API + pitchy.
 * Listens automatically while mounted and releases the mic on unmount.
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
		let stream: MediaStream | null = null;
		let audioContext: AudioContext | null = null;
		let raf: number | null = null;
		let smoothFreq: number | null = null;

		const release = () => {
			if (raf !== null) cancelAnimationFrame(raf);
			for (const track of stream?.getTracks() ?? []) track.stop();
			releaseTunerAudioContext();
		};

		const run = async () => {
			if (!navigator.mediaDevices?.getUserMedia) {
				const message = "Micro non disponible sur cet appareil";
				setState({
					reading: null,
					clarity: 0,
					isListening: false,
					error: message,
				});
				toast.error(message);
				return;
			}

			try {
				stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				// Unmounted during the permission grant → release and bail.
				if (cancelled) {
					for (const track of stream.getTracks()) track.stop();
					return;
				}

				// Shared context, ideally already primed+running from the nav link
				// click (required for iOS); resume defensively otherwise.
				audioContext = getTunerAudioContext();
				if (!audioContext) {
					const message = "Micro non disponible sur cet appareil";
					setState({
						reading: null,
						clarity: 0,
						isListening: false,
						error: message,
					});
					toast.error(message);
					for (const track of stream.getTracks()) track.stop();
					return;
				}
				if (audioContext.state === "suspended") await audioContext.resume();
				if (cancelled) {
					release();
					return;
				}

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
				const isDenied =
					err instanceof DOMException && err.name === "NotAllowedError";
				const message = isDenied
					? "Accès au micro refusé"
					: "Impossible d'accéder au micro";
				setState({
					reading: null,
					clarity: 0,
					isListening: false,
					error: message,
				});
				toast.error(message);
			}
		};

		run();

		return () => {
			cancelled = true;
			release();
		};
	}, [attempt]);

	const retry = useCallback(() => setAttempt((a) => a + 1), []);

	return { ...state, retry };
}
