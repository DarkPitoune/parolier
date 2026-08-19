import type { StropheNote } from "@/assets/types";
import { GlyphChip } from "./GlyphChip";

type PerformanceNoteRowProps = {
	note: StropheNote;
	/** e.g. "refrain 2 · affiché car annoté". Absent when the strophe was visible anyway. */
	marker?: string;
};

/**
 * Sits above its strophe, never in the chord gutter — that column is taken.
 * Costs nothing on the strophes that carry no note, which is most of them.
 */
function PerformanceNoteRow({ note, marker }: PerformanceNoteRowProps) {
	const text = note.text?.trim();
	const who = note.who ?? [];
	const how = note.how ?? [];

	return (
		<div className="flex flex-col gap-1 pb-1" data-testid="performance-note">
			{marker && (
				<span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
					{marker}
				</span>
			)}
			<div className="flex flex-wrap items-center gap-1.5">
				{who.map((glyph) => (
					<GlyphChip key={`who-${glyph}`} glyph={glyph} group="who" />
				))}
				{/* Without the pills, this hairline is what keeps the row reading
				    as [qui] · [comment] rather than one undifferentiated string. */}
				{who.length > 0 && how.length > 0 && (
					<span
						aria-hidden="true"
						className="h-4 w-px bg-gray-300 dark:bg-gray-600"
					/>
				)}
				{how.map((glyph) => (
					<GlyphChip key={`how-${glyph}`} glyph={glyph} group="how" />
				))}
				{/* Fixed size on purpose: the note stays subordinate to the lyrics
				    and must not inherit the reader's font-size setting. */}
				{text && (
					<span className="text-xs italic text-gray-600 dark:text-gray-300">
						{text}
					</span>
				)}
			</div>
		</div>
	);
}

export { PerformanceNoteRow };
