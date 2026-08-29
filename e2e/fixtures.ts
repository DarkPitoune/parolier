/**
 * The seeded fixtures from supabase/seed.sql, named.
 *
 * Tests address rows through this file rather than `.first()`. A test that
 * clicks whatever happens to be first passes for the wrong reasons: it cannot
 * tell "the list rendered the right song" from "the list rendered anything at
 * all", and it silently changes meaning when the data changes.
 *
 * Keep in step with supabase/seed.sql.
 */

export const SONGS = {
	/** Four strophes, chords on every line. The presenter specs walk this one. */
	withChords: { id: 601, title: "Tu es là", strophes: 4 },
	/** Carries a musician-only performance note on its first strophe. */
	withNote: { id: 602, title: "Je vous salue Marie" },
	refrain: { id: 603, title: "Alléluia, magnificat" },
	ordinaire: { id: 604, title: "Kyrie de Saint-Jean" },
	/** Opens with a `section` strophe rather than lyrics. */
	withSection: { id: 605, title: "Peuple de lumière" },
	/** Deliberately not in any setlist — used to prove search reaches the corpus. */
	searchOnly: { id: 606, title: "Souffle imprévisible" },
	/** Taller than the viewport, so scroll position has somewhere to go. */
	long: { id: 607, title: "Litanie des saints" },
	/**
	 * Reserved for the editor round-trip, which writes to it. Nothing else
	 * asserts its contents — the Playwright suite runs fullyParallel, so a spec
	 * that saves must not share a song with a spec that reads.
	 */
	editable: { id: 608, title: "Brouillon", firstLine: "Ligne de brouillon" },
} as const;

export const TEXTS = {
	inSetlist: { id: 801, title: "Prière de saint François" },
	standalone: { id: 802, title: "Acte de contrition" },
} as const;

export const SETLISTS = {
	/** Four steps: song 601, song 605, text 801, refrain 603. */
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
