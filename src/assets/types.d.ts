export interface Song {
  title: string;
  id: number;
  strophes: Strophe[];
}

export interface Strophe {
  content: Line[];
  type: "verse" | "chorus" | "bridge";
}

export interface Line {
  text: string;
  chords: string;
}
