import { Chord, Interval } from "tonal";
import { TaggedSong } from "../assets/types";

// Fonction pour transposer une ligne d'accords
export function transposeLine(chords: string, step: number) {
  const chordsList = chords.split(" ");
  const transposedChords = chordsList.map((chord) =>
    Chord.transpose(chord, Interval.fromSemitones(step))
  );
  return transposedChords.join(" ");
}

export function transposeSong(
  taggedSong: TaggedSong | undefined,
  step: number
) {
  if (!taggedSong) return;
  const transposedSong = { ...taggedSong };
  transposedSong.strophes = transposedSong.strophes.map((strophe) => {
    const newContent = strophe.content.map((line) => ({
      ...line,
      chords: transposeLine(line.chords, step),
    }));
    return { ...strophe, content: newContent };
  });
  return transposedSong;
}
