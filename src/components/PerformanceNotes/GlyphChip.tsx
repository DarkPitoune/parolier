import type { GlyphGroup } from "@/assets/types";
import { resolveGlyph } from "./glyphPalette";

/**
 * Just the emoji, set large enough to read at a glance with an instrument in
 * your hands. No chrome: the glyph is the whole message, and a pill around it
 * only competes with the lyrics underneath.
 *
 * The label survives as the accessible name — it is what a screen reader says,
 * and what PerformanceNoteRow groups by.
 */
function GlyphChip({ glyph, group }: { glyph: string; group: GlyphGroup }) {
	const { label } = resolveGlyph(glyph, group);

	return (
		<span
			className="text-xl leading-none select-none"
			role="img"
			aria-label={label}
		>
			{glyph}
		</span>
	);
}

export { GlyphChip };
