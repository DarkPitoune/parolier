import { transpose } from "@tonaljs/chord";
import { fromSemitones } from "@tonaljs/interval";

const frenchToEnglish: [RegExp, string][] = [
	[/^Sol/, "G"],
	[/^Ré/, "D"],
	[/^La/, "A"],
	[/^Si/, "B"],
	[/^Do/, "C"],
	[/^Mi/, "E"],
	[/^Fa/, "F"],
];

export function normalizeFrenchChord(chord: string): string {
	for (const [pattern, replacement] of frenchToEnglish) {
		if (pattern.test(chord)) {
			return chord.replace(pattern, replacement);
		}
	}
	return chord;
}

// Fonction pour transposer une ligne d'accords
export function transposeLine(chords: string, step: number) {
	const chordsList = chords.split(" ");
	const transposedChords = chordsList.map((chord) =>
		transpose(chord, fromSemitones(step)),
	);
	return transposedChords.join(" ");
}
