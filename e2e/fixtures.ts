/** The seeded fixtures from supabase/seed.sql. Keep the two in step. */

export const SONGS = {
	/** Four strophes, chords on every line. */
	withChords: { id: 601, title: "Tu es là", strophes: 4 },
	/** Carries a musician-only performance note on its first strophe. */
	withNote: { id: 602, title: "Je vous salue Marie" },
	refrain: { id: 603, title: "Alléluia, magnificat" },
	ordinaire: { id: 604, title: "Kyrie de Saint-Jean" },
	/** Opens with a `section` strophe rather than lyrics. */
	withSection: { id: 605, title: "Peuple de lumière" },
	/** In no setlist. */
	searchOnly: { id: 606, title: "Souffle imprévisible" },
	/** Taller than the viewport, so scroll position has somewhere to go. */
	long: { id: 607, title: "Litanie des saints" },
	/**
	 * Written to by the editor spec. The suite runs fullyParallel, so nothing
	 * else may assert this row's contents.
	 */
	editable: { id: 608, title: "Brouillon", firstLine: "Ligne de brouillon" },
} as const;

export const TEXTS = {
	inSetlist: { id: 801, title: "Prière de saint François" },
	standalone: { id: 802, title: "Acte de contrition" },
} as const;

export const SETLISTS = {
	/** Four steps, one of them a text. */
	sunday: {
		id: 501,
		name: "Messe du dimanche",
		steps: 4,
		firstSong: SONGS.withChords,
	},
	short: { id: 502, name: "Répétition", steps: 2 },
} as const;

export const TAGS = {
	louange: { id: 901, name: "Louange" },
	communion: { id: 902, name: "Communion" },
	marial: { id: 903, name: "Marial" },
} as const;
