import { describe, expect, it } from "vitest";
import type { DraftItem } from "./veillee";
import { type DraftOp, applyOps } from "./veilleeDraft";

const draft: DraftItem[] = [
	{ key: "song-1", slot: "louange", songId: 1, alternatives: [7] },
	{ key: "song-2", slot: "louange", songId: 2 },
	{ key: "song-3", slot: "esprit", songId: 3 },
	{ key: "song-4", slot: "adoration", songId: 4 },
	{ key: "silence-4", slot: "silence", songId: null },
	{ key: "song-5", slot: "marie", songId: 5 },
];
const known = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

const run = (...ops: DraftOp[]) => applyOps(draft, ops, known);
const ids = (items: DraftItem[]) => items.map((i) => i.songId);

describe("applyOps", () => {
	it("replaces a song and keeps the old one as an alternative", () => {
		const { items, changed } = run({ op: "replace", key: "song-1", songId: 6 });
		expect(ids(items)).toEqual([6, 2, 3, 4, null, 5]);
		expect(items[0]).toMatchObject({
			key: "song-6",
			slot: "louange",
			alternatives: [1, 7],
		});
		expect(changed).toEqual(["song-6"]);
	});

	it("inserts after a key, or at the start with a null key", () => {
		expect(
			ids(
				run({ op: "insert", afterKey: "song-4", slot: "adoration", songId: 6 })
					.items,
			),
		).toEqual([1, 2, 3, 4, 6, null, 5]);
		expect(
			ids(
				run({ op: "insert", afterKey: null, slot: "louange", songId: 6 }).items,
			),
		).toEqual([6, 1, 2, 3, 4, null, 5]);
	});

	it("removes songs and silences", () => {
		const { items } = run(
			{ op: "remove", key: "song-2" },
			{ op: "remove", key: "silence-4" },
		);
		expect(ids(items)).toEqual([1, 3, 4, 5]);
	});

	it("moves an item, clamping the target index", () => {
		expect(ids(run({ op: "move", key: "song-1", toIndex: 2 }).items)).toEqual([
			2,
			3,
			1,
			4,
			null,
			5,
		]);
		expect(ids(run({ op: "move", key: "song-5", toIndex: -3 }).items)).toEqual([
			5,
			1,
			2,
			3,
			4,
			null,
		]);
	});

	it("adds silences with unique keys", () => {
		const { items } = run(
			{ op: "addSilence", afterKey: "song-3" },
			{ op: "addSilence", afterKey: "song-3" },
		);
		const silences = items.filter((i) => i.slot === "silence");
		expect(silences).toHaveLength(3);
		expect(new Set(silences.map((s) => s.key)).size).toBe(3);
		expect(items[3].slot).toBe("silence");
	});

	it("applies ops in sequence", () => {
		const { items } = run(
			{ op: "insert", afterKey: "song-2", slot: "louange", songId: 6 },
			{ op: "replace", key: "song-6", songId: 8 },
		);
		expect(ids(items)).toEqual([1, 2, 8, 3, 4, null, 5]);
	});

	it("skips invalid ops without throwing and leaves the draft untouched", () => {
		const { items, skipped } = run(
			{ op: "replace", key: "song-99", songId: 6 },
			{ op: "replace", key: "silence-4", songId: 6 },
			{ op: "replace", key: "song-1", songId: 99 },
			{ op: "replace", key: "song-1", songId: 2 },
			{ op: "insert", afterKey: "nope", slot: "louange", songId: 6 },
			{ op: "insert", afterKey: null, slot: "rock" as never, songId: 6 },
			{ op: "remove", key: "nope" },
			{ op: "move", key: "nope", toIndex: 0 },
			{ op: "addSilence", afterKey: "nope" },
			{ op: "dance" } as never,
		);
		expect(items).toEqual(draft);
		expect(skipped).toHaveLength(10);
		expect(skipped[1]).toMatch(/silence/);
		expect(skipped[9]).toMatch(/^Modification impossible/);
	});

	it("keeps a single Esprit Saint pivot", () => {
		const { items, skipped } = run({
			op: "insert",
			afterKey: "song-3",
			slot: "esprit",
			songId: 6,
		});
		expect(items.filter((i) => i.slot === "esprit")).toHaveLength(1);
		expect(skipped).toHaveLength(1);
	});

	it("lets any song go in any slot", () => {
		const { items } = run({
			op: "insert",
			afterKey: "song-4",
			slot: "adoration",
			songId: 7,
		});
		expect(items[4]).toMatchObject({ slot: "adoration", songId: 7 });
	});

	it("does not mutate its input", () => {
		const before = structuredClone(draft);
		run(
			{ op: "remove", key: "song-1" },
			{ op: "move", key: "song-2", toIndex: 4 },
		);
		expect(draft).toEqual(before);
	});
});
