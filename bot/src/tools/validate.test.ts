import type { Strophe } from "@/assets/types";
import { describe, expect, it } from "vitest";
import { applyStropheEdits, cleanStrophes, stropheVersion } from "./validate";

type Sung = Extract<Strophe, { content: unknown[] }>;
const verse = (text: string, extra: Partial<Sung> = {}): Strophe => ({
	type: "verse",
	repetition: false,
	content: [{ text, chords: "" }],
	...extra,
});

describe("applyStropheEdits", () => {
	const original: Strophe[] = [
		verse("un"),
		verse("deux", { note: { who: ["🥁"], how: [], text: "batterie seule" } }),
		verse("trois"),
	];

	it("replaces a strophe and keeps its playing note", () => {
		const result = applyStropheEdits(original, [
			{ op: "replace", index: 1, strophe: verse("deux bis") as never },
		]);
		expect(result).toHaveLength(3);
		expect(result[1]).toMatchObject({
			content: [{ text: "deux bis" }],
			note: { text: "batterie seule" },
		});
		expect(result[0]).toBe(original[0]);
	});

	it("applies deletes and inserts against the original indices", () => {
		const result = applyStropheEdits(original, [
			{ op: "delete", index: 0 },
			{ op: "insert", after: 2, strophe: verse("quatre") as never },
			{
				op: "insert",
				after: -1,
				strophe: { type: "section", content: "Intro" },
			},
		]);
		expect(
			result.map((s) =>
				s.type === "section" ? s.content : s.content[0]?.text,
			),
		).toEqual(["Intro", "deux", "trois", "quatre"]);
	});

	it("refuses out-of-range indices, double edits and an empty song", () => {
		expect(() =>
			applyStropheEdits(original, [{ op: "delete", index: 3 }]),
		).toThrow(/does not exist/);
		expect(() =>
			applyStropheEdits(original, [
				{ op: "delete", index: 1 },
				{ op: "replace", index: 1, strophe: verse("x") as never },
			]),
		).toThrow(/twice/);
		expect(() =>
			applyStropheEdits([verse("seul")], [{ op: "delete", index: 0 }]),
		).toThrow(/at least one/);
	});
});

describe("cleanStrophes", () => {
	it("trims, collapses chord spacing and replaces stray non-breaking spaces", () => {
		const [s] = cleanStrophes([
			{
				type: "chorus",
				repetition: true,
				content: [{ text: "  Gloire\u00a0à toi\u00a0!  ", chords: " Am   E " }],
			},
		]);
		expect(s).toEqual({
			type: "chorus",
			repetition: true,
			content: [{ text: "Gloire à toi\u00a0!", chords: "Am E" }],
		});
	});
});

describe("stropheVersion", () => {
	it("changes when the title or the strophes change", () => {
		const a = stropheVersion("T", [verse("un")]);
		expect(stropheVersion("T", [verse("un")])).toBe(a);
		expect(stropheVersion("T2", [verse("un")])).not.toBe(a);
		expect(stropheVersion("T", [verse("une")])).not.toBe(a);
	});
});
