const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B",
] as const;

export interface NoteReading {
	/** English note name, e.g. "A" or "C#" */
	name: string;
	/** Scientific pitch octave, e.g. 4 for A440 */
	octave: number;
	/** Signed deviation from the nearest note in cents, roughly [-50, 50] */
	cents: number;
	/** The input frequency in Hz, echoed back */
	frequency: number;
}

/**
 * Convert a frequency in Hz to the nearest note (English naming) and its
 * deviation in cents. Reference pitch is fixed at A4 = 440 Hz.
 */
export function frequencyToNote(frequency: number): NoteReading {
	// Real-valued MIDI number: A4 (440 Hz) === 69.
	const midi = 12 * Math.log2(frequency / 440) + 69;
	const nearest = Math.round(midi);
	const cents = Math.round(100 * (midi - nearest));
	const name = NOTE_NAMES[((nearest % 12) + 12) % 12];
	const octave = Math.floor(nearest / 12) - 1;
	return { name, octave, cents, frequency };
}
