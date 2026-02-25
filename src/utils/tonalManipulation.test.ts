import { describe, expect, it } from "vitest";
import { normalizeFrenchChord, transposeLine } from "./tonalManipulation";

describe("normalizeFrenchChord", () => {
	it("converts basic French notes", () => {
		expect(normalizeFrenchChord("Do")).toBe("C");
		expect(normalizeFrenchChord("Ré")).toBe("D");
		expect(normalizeFrenchChord("Mi")).toBe("E");
		expect(normalizeFrenchChord("Fa")).toBe("F");
		expect(normalizeFrenchChord("Sol")).toBe("G");
		expect(normalizeFrenchChord("La")).toBe("A");
		expect(normalizeFrenchChord("Si")).toBe("B");
	});

	it("converts minor chords", () => {
		expect(normalizeFrenchChord("Mim")).toBe("Em");
		expect(normalizeFrenchChord("Lam")).toBe("Am");
		expect(normalizeFrenchChord("Solm")).toBe("Gm");
		expect(normalizeFrenchChord("Rém")).toBe("Dm");
	});

	it("preserves suffixes like 7, maj7, sus4", () => {
		expect(normalizeFrenchChord("Sol7")).toBe("G7");
		expect(normalizeFrenchChord("Fa#m")).toBe("F#m");
		expect(normalizeFrenchChord("Sib")).toBe("Bb");
		expect(normalizeFrenchChord("Lamaj7")).toBe("Amaj7");
		expect(normalizeFrenchChord("Résus4")).toBe("Dsus4");
	});

	it("is idempotent on English chords", () => {
		expect(normalizeFrenchChord("C")).toBe("C");
		expect(normalizeFrenchChord("Em")).toBe("Em");
		expect(normalizeFrenchChord("F#m7")).toBe("F#m7");
		expect(normalizeFrenchChord("Bb")).toBe("Bb");
	});
});

describe("transposeLine", () => {
	it("transposes English chords", () => {
		const result = transposeLine("C G Am", 2);
		expect(result).toBe("D A Bm");
	});

	it("transposes chords with suffixes", () => {
		const result = transposeLine("Em7 Cmaj7", 1);
		expect(result).toBe("Fm7 Dbmaj7");
	});
});
