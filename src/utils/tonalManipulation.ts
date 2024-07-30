import { Chord, Interval } from "tonal";

// Fonction pour transposer une ligne d'accords
export function transposeLine(chords: string, step: number) {
  const chordsList = chords.split(" ");
  const transposedChords = chordsList.map((chord) =>
    Chord.transpose(chord, Interval.fromSemitones(step))
  );
  return transposedChords.join(" ");
}
