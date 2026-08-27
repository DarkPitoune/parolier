import type { StropheNote } from "@/assets/types";
import { BackButton, DynamicText, SongViewer } from "@/components";
import {
	showPerformanceNotesAtom,
	tonalityAtom,
} from "@/components/Contexts/SettingsContext";
import { PerformanceNoteSheet } from "@/components/PerformanceNotes/PerformanceNoteSheet";
import SwipeableTabs, { type Tab } from "@/components/SwipeableTabs";
import { useSetlist } from "@/hooks/queries/useSetlistQueries";
import {
	useSetStropheNote,
	useTaggedSongs,
} from "@/hooks/queries/useSongQueries";
import { sortSetlistItems } from "@/utils/setlistOrder";
import { getStropheNote, stropheFingerprint } from "@/utils/stropheNotes";
import {
	ComputerDesktopIcon,
	PresentationChartLineIcon,
} from "@heroicons/react/24/solid";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const SAVED_BADGE_MS = 1200;

function SetlistPage() {
	const { setlistId } = useParams();
	const navigate = useNavigate();

	const { data: setlistData } = useSetlist(setlistId);
	const setlist = useMemo(
		() => (setlistData ? sortSetlistItems(setlistData) : null),
		[setlistData],
	);

	// The setlist join carries song identity only. Bodies come from
	// queryKeys.songs.detail, the one place every write path patches — reading
	// them out of the setlist row instead left saved notes rendering stale, and
	// let a second edit of the same strophe write a pre-edit draft back.
	const songIds = useMemo(
		() =>
			(setlist ?? []).flatMap((item) => (item.songs ? [item.songs.id] : [])),
		[setlist],
	);
	const songsById = useTaggedSongs(songIds);

	const [activeTab, setActiveTab] = useState(0);
	const setTonality = useSetAtom(tonalityAtom);
	const showNotes = useAtomValue(showPerformanceNotesAtom);
	const setStropheNoteMutation = useSetStropheNote();

	// All tabs stay mounted at once (SwipeableTabs translates rather than
	// unmounts), so the strophe index alone can't identify the target — every
	// song in the setlist restarts indices from 0.
	const [editingSong, setEditingSong] = useState<{
		songId: number;
		index: number;
	} | null>(null);
	// Keyed by `${songId}:${stropheIndex}` for the same reason.
	const [noteStatus, setNoteStatus] = useState<
		Record<string, "saving" | "saved">
	>({});
	const noteStatusTimers = useRef<
		Record<string, ReturnType<typeof setTimeout>>
	>({});
	// Lets an older save's callback recognize it's been superseded by a
	// newer edit to the same strophe, so it doesn't flip the badge to
	// "saved" while that newer save is still in flight.
	const noteAttempt = useRef<Record<string, number>>({});

	useEffect(
		() => () => {
			for (const timer of Object.values(noteStatusTimers.current))
				clearTimeout(timer);
		},
		[],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset tonality when switching tabs
	useEffect(() => {
		setTonality(0);
	}, [activeTab, setTonality]);

	const handleChangeTab = (index: number) => {
		setActiveTab(index);
	};

	const tapCount = useRef(0);
	const tapTimer = useRef<ReturnType<typeof setTimeout>>();

	const handleTitleTap = () => {
		tapCount.current += 1;
		clearTimeout(tapTimer.current);
		if (tapCount.current >= 3) {
			tapCount.current = 0;
			navigate(`/setlists/${setlistId}/edit`);
			return;
		}
		tapTimer.current = setTimeout(() => {
			tapCount.current = 0;
		}, 500);
	};

	const editedSong = editingSong
		? songsById.get(editingSong.songId)
		: undefined;
	const editedStrophe = editedSong?.strophes?.[editingSong?.index ?? -1];

	const saveNote = (note: StropheNote | undefined) => {
		if (!editingSong) return;
		const { songId, index } = editingSong;
		const key = `${songId}:${index}`;

		clearTimeout(noteStatusTimers.current[key]);
		setNoteStatus((prev) => ({ ...prev, [key]: "saving" }));

		const attempt = (noteAttempt.current[key] ?? 0) + 1;
		noteAttempt.current[key] = attempt;

		setStropheNoteMutation.mutate(
			{
				songId,
				stropheIndex: index,
				note,
				expectedFingerprint: stropheFingerprint(editedStrophe),
			},
			{
				onSuccess: () => {
					if (noteAttempt.current[key] !== attempt) return;
					setNoteStatus((prev) => ({ ...prev, [key]: "saved" }));
					noteStatusTimers.current[key] = setTimeout(() => {
						setNoteStatus((prev) => {
							const { [key]: _removed, ...rest } = prev;
							return rest;
						});
					}, SAVED_BADGE_MS);
				},
				// onError already surfaces a toast (see useSetStropheNote) — the
				// badge should just get out of the way, not duplicate that.
				onError: () => {
					if (noteAttempt.current[key] !== attempt) return;
					setNoteStatus((prev) => {
						const { [key]: _removed, ...rest } = prev;
						return rest;
					});
				},
			},
		);
		// Never wait on the mutation: offline it stays paused indefinitely.
		setEditingSong(null);
	};

	// A presenter/slideshow step is an index into the *ordered setlist*, so that
	// index has to survive this filter: an item that renders as nothing would
	// otherwise shift every later tab off its own step.
	const renderable = useMemo(
		() =>
			(setlist ?? [])
				.map((item, stepIndex) => ({ item, stepIndex }))
				.filter(({ item }) => item.songs || item.texts || item.text),
		[setlist],
	);
	const activeStepIndex = renderable[activeTab]?.stepIndex ?? 0;

	const tabs: Tab[] = renderable.map(({ item }) => {
		if (item.songs) {
			const songId = item.songs.id;
			const song = songsById.get(songId);
			const songNoteStatus: Record<number, "saving" | "saved"> = {};
			const prefix = `${songId}:`;
			for (const [key, status] of Object.entries(noteStatus))
				if (key.startsWith(prefix))
					songNoteStatus[Number(key.slice(prefix.length))] = status;

			return {
				// Title comes from the setlist row so the tab bar is labelled
				// before the body lands. The tab itself is never dropped while
				// loading: renderable's indices are presenter/slideshow steps.
				id: item.id,
				title: item.songs.title,
				content: (
					<div className="flex flex-col gap-4">
						{song && (
							<SongViewer
								showTitle
								song={song}
								onStropheLongPress={
									showNotes
										? (index) => setEditingSong({ songId, index })
										: undefined
								}
								noteStatus={songNoteStatus}
							/>
						)}
					</div>
				),
			};
		}
		if (item.texts)
			return {
				id: item.id,
				title: item.texts.title,
				content: (
					<div className="flex flex-col gap-4 p-6">
						<h2 className="text-2xl font-bold text-black dark:text-white">
							{item.texts.title}
						</h2>
						<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
							{item.texts.content}
						</div>
					</div>
				),
			};
		return {
			id: item.id,
			title: item.text?.split(" ")[0] ?? "Texte",
			content: (
				<div className="flex flex-col gap-4 p-4">
					<DynamicText
						className="whitespace-pre-wrap text-black dark:text-white"
						text={item.text ?? ""}
					/>
				</div>
			),
		};
	});

	return (
		<div className="flex flex-col h-screen">
			<div className="flex justify-between items-center py-4 px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 bg-white dark:bg-gray-900 shrink-0">
				<BackButton />
				{/* Same hidden triple-tap as SongPage, but here it only shortcuts a route that
				    Setlists.tsx already links to visibly, so no path is keyboard-unreachable. */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: deliberately obscure triple-tap shortcut */}
				<h3
					className="text-xl lg:text-3xl font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400 select-none"
					onClick={handleTitleTap}
				>
					{setlist ? setlist[0]?.setlists?.name : "Chargement..."}
				</h3>
				<div className="flex items-center gap-2">
					<Link
						className="rounded-full hidden md:block bg-green-500 hover:bg-green-600 text-white p-3"
						data-testid="open-presenter-btn"
						to={`/presenter/${setlistId}/${activeStepIndex}`}
					>
						<PresentationChartLineIcon className="size-6 fill-white" />
					</Link>
					<Link
						className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
						onClick={() => document.body.requestFullscreen()}
						to={`/setlists/${setlistId}/steps/${activeStepIndex}/slide`}
					>
						<ComputerDesktopIcon className="size-6 fill-white" />
					</Link>
				</div>
			</div>
			{setlist && (
				<SwipeableTabs
					activeTab={activeTab}
					setActiveTab={handleChangeTab}
					tabs={tabs}
				/>
			)}
			<PerformanceNoteSheet
				key={
					editingSong ? `${editingSong.songId}:${editingSong.index}` : "none"
				}
				open={editingSong !== null}
				onClose={() => setEditingSong(null)}
				note={editedStrophe && getStropheNote(editedStrophe)}
				stropheLabel={
					editedStrophe && editedStrophe.type !== "section"
						? editedStrophe.content?.[0]?.text
						: undefined
				}
				onSave={saveNote}
				isQueued={setStropheNoteMutation.isPaused}
			/>
		</div>
	);
}

export { SetlistPage };
