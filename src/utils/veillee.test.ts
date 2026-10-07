import { describe, expect, it } from "vitest";
import type { AllTaggedSongs } from "./supabase";
import {
	type HistoryRow,
	type SlotKind,
	type VeilleeBrief,
	buildDraft,
	buildTemplate,
	compactVeilleeSongs,
	estimateDuration,
	usageHints,
} from "./veillee";

const brief = (overrides: Partial<VeilleeBrief> = {}): VeilleeBrief => ({
	theme: "La confiance",
	durationMin: 60,
	adoration: true,
	silences: "few",
	marie: true,
	...overrides,
});

const count = (template: SlotKind[], slot: SlotKind) =>
	template.filter((s) => s === slot).length;

describe("buildTemplate", () => {
	it("follows the louange → esprit → adoration → marie arc", () => {
		const template = buildTemplate(brief());
		const firstEsprit = template.indexOf("esprit");
		expect(template.slice(0, firstEsprit).every((s) => s === "louange")).toBe(
			true,
		);
		expect(count(template, "esprit")).toBe(1);
		expect(template.at(-1)).toBe("marie");
		expect(
			template
				.slice(firstEsprit + 1, -1)
				.every((s) => s === "adoration" || s === "silence"),
		).toBe(true);
	});

	it("fits the requested duration", () => {
		for (const durationMin of [30, 45, 60, 90] as const) {
			const minutes = estimateDuration(
				buildTemplate(brief({ durationMin })).map((slot) => ({ slot })),
			);
			expect(Math.abs(minutes - durationMin)).toBeLessThanOrEqual(6);
		}
	});

	it("drops adoration and silences when there is no adoration", () => {
		const template = buildTemplate(
			brief({ adoration: false, silences: "many" }),
		);
		expect(count(template, "adoration")).toBe(0);
		expect(count(template, "silence")).toBe(0);
		expect(count(template, "esprit")).toBe(1);
	});

	it("places one silence mid-adoration for a few, one after each song for many", () => {
		const few = buildTemplate(brief({ silences: "few" }));
		expect(count(few, "silence")).toBe(1);
		expect(few[few.indexOf("silence") - 1]).toBe("adoration");
		expect(few[few.indexOf("silence") + 1]).toBe("adoration");

		const many = buildTemplate(brief({ silences: "many" }));
		expect(count(many, "silence")).toBe(count(many, "adoration"));
		many.forEach((slot, i) => {
			if (slot === "adoration") expect(many[i + 1]).toBe("silence");
		});
	});

	it("omits marie when not wanted", () => {
		expect(count(buildTemplate(brief({ marie: false })), "marie")).toBe(0);
	});
});

const song = (id: number, tags: string[], type = "song", strophes = []) => ({
	id,
	title: `Song ${id}`,
	type,
	strophes,
	tags: tags.map((name, i) => ({ id: i, name, svg: null, color: null })),
});

const songs = [
	song(1, ["Louange"]),
	song(2, ["Louange"]),
	song(3, ["Esprit Saint"]),
	song(4, ["Louange"]),
	song(5, ["Adoration"]),
	song(6, ["Marie"]),
	song(7, [], "response"),
] as unknown as AllTaggedSongs;

let rowId = 0;
const set = (setlistId: number, name: string, songIds: number[]) =>
	songIds.map(
		(songId, position): HistoryRow => ({
			id: rowId++,
			setlist_id: setlistId,
			position,
			song_id: songId,
			setlists: { name },
		}),
	);

