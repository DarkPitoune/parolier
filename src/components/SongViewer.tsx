import type { Strophe, StropheNote } from "@/assets/types";
import { useLongPress } from "@/hooks/useLongPress";
import { buildDisplayStrophes, getStropheNote } from "@/utils/stropheNotes";
import type { TaggedSong } from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useSetAtom } from "jotai";
import { Fragment, useEffect, useMemo } from "react";
import {
	addChorusAtom,
	showChordsAtom,
	showPerformanceNotesAtom,
} from "./Contexts/SettingsContext";
import { tonalityAtom } from "./Contexts/SettingsContext";
import { DynamicText } from "./DynamicText";
import { PerformanceNoteRow } from "./PerformanceNotes/PerformanceNoteRow";
import { TagChip } from "./TagChip";

type LyricStrophe = Extract<Strophe, { repetition: boolean }>;

const noop = () => {};

type StropheBlockProps = {
	strophe: LyricStrophe;
	showChords: boolean;
	tonality: number;
	note?: StropheNote;
	marker?: string;
	revealed: boolean;
	onLongPress?: () => void;
	/** Save state of this strophe's note — absent once idle/confirmed-and-faded. */
	saveStatus?: "saving" | "saved";
};

function StropheBlock({
	strophe,
	showChords,
	tonality,
	note,
	marker,
	revealed,
	onLongPress,
	saveStatus,
}: StropheBlockProps) {
	const editable = Boolean(onLongPress);
	const longPressHandlers = useLongPress({
		onLongPress: onLongPress ?? noop,
		enabled: editable,
	});

	return (
		<div
			className={clsx(
				"relative flex flex-col gap-1",
				revealed &&
					"border-l-2 border-dashed border-jubilateBlue-300 dark:border-slate-500 pl-2",
				// Only while editing: an unconditional select-none would take
				// copy-paste away from every song, for everyone.
				editable && "select-none [-webkit-touch-callout:none]",
			)}
			{...longPressHandlers}
		>
			{saveStatus && (
				// Deletion clears the note but still confirms the write, so this
				// can't live inside the `note &&` block below.
				<span
					aria-hidden="true"
					className="absolute right-0 top-0 text-gray-400 dark:text-gray-500"
				>
					{saveStatus === "saving" ? (
						<ArrowPathIcon className="size-3.5 animate-spin" />
					) : (
						<CheckIcon className="size-3.5 text-jubilateGreen animate-fadeOut" />
					)}
				</span>
			)}
			{note && <PerformanceNoteRow note={note} marker={marker} />}
			{/* The note stays OUTSIDE this grid: the chord cell is styled with
			    `first:`, so an extra first child would silently drop its top
			    rounding — and the note would inherit the chorus/bridge styling. */}
			<div
				data-type={strophe.type}
				className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
				style={{
					gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
				}}
			>
				{strophe.content?.map((line, lineIndex) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: in this case, it's not that bad
					<Fragment key={lineIndex}>
						{showChords && (
							<DynamicText
								className="bg-jubilateBlue-100 dark:bg-slate-600 border-jubilateBlue-100 dark:border-slate-600 border-4 px-2 text-black dark:text-white first:rounded-t-md nth-last-2:rounded-b-md"
								text={transposeLine(line.chords, tonality)}
							/>
						)}
						<DynamicText
							className=" text-black dark:text-white"
							text={line.text}
						/>
					</Fragment>
				))}
			</div>
		</div>
	);
}

function SongViewer({
	song,
	showTitle = false,
	onStropheLongPress,
	noteStatus,
}: {
	song: TaggedSong;
	showTitle?: boolean;
	/** Receives the index into the ORIGINAL strophes array, never the visible position. */
	onStropheLongPress?: (sourceIndex: number) => void;
	/** Keyed by sourceIndex, the save state of a note currently being written. */
	noteStatus?: Record<number, "saving" | "saved">;
}) {
	const addChorusSetting = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);
	const showNotes = useAtomValue(showPerformanceNotesAtom);
	const tonality = useAtomValue(tonalityAtom);
	const setTonality = useSetAtom(tonalityAtom);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset tonality when song changes
	useEffect(() => {
		setTonality(0);
	}, [song.id, setTonality]);

	const displayStrophes = useMemo(
		() =>
			buildDisplayStrophes(song?.strophes, {
				addChorus: addChorusSetting,
				showNotes,
			}),
		[song?.strophes, addChorusSetting, showNotes],
	);

	return (
		<div className="bg-white dark:bg-gray-800">
			<div className="flex flex-col gap-2 lg:gap-4 p-4">
				{showTitle && (
					<div className="flex gap-4 items-center font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						<h1>{song.id}.</h1>
						<h1 className="text-center">{song.title}</h1>
					</div>
				)}
				<div className="flex gap-2 lg:gap-4 px-4 font-flame">
					{song.tags?.map((tag) => (
						<TagChip tag={tag} key={tag.id} />
					))}
				</div>
				<div className="flex flex-col gap-4 pb-10">
					{displayStrophes.map(
						({ strophe, sourceIndex, ordinalLabel, shownBecauseNoted }) =>
							strophe.type !== "section" ? (
								<StropheBlock
									key={sourceIndex}
									strophe={strophe}
									showChords={showChords}
									tonality={tonality}
									note={showNotes ? getStropheNote(strophe) : undefined}
									marker={
										shownBecauseNoted
											? `${ordinalLabel} · affiché car annoté`
											: undefined
									}
									revealed={shownBecauseNoted}
									onLongPress={
										onStropheLongPress
											? () => onStropheLongPress(sourceIndex)
											: undefined
									}
									saveStatus={noteStatus?.[sourceIndex]}
								/>
							) : (
								<div className="sticky top-0" key={sourceIndex}>
									{strophe.content}
								</div>
							),
					)}
				</div>
			</div>
		</div>
	);
}

export { SongViewer };
