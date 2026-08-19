import type { GlyphGroup } from "@/assets/types";

export interface GlyphDefinition {
	glyph: string;
	label: string;
	group: GlyphGroup;
}

/**
 * Curated palette, hardcoded on purpose for v1: nobody opens a phone emoji
 * keyboard mid-rehearsal, so a tap-grid beats "free" even though it is
 * technically less free.
 *
 * Known gap: emoji has no bass, no organ and no cantor — three of the parts
 * most likely to be in the band. That is precisely why `resolveGlyph` must
 * keep rendering emoji that are not in this table (see below): the free
 * escape hatch is a repair for the vocabulary, not a convenience.
 */
export const WHO_GLYPHS: readonly GlyphDefinition[] = [
	{ glyph: "🎤", label: "chant", group: "who" },
	{ glyph: "🎸", label: "guitare", group: "who" },
	{ glyph: "🎹", label: "clavier", group: "who" },
	{ glyph: "🥁", label: "batterie", group: "who" },
	{ glyph: "🎻", label: "cordes", group: "who" },
	{ glyph: "🎺", label: "cuivres", group: "who" },
	{ glyph: "🪈", label: "flûte", group: "who" },
	{ glyph: "👏", label: "mains", group: "who" },
];

export const HOW_GLYPHS: readonly GlyphDefinition[] = [
	{ glyph: "🔥", label: "tutti", group: "how" },
	{ glyph: "🕊️", label: "doux", group: "how" },
	{ glyph: "⚡", label: "tension", group: "how" },
	{ glyph: "📈", label: "monter", group: "how" },
	{ glyph: "🔇", label: "silence", group: "how" },
	{ glyph: "🐢", label: "ralentir", group: "how" },
	{ glyph: "⏸️", label: "break", group: "how" },
	{ glyph: "🔁", label: "reprise", group: "how" },
];

export const GLYPH_PALETTE: readonly GlyphDefinition[] = [
	...WHO_GLYPHS,
	...HOW_GLYPHS,
];

const GLYPH_INDEX: ReadonlyMap<string, GlyphDefinition> = new Map(
	GLYPH_PALETTE.map((definition) => [definition.glyph, definition]),
);

export interface ResolvedGlyph extends GlyphDefinition {
	known: boolean;
}

/**
 * Never throws. An emoji outside the palette keeps its own glyph as label and
 * is reported as unknown, so a note written with the free escape hatch still
 * renders — in the vocabulary its caller read it from, never a guessed one.
 */
export function resolveGlyph(glyph: string, group: GlyphGroup): ResolvedGlyph {
	const definition = GLYPH_INDEX.get(glyph);
	if (definition) return { ...definition, known: true };
	return { glyph, label: glyph, group, known: false };
}
