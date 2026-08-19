import type { Strophe, StropheNote } from "@/assets/types";
import {
	buildDisplayStrophes,
	getStropheNote,
	isNoteEmpty,
	normalizeNote,
	setStropheNote,
	stropheFingerprint,
} from "./stropheNotes";

const note = (over: Partial<StropheNote> = {}): StropheNote => ({
	who: ["🎤"],
	how: [],
	...over,
});

const lyric = (
	text: string,
	over: Partial<Extract<Strophe, { repetition: boolean }>> = {},
): Strophe =>
	({
		content: [{ text, chords: "Em" }],
		type: "verse",
		repetition: false,
		...over,
	}) as Strophe;

const section = (content: string): Strophe => ({ type: "section", content });

// Mirrors song 104: chorus, verse, chorus*, verse, chorus*
const song = (): Strophe[] => [
	lyric("Tu es là présent", { type: "chorus" }),
	lyric("1. Le pain que nous mangeons"),
	lyric("Tu es là présent", { type: "chorus", repetition: true }),
	lyric("2. Par le don de Ta vie"),
	lyric("Tu es là présent", { type: "chorus", repetition: true }),
];

describe("isNoteEmpty", () => {
	it("treats missing, blank and whitespace-only notes as empty", () => {
		expect(isNoteEmpty(undefined)).toBe(true);
		expect(isNoteEmpty({ who: [], how: [] })).toBe(true);
		expect(isNoteEmpty({ who: [], how: [], text: "   " })).toBe(true);
	});

	it("is non-empty with a glyph in either vocabulary, or with text", () => {
		expect(isNoteEmpty({ who: ["🥁"], how: [] })).toBe(false);
		expect(isNoteEmpty({ who: [], how: ["🔥"] })).toBe(false);
		expect(isNoteEmpty({ who: [], how: [], text: "on envoie" })).toBe(false);
	});
});

describe("normalizeNote", () => {
	it("trims text and drops it when blank", () => {
		expect(normalizeNote(note({ text: "  on envoie  " }))?.text).toBe(
			"on envoie",
		);
		expect("text" in (normalizeNote(note({ text: "  " })) ?? {})).toBe(false);
	});

	it("collapses an empty note to undefined", () => {
		expect(normalizeNote({ who: [], how: [], text: "" })).toBeUndefined();
	});

	it("preserves glyph insertion order", () => {
		expect(normalizeNote(note({ who: ["🥁", "🎤", "🎸"] }))?.who).toEqual([
			"🥁",
			"🎤",
			"🎸",
		]);
	});
});

describe("setStropheNote", () => {
	it("sets a note without mutating the input array or its siblings", () => {
		const strophes = song();
		const result = setStropheNote(strophes, 2, note({ how: ["🔥"] }));

		expect(getStropheNote(result[2])).toEqual({ who: ["🎤"], how: ["🔥"] });
		expect(result).not.toBe(strophes);
		expect(getStropheNote(strophes[2])).toBeUndefined();
		expect(result[1]).toBe(strophes[1]);
	});

	it("removes the key entirely when the note is cleared", () => {
		const withNote = setStropheNote(song(), 2, note());
		const cleared = setStropheNote(withNote, 2, { who: [], how: [], text: "" });

		// `toBeUndefined` would also pass for `{note: undefined}`, letting a
		// null regress into the stored JSON. Assert the key is truly gone.
		expect("note" in cleared[2]).toBe(false);
	});

	it("no-ops on a section and on an out-of-range index", () => {
		const strophes = [section("Refrain"), ...song()];
		expect(setStropheNote(strophes, 0, note())).toBe(strophes);
		expect(setStropheNote(strophes, 99, note())).toBe(strophes);
	});

	it("tolerates a legacy strophe with no type and no repetition", () => {
		const legacy = [{ content: [{ text: "x", chords: "" }] }] as Strophe[];
		const result = setStropheNote(legacy, 0, note());
		expect(getStropheNote(result[0])).toEqual({ who: ["🎤"], how: [] });
	});
});

