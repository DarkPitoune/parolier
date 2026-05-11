import { describe, expect, it } from "vitest";
import { sanitizeNbspString, sanitizeStrophes } from "./sanitizeNbsp";

const NBSP = " ";

describe("sanitizeNbspString", () => {
	it("returns unchanged when no NBSP is present", () => {
		expect(sanitizeNbspString("hello world")).toBe("hello world");
		expect(sanitizeNbspString("")).toBe("");
	});

	it("replaces in-word NBSPs with regular spaces", () => {
		expect(sanitizeNbspString(`Je${NBSP}n'ai${NBSP}d'autre`)).toBe(
			"Je n'ai d'autre",
		);
	});

	it("keeps NBSP before French double-stop punctuation", () => {
		expect(sanitizeNbspString(`Merci${NBSP}!`)).toBe(`Merci${NBSP}!`);
		expect(sanitizeNbspString(`Quoi${NBSP}?`)).toBe(`Quoi${NBSP}?`);
		expect(sanitizeNbspString(`Texte${NBSP};`)).toBe(`Texte${NBSP};`);
		expect(sanitizeNbspString(`Voici${NBSP}:`)).toBe(`Voici${NBSP}:`);
	});

	it("keeps NBSP inside French guillemets", () => {
		expect(sanitizeNbspString(`«${NBSP}Tu es mon Dieu.${NBSP}»`)).toBe(
			`«${NBSP}Tu es mon Dieu.${NBSP}»`,
		);
	});

	it("handles mixed cases — good and bad NBSPs in the same string", () => {
		expect(
			sanitizeNbspString(`Demeurez${NBSP}en${NBSP}moi,${NBSP}vous${NBSP}!`),
		).toBe(`Demeurez en moi, vous${NBSP}!`);
	});

	it("does not introduce NBSPs where there were none", () => {
		expect(sanitizeNbspString("Hello !")).toBe("Hello !");
	});

	it("replaces NBSP-followed-by-space (so the NBSP is not adjacent to punct)", () => {
		expect(sanitizeNbspString(`Amen${NBSP} !`)).toBe("Amen  !");
	});
});

describe("sanitizeStrophes", () => {
	it("cleans verse line text and chord fields", () => {
		const out = sanitizeStrophes([
			{
				type: "verse",
				repetition: false,
				content: [
					{ text: `Je${NBSP}n'ai`, chords: `Dm${NBSP}Am` },
					{ text: `merci${NBSP}!`, chords: "" },
				],
			},
		]);
		expect(out[0].type).toBe("verse");
		if (out[0].type !== "section") {
			expect(out[0].content[0].text).toBe("Je n'ai");
			expect(out[0].content[0].chords).toBe("Dm Am");
			expect(out[0].content[1].text).toBe(`merci${NBSP}!`);
		}
	});

	it("cleans section titles", () => {
		const out = sanitizeStrophes([
			{ type: "section", content: `Refrain${NBSP}principal` },
		]);
		expect(out[0].content).toBe("Refrain principal");
	});

	it("returns the same line reference when nothing changed (identity preserved)", () => {
		const line = { text: "hello", chords: "C" };
		const strophe = { type: "verse" as const, repetition: false, content: [line] };
		const out = sanitizeStrophes([strophe]);
		if (out[0].type !== "section") {
			expect(out[0].content[0]).toBe(line);
		}
	});
});
