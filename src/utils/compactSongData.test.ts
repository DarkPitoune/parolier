import { describe, expect, it } from "vitest";
import { compactSongs } from "./compactSongData";
import type { AllTaggedSongs } from "./supabase";

const song = (id: number, tagNames: string[], type = "song") => ({
	id,
	title: `Song ${id}`,
	type,
	strophes: [],
	tags: tagNames.map((name, i) => ({ id: i, name, svg: null, color: null })),
});

describe("compactSongs", () => {
	it("excludes songs tagged with a CD", () => {
		const songs = [
			song(1, ["Louange"]),
			song(2, ["CD 1", "Louange"]),
			song(3, ["Louange", "CD 5"]),
		] as unknown as AllTaggedSongs;

		expect(compactSongs(songs).map((s) => s.id)).toEqual([1]);
	});

	it("excludes responses and ordinaire parts", () => {
		const songs = [
			song(1, []),
			song(2, [], "response"),
			song(3, [], "ordinaire"),
		] as unknown as AllTaggedSongs;

		expect(compactSongs(songs).map((s) => s.id)).toEqual([1]);
	});
});
