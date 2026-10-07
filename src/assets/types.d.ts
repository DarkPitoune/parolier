export type GlyphGroup = "who" | "how";

/**
 * "Note de jeu" carried by a strophe: how to play it, not what to sing.
 * Shared data — there is no per-user storage anywhere in this app.
 *
 * `who` is a roster: a glyph present means that part plays, absent means it
 * is tacet. That is what makes "batterie et chant seulement" free to express.
 * `how` is the intent vocabulary (dynamics, ruptures, colour).
 *
 * The group is structural — it is the array a glyph sits in, never stored per
 * glyph — so an emoji written through the free escape hatch still renders in
 * the right vocabulary with nothing to infer.
 */
export interface StropheNote {
	who: string[];
	how: string[];
	text?: string;
}

export type Strophe =
	| {
			content: Line[];
			type: "verse" | "chorus" | "bridge";
			repetition: boolean;
			note?: StropheNote;
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

/**
 * Opening phrase of a piece, to recognise which melody it is when the lyrics
 * are shared across settings (mass ordinaries). `abc` is the soprano line of
 * the first system; `image_path` is a crop of the score, a public storage
 * path like `sheet_music_url`, shown when there is no transcription.
 */
export interface Incipit {
	label: string;
	abc?: string;
	image_path?: string;
}
