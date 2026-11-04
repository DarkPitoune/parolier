import { describe, expect, it } from "vitest";
import type { Db } from "../supabase";
import { SongIndex } from "./context";

function fakeDb(
	results: Array<{ data: unknown[] | null; error: { message: string } | null }>,
) {
	let reads = 0;
	const db = {
		from: () => ({
			select: async () => {
				reads += 1;
				await new Promise((r) => setTimeout(r, 5));
				return results.shift() ?? { data: [], error: null };
			},
		}),
	} as unknown as Db;
	return { db, reads: () => reads };
}

const row = (id: number) => ({
	id,
	title: `Chant ${id}`,
	language: "fr",
	type: "song",
	strophes: [],
	song_tag: [],
});

describe("SongIndex", () => {
	it("shares one read between calls made at the same time", async () => {
		const { db, reads } = fakeDb([{ data: [row(1)], error: null }]);
		const index = new SongIndex();
		const [a, b] = await Promise.all([index.get(db), index.get(db)]);
		expect(reads()).toBe(1);
		expect(a).toBe(b);
	});

	it("reads again after a write or once the minute is over", async () => {
		let now = 0;
		const { db, reads } = fakeDb([
			{ data: [row(1)], error: null },
			{ data: [row(1), row(2)], error: null },
			{ data: [row(1), row(2), row(3)], error: null },
		]);
		const index = new SongIndex(60_000, () => now);
		expect(await index.get(db)).toHaveLength(1);
		index.invalidate();
		expect(await index.get(db)).toHaveLength(2);
		now = 61_000;
		expect(await index.get(db)).toHaveLength(3);
		expect(reads()).toBe(3);
	});

	it("does not keep a failed read", async () => {
		const { db, reads } = fakeDb([
			{ data: null, error: { message: "timeout" } },
			{ data: [row(1)], error: null },
		]);
		const index = new SongIndex();
		await expect(index.get(db)).rejects.toThrow(/timeout/);
		expect(await index.get(db)).toHaveLength(1);
		expect(reads()).toBe(2);
	});
});
