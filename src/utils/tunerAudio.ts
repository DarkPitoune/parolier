// Shared AudioContext for the tuner. iOS only lets an AudioContext start (and
// stay) running if it is created/resumed inside a user gesture. We prime it
// from the "Accordeur" nav link click so the tuner page can auto-start without
// its own button.

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

const getCtor = (): AudioContextCtor | null => {
	if (typeof window === "undefined") return null;
	return (
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: AudioContextCtor })
			.webkitAudioContext ??
		null
	);
};

/**
 * Create (if needed) and resume the shared tuner AudioContext. Must be called
 * from a user gesture — e.g. the nav link's `onClick` — so iOS unlocks audio.
 */
export const primeTunerAudioContext = (): AudioContext | null => {
	const Ctor = getCtor();
	if (!Ctor) return null;
	if (!ctx || ctx.state === "closed") ctx = new Ctor();
	if (ctx.state === "suspended") ctx.resume().catch(() => {});
	return ctx;
};

/** Return the shared context, creating it if one doesn't exist yet. */
export const getTunerAudioContext = (): AudioContext | null =>
	ctx && ctx.state !== "closed" ? ctx : primeTunerAudioContext();

/** Close and forget the shared context (called when the tuner unmounts). */
export const releaseTunerAudioContext = (): void => {
	ctx?.close().catch(() => {});
	ctx = null;
};
