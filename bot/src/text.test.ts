import type { Strophe } from "@/assets/types";
import { describe, expect, it } from "vitest";
import { coreTitle, indexItem, isLikelyDuplicate, search } from "./text";

const song = (title: string, first: string) => ({
	title,
	strophes: [
		{
			type: "verse",
			repetition: false,
			content: [{ text: first, chords: "" }],
		},
	] as Strophe[],
});

describe("search", () => {
	const entries = [
		song(
			"Lumière dans nos vies, Emmanuel",
			"Lumière dans nos vies, Emmanuel est venu",
		),
		song("Joyeuse lumière (1)", "Joyeuse lumière, splendeur éternelle"),
		song("Je te cherche, Seigneur", "Je te cherche au plus près de mon cœur"),
	].map(indexItem);

	it("ignores accents, case and punctuation", () => {
		expect(search(entries, "lumiere dans nos vies")[0]?.item.title).toBe(
			"Lumière dans nos vies, Emmanuel",
		);
		expect(search(entries, "JE TE CHERCHE SEIGNEUR")[0]?.item.title).toBe(
			"Je te cherche, Seigneur",
		);
	});

	it("finds a song by its first line", () => {
		expect(search(entries, "splendeur éternelle")[0]?.item.title).toBe(
			"Joyeuse lumière (1)",
		);
	});

	it("returns nothing for unrelated queries", () => {
		expect(search(entries, "nuit de noël")).toEqual([]);
	});
});

describe("isLikelyDuplicate", () => {
	it("matches titles once trailing qualifiers are dropped", () => {
		expect(coreTitle("Lumière dans nos vies, Emmanuel")).toBe(
			"lumiere dans nos vies",
		);
		expect(
			isLikelyDuplicate(
				indexItem(song("Lumière dans nos vies", "x")),
				indexItem(song("Lumière dans nos vies, Emmanuel", "y")),
			),
		).toBe(true);
	});

	it("matches identical first lines under different titles", () => {
		expect(
			isLikelyDuplicate(
				indexItem(
					song("Je te cherche", "Je te cherche au plus près de mon cœur"),
				),
				indexItem(
					song(
						"Seigneur je te cherche",
						"Je te cherche au plus près de mon cœur",
					),
				),
			),
		).toBe(true);
	});

	it("keeps numbered variants apart from different songs", () => {
		expect(
			isLikelyDuplicate(
				indexItem(song("Sa parole est lumière", "a")),
				indexItem(song("Joyeuse lumière", "b")),
			),
		).toBe(false);
	});
});
