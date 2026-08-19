import {
	GLYPH_PALETTE,
	HOW_GLYPHS,
	WHO_GLYPHS,
	resolveGlyph,
} from "./glyphPalette";

describe("glyphPalette", () => {
	it("resolves a palette glyph to its French label", () => {
		expect(resolveGlyph("🥁", "who")).toEqual({
			glyph: "🥁",
			label: "batterie",
			group: "who",
			known: true,
		});
	});

	it("keeps an unknown emoji renderable, in the group it was read from", () => {
		// The free escape hatch: emoji has no bass, organ or cantor, so a note
		// may legitimately hold a glyph this table has never seen.
		expect(resolveGlyph("🦕", "how")).toEqual({
			glyph: "🦕",
			label: "🦕",
			group: "how",
			known: false,
		});
	});

	it("has no duplicate glyph across the whole palette", () => {
		// A duplicate would silently resolve to the wrong label; only a test
		// catches copy-paste in a hand-written emoji table.
		const glyphs = GLYPH_PALETTE.map((d) => d.glyph);
		expect(new Set(glyphs).size).toBe(glyphs.length);
	});

	it("tags every entry with the group it is listed under", () => {
		expect(WHO_GLYPHS.every((d) => d.group === "who")).toBe(true);
		expect(HOW_GLYPHS.every((d) => d.group === "how")).toBe(true);
	});
});
