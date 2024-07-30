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

export interface Settings {
  fontSize: number; // 0-10
  showChords: boolean;
  addChorus: boolean;
}
export interface Tag {
  id: number;
  name: string;
  svg: string;
  color: string;
}

export interface TaggedSong extends Song {
  tags: Tag[];
}
