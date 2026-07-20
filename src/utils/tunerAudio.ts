// Shared audio capture for the tuner. iOS Safari rejects BOTH
// `AudioContext.resume()` and `getUserMedia()` unless they originate from a
// user gesture (with no permission prompt shown — it just fails). So we kick
// both off from the "Accordeur" nav link click / the retry button, and hand
// the results to the tuner page, which mounts a moment later.

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let streamPromise: Promise<MediaStream> | null = null;

const getCtor = (): AudioContextCtor | null => {
	if (typeof window === "undefined") return null;
	return (
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: AudioContextCtor })
			.webkitAudioContext ??
		null
	);
};

/** Mic capture is only possible in a secure context with the API present. */
export const canCaptureMic = (): boolean =>
	typeof window !== "undefined" &&
	window.isSecureContext &&
	!!navigator.mediaDevices?.getUserMedia;

/** True when the page isn't served over HTTPS/localhost (mic impossible). */
export const isInsecureContext = (): boolean =>
	typeof window !== "undefined" && !window.isSecureContext;

/**
 * Current microphone permission, or "unknown" where the Permissions API can't
 * answer (Safari, older Firefox). Used to tell a persisted block ("denied",
 * where retrying is futile) apart from a transient/gesture refusal.
 */
export const micPermissionState = async (): Promise<
	PermissionState | "unknown"
> => {
	try {
		if (!navigator.permissions?.query) return "unknown";
		const status = await navigator.permissions.query({
			name: "microphone" as PermissionName,
		});
		return status.state;
	} catch {
		return "unknown";
	}
};

/**
 * Create/resume the shared AudioContext and start `getUserMedia`. MUST be
 * called synchronously from a user gesture (nav link click, retry button) so
 * iOS unlocks audio. Idempotent — repeated calls reuse the in-flight stream.
 */
export const startTunerCapture = (): void => {
	const Ctor = getCtor();
	if (Ctor) {
		if (!ctx || ctx.state === "closed") ctx = new Ctor();
		if (ctx.state === "suspended") ctx.resume().catch(() => {});
	}
	if (!streamPromise && navigator.mediaDevices?.getUserMedia) {
		// Disable the browser's voice processing: noise suppression treats a
		// sustained steady tone as background noise and gates it out after ~1s,
		// and AGC ducks the gain — both break pitch detection. We want raw audio.
		streamPromise = navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
			},
		});
	}
};

/** The shared AudioContext, creating one if a gesture hasn't already. */
export const getTunerAudioContext = (): AudioContext | null => {
	const Ctor = getCtor();
	if (Ctor && (!ctx || ctx.state === "closed")) ctx = new Ctor();
	return ctx;
};

/**
 * The mic stream promise, starting capture if no gesture has yet. On desktop
 * this on-demand start still prompts fine; on iOS it only succeeds when a
 * gesture kicked it off (otherwise it rejects and the retry button re-tries).
 */
export const getTunerStream = (): Promise<MediaStream> | null => {
	if (!streamPromise) startTunerCapture();
	return streamPromise;
};

/** Stop the mic, close the context, and reset so a gesture can re-capture. */
export const stopTunerCapture = (): void => {
	const pending = streamPromise;
	streamPromise = null;
	pending
		?.then((stream) => {
			for (const track of stream.getTracks()) track.stop();
		})
		.catch(() => {});
	ctx?.close().catch(() => {});
	ctx = null;
};