describe("stropheFingerprint", () => {
	it("distinguishes strophes, sections and absence", () => {
		expect(stropheFingerprint(lyric("Tu es là"))).toBe("lyric:Tu es là");
		expect(stropheFingerprint(section("Refrain"))).toBe("section:Refrain");
		expect(stropheFingerprint(undefined)).toBe("");
	});

	it("does not throw on a strophe with no content", () => {
		expect(() => stropheFingerprint({} as Strophe)).not.toThrow();
	});
});

describe("buildDisplayStrophes", () => {
	it("returns [] for missing strophes", () => {
		expect(buildDisplayStrophes(undefined, opts())).toEqual([]);
		expect(buildDisplayStrophes([], opts())).toEqual([]);
	});

	function opts(
		over: Partial<{ addChorus: boolean; showNotes: boolean }> = {},
	) {
		return { addChorus: false, showNotes: true, ...over };
	}

	it("hides unnoted repetitions and keeps noted ones", () => {
		const strophes = setStropheNote(song(), 2, note({ how: ["🔥"] }));
		const result = buildDisplayStrophes(strophes, opts());

		expect(result.map((d) => d.sourceIndex)).toEqual([0, 1, 2, 3]);
		expect(result[2].shownBecauseNoted).toBe(true);
		expect(result[2].ordinalLabel).toBe("refrain 2");
	});

	it("does NOT rescue a noted repetition when notes are hidden", () => {
		const strophes = setStropheNote(song(), 2, note());
		const withNotesOff = buildDisplayStrophes(
			strophes,
			opts({ showNotes: false }),
		);
		const untouched = buildDisplayStrophes(song(), opts({ showNotes: false }));

		expect(withNotesOff.map((d) => d.sourceIndex)).toEqual([0, 1, 3]);
		expect(withNotesOff.map((d) => d.sourceIndex)).toEqual(
			untouched.map((d) => d.sourceIndex),
		);
	});

	it("never marks anything as revealed when repetitions are shown anyway", () => {
		const strophes = setStropheNote(song(), 2, note());
		const result = buildDisplayStrophes(strophes, opts({ addChorus: true }));

		expect(result).toHaveLength(5);
		expect(result.every((d) => !d.shownBecauseNoted)).toBe(true);
	});

	it("does not mark a noted NON-repetition as revealed", () => {
		const strophes = setStropheNote(song(), 0, note());
		const result = buildDisplayStrophes(strophes, opts());
		expect(result[0].shownBecauseNoted).toBe(false);
	});

	it("an empty note object does not rescue a repetition", () => {
		const strophes = song();
		strophes[2] = {
			...strophes[2],
			note: { who: [], how: [], text: "  " },
		} as Strophe;
		expect(buildDisplayStrophes(strophes, opts())).toHaveLength(3);
	});

	it("counts ordinals over the full list, including hidden strophes", () => {
		const strophes = setStropheNote(song(), 4, note());
		const result = buildDisplayStrophes(strophes, opts());
		const revealed = result.find((d) => d.sourceIndex === 4);

		// Chorus 2 is filtered out, but the third chorus is still "refrain 3".
		expect(revealed?.ordinalLabel).toBe("refrain 3");
	});

	it("labels bridges and verses too, not just choruses", () => {
		const strophes = [lyric("a"), lyric("b", { type: "bridge" })];
		const result = buildDisplayStrophes(strophes, opts());
		expect(result.map((d) => d.ordinalLabel)).toEqual(["couplet 1", "pont 1"]);
	});

	it("sourceIndex is the position in the input array, not the output", () => {
		const result = buildDisplayStrophes(song(), opts());
		expect(result.map((d) => d.sourceIndex)).toEqual([0, 1, 3]);
	});

	it("keeps sections under every setting, with no ordinal", () => {
		const strophes = [section("Refrain"), ...song()];
		for (const o of [
			opts(),
			opts({ addChorus: true }),
			opts({ showNotes: false }),
		]) {
			const first = buildDisplayStrophes(strophes, o)[0];
			expect(first.strophe.type).toBe("section");
			expect(first.ordinalLabel).toBeUndefined();
		}
	});

	it("keeps a legacy strophe with no type, labelled as a couplet", () => {
		const legacy = [{ content: [{ text: "x", chords: "" }] }] as Strophe[];
		const result = buildDisplayStrophes(legacy, opts());
		expect(result).toHaveLength(1);
		expect(result[0].ordinalLabel).toBe("couplet 1");
	});
});