describe("usageHints", () => {
	it("counts songs by their place around the Esprit Saint pivot", () => {
		const hints = usageHints(set(1, "Veillée", [1, 2, 3, 4, 5, 6]), songs);
		expect(hints.get(1)).toEqual({ louange: 1 });
		expect(hints.get(3)).toEqual({ esprit: 1 });
		expect(hints.get(4)).toEqual({ adoration: 1 });
		expect(hints.get(5)).toEqual({ adoration: 1 });
		expect(hints.get(6)).toEqual({ marie: 1 });
	});

	it("orders by position, not by row order", () => {
		const rows = set(1, "Veillée", [1, 3, 4]).reverse();
		expect(usageHints(rows, songs).get(4)).toEqual({ adoration: 1 });
	});

	it("ignores masses and sets without a pivot", () => {
		const hints = usageHints(
			[
				...set(1, "Messe du 2 octobre", [1, 3, 4]),
				...set(2, "Concert", [1, 7, 3, 4]),
				...set(3, "Pool louange", [1, 2, 4]),
			],
			songs,
		);
		expect(hints.size).toBe(0);
	});

	it("skips text items and accumulates across sets", () => {
		const hints = usageHints(
			[
				...set(1, "A", [1, 3, 4]),
				...set(2, "B", [4, 3]),
				{
					id: rowId++,
					setlist_id: 2,
					position: 9,
					song_id: null,
					setlists: { name: "B" },
				},
			],
			songs,
		);
		expect(hints.get(4)).toEqual({ adoration: 1, louange: 1 });
	});
});

describe("compactVeilleeSongs", () => {
	it("keeps CD songs, drops liturgical parts, and attaches usage", () => {
		const withCd = [
			song(1, ["CD 1", "Louange"]),
			song(7, [], "response"),
		] as unknown as AllTaggedSongs;
		const compact = compactVeilleeSongs(
			withCd,
			new Map([[1, { adoration: 2 }]]),
		);
		expect(compact).toHaveLength(1);
		expect(compact[0]).toMatchObject({
			id: 1,
			tags: ["CD 1", "Louange"],
			usedAs: { adoration: 2 },
		});
	});

	it("excerpts the chorus then the first verse", () => {
		const [compact] = compactVeilleeSongs(
			[
				song(1, [], "song", [
					{
						type: "verse",
						repetition: false,
						content: [{ text: "Couplet", chords: "" }],
					},
					{
						type: "chorus",
						repetition: false,
						content: [{ text: "Refrain", chords: "" }],
					},
				] as never),
			] as unknown as AllTaggedSongs,
			new Map(),
		);
		expect(compact.excerpt).toBe("Refrain\nCouplet");
	});
});

describe("buildDraft", () => {
	const known = new Set([1, 2, 3, 4, 5, 6]);
	const pick = (
		slot: "louange" | "esprit" | "adoration" | "marie",
		id: number,
	) => ({
		slot,
		songId: id,
		reasoning: "",
		alternatives: [],
	});

	it("lays picks onto the template and keeps its silences", () => {
		const draft = buildDraft(
			["louange", "louange", "esprit", "adoration", "silence", "marie"],
			[
				pick("marie", 6),
				pick("louange", 2),
				pick("adoration", 5),
				pick("louange", 1),
				pick("esprit", 3),
			],
			known,
		);
		expect(draft.map((i) => i.songId)).toEqual([2, 1, 3, 5, null, 6]);
		expect(draft[4].slot).toBe("silence");
	});

	it("drops unknown ids, repeats and surplus picks", () => {
		const draft = buildDraft(
			["louange", "esprit"],
			[
				pick("louange", 99),
				pick("louange", 1),
				pick("louange", 2),
				pick("esprit", 1),
			],
			known,
		);
		expect(draft.map((i) => i.songId)).toEqual([1]);
	});

	it("filters alternatives to unused known songs", () => {
		const [item] = buildDraft(
			["louange", "esprit"],
			[
				{ ...pick("louange", 1), alternatives: [3, 4, 99, 4] },
				pick("esprit", 3),
			],
			known,
		);
		expect(item.alternatives).toEqual([4]);
	});

	it("lets any song fill any slot", () => {
		const draft = buildDraft(["adoration"], [pick("adoration", 1)], known);
		expect(draft[0].songId).toBe(1);
	});
});
