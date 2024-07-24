export interface Song {
  title: string;
  id: number;
  strophes: Strophe[];
}

export interface Strophe {
  type: "verse" | "bridge" | "chorus";
  text: { [key: string]: string };
  chords: { [key: string]: string };
}
