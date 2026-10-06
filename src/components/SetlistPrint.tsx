import type { Strophe } from "@/assets/types";
import {
	showChordsAtom,
	showPerformanceNotesAtom,
} from "@/components/Contexts/SettingsContext";
import { buildDisplayStrophes, getStropheNote } from "@/utils/stropheNotes";
import type { Setlist, TaggedSong } from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import { useAtomValue } from "jotai";
import { Fragment } from "react";
import { withNonBreakingSpaces } from "./DynamicText";

type LyricStrophe = Extract<Strophe, { repetition: boolean }>;

function PrintNote({ strophe }: { strophe: LyricStrophe }) {
	const note = getStropheNote(strophe);
	if (!note) return null;
	const glyphs = [...(note.who ?? []), ...(note.how ?? [])].join(" ");
	const text = note.text?.trim();
	return (
		<p className="col-span-full text-[0.7em] italic font-normal">
			{[glyphs, text].filter(Boolean).join(" · ")}
		</p>
	);
}

function PrintStrophe({
	strophe,
	showChords,
	showNotes,
}: {
	strophe: LyricStrophe;
	showChords: boolean;
	showNotes: boolean;
}) {
	const lines = strophe.content ?? [];

	if (strophe.repetition) {
		return (
			<div
				data-type={strophe.type}
				className="col-span-full break-inside-avoid data-[type=chorus]:font-bold data-[type=bridge]:italic"
			>
				{showNotes && <PrintNote strophe={strophe} />}
				<p>
					{strophe.type === "chorus" && "R/ "}
					{withNonBreakingSpaces(lines[0]?.text ?? "")}…
				</p>
			</div>
		);
	}

	return (
		<div
			data-type={strophe.type}
			className="col-span-full grid grid-cols-subgrid items-baseline break-inside-avoid whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold"
		>
			{showNotes && <PrintNote strophe={strophe} />}
			{lines.map((line, lineIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity of their own
				<Fragment key={lineIndex}>
					{showChords && (
						<p className="text-[0.85em] font-bold tracking-tight">
							{transposeLine(line.chords, 0)}
						</p>
					)}
					<p>{withNonBreakingSpaces(line.text)}</p>
				</Fragment>
			))}
		</div>
	);
}

function PrintSong({
	song,
	showChords,
	showNotes,
}: {
	song: TaggedSong;
	showChords: boolean;
	showNotes: boolean;
}) {
	// Every strophe is kept so a repeated chorus can print as its "R/" line.
	const strophes = buildDisplayStrophes(song.strophes, {
		addChorus: true,
		showNotes,
	});

	return (
		<>
			<h2 className="break-after-avoid font-flame text-[1.15em] border-b-[0.5pt] border-black">
				{song.id}. {song.title}
			</h2>
			{/* One grid for the whole song, shared by every strophe through
			    subgrid, so the lyrics keep the same left edge from verse to verse. */}
			<div
				className="grid gap-x-[3em] gap-y-[0.4em]"
				style={{
					gridTemplateColumns: showChords ? "max-content 1fr" : "1fr",
				}}
			>
				{strophes.map(({ strophe, sourceIndex }) =>
					strophe.type === "section" ? (
						<p
							key={sourceIndex}
							className="col-span-full break-after-avoid text-[0.8em] uppercase tracking-wide"
						>
							{strophe.content}
						</p>
					) : (
						<PrintStrophe
							key={sourceIndex}
							strophe={strophe}
							showChords={showChords}
							showNotes={showNotes}
						/>
					),
				)}
			</div>
		</>
	);
}

function PrintItem({
	item,
	song,
	showChords,
	showNotes,
}: {
	item: Setlist[number];
	song: TaggedSong | undefined;
	showChords: boolean;
	showNotes: boolean;
}) {
	if (song)
		return (
			<PrintSong song={song} showChords={showChords} showNotes={showNotes} />
		);
	if (item.texts)
		return (
			<>
				<h2 className="break-after-avoid font-flame text-[1.15em] border-b-[0.5pt] border-black">
					{item.texts.title}
				</h2>
				<p className="whitespace-pre-wrap">
					{withNonBreakingSpaces(item.texts.content ?? "")}
				</p>
			</>
		);
	return (
		<p className="whitespace-pre-wrap">
			{withNonBreakingSpaces(item.text ?? "")}
		</p>
	);
}

/**
 * Hidden on screen. Each item opens a new column so a song never starts
 * halfway down — the music stand reader finds it at a glance.
 */
function SetlistPrint({
	items,
	songsById,
}: {
	items: Setlist;
	songsById: Map<number, TaggedSong>;
}) {
	const showChords = useAtomValue(showChordsAtom);
	const showNotes = useAtomValue(showPerformanceNotesAtom);

	return (
		<div className="setlist-print hidden print:block bg-white text-black">
			{items
				.filter((item) => item.songs || item.texts || item.text)
				.map((item) => (
					<section key={item.id} className="setlist-print-item">
						<PrintItem
							item={item}
							song={item.songs ? songsById.get(item.songs.id) : undefined}
							showChords={showChords}
							showNotes={showNotes}
						/>
					</section>
				))}
		</div>
	);
}

export { SetlistPrint };
