export type Strophe =
	| {
			content: Line[];
			type: "verse" | "chorus" | "bridge";
			repetition: boolean;
	  }
	| {
			type: "section";
			content: string;
	  };

export interface Line {
	text: string;
	chords: string;
}

export interface Settings {
	fontSize: number; // 0-10
	showChords: boolean;
	addChorus: boolean;
	darkMode: boolean;
	username: string;
}
