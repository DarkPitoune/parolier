export interface Song {
  title: string;
  id: number;
  strophes: Strophe[];
}

export interface Strophe {
  text: string;
  type: "verse" | "bridge" | "chorus";
  chords: string;
}
