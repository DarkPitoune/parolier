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
