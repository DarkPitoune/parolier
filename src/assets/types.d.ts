export interface Strophe {
	content: Line[];
	type: "verse" | "chorus" | "bridge";
	repetition: boolean;
}

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

export interface Leader {
	name: string;
	song?: number;
	status: "leader" | "follower";
}
