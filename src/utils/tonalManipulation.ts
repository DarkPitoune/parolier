import { transpose } from "@tonaljs/chord";
import { fromSemitones } from "@tonaljs/interval";

// Fonction pour transposer une ligne d'accords
export function transposeLine(chords: string, step: number) {
	const chordsList = chords.split(" ");
	const transposedChords = chordsList.map((chord) =>
		transpose(chord, fromSemitones(step)),
	);
	return transposedChords.join(" ");
}
