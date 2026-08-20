import { PageHeader, SongViewer, useLeader } from "@/components";
import { showPerformanceNotesAtom } from "@/components/Contexts/SettingsContext";
import { PerformanceNoteSheet } from "@/components/PerformanceNotes/PerformanceNoteSheet";
import type { StropheNote } from "@/assets/types";
import {
	useSetStropheNote,
	useTaggedSong,
} from "@/hooks/queries/useSongQueries";
import { useRecordVisit, useRestoreScroll } from "@/hooks/useNavigationHistory";
import { useWakeLock } from "@/hooks/useWakeLock";
import { analyticsSong } from "@/utils/supabase";
import { getStropheNote, stropheFingerprint } from "@/utils/stropheNotes";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { supabaseUrl } from "@/utils/supabase";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const SAVED_BADGE_MS = 1200;

function SongPage() {
	const { songId } = useParams();
	const songIdNum = songId ? Number(songId) : undefined;
	const { data: song } = useTaggedSong(songIdNum);
	const { setLeaderSong } = useLeader();
	const navigate = useNavigate();
	const showNotes = useAtomValue(showPerformanceNotesAtom);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const setStropheNoteMutation = useSetStropheNote();
	const tapCount = useRef(0);
	const tapTimer = useRef<ReturnType<typeof setTimeout>>();
	// Keyed by stropheIndex: "saving" while the write is in flight, "saved"
	// for a beat afterwards so the confirmation is visible, then gone.
	const [noteStatus, setNoteStatus] = useState<
		Record<number, "saving" | "saved">
	>({});
	const noteStatusTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>(
		{},
	);
	// Lets an older save's callback recognize it's been superseded by a
	// newer edit to the same strophe, so it doesn't flip the badge to
	// "saved" while that newer save is still in flight.
	const noteAttempt = useRef<Record<number, number>>({});

	useEffect(
		() => () => {
			for (const timer of Object.values(noteStatusTimers.current))
				clearTimeout(timer);
		},
		[],
	);

	const handleTitleTap = () => {
		tapCount.current += 1;
		clearTimeout(tapTimer.current);
		if (tapCount.current >= 3) {
			tapCount.current = 0;
			navigate(`/songs/${song?.id}/edit`);
			return;
		}
		tapTimer.current = setTimeout(() => {
			tapCount.current = 0;
		}, 500);
	};

	useRecordVisit(
		song
			? {
					path: `/songs/${songId}`,
					title: `${song.id}. ${song.title}`,
					type: "song",
				}
			: null,
	);
	useRestoreScroll();

	// Keep screen awake while viewing song
	useWakeLock();

	// biome-ignore lint/correctness/useExhaustiveDependencies: adding setLeader spams BE
	useEffect(() => {
		if (songId) {
			setLeaderSong(Number(songId));
		}
		let timeout: NodeJS.Timeout;
		if (songId && import.meta.env.MODE === "production")
			timeout = setTimeout(() => {
				analyticsSong(Number(songId));
			}, 30_000);
		return () => clearTimeout(timeout);
	}, [songId]);

	const editedStrophe =
		editingIndex === null ? undefined : song?.strophes?.[editingIndex];

	const saveNote = (note: StropheNote | undefined) => {
		if (!song || editingIndex === null) return;
		const index = editingIndex;

		clearTimeout(noteStatusTimers.current[index]);
		setNoteStatus((prev) => ({ ...prev, [index]: "saving" }));

		const attempt = (noteAttempt.current[index] ?? 0) + 1;
		noteAttempt.current[index] = attempt;

		setStropheNoteMutation.mutate(
			{
				songId: song.id,
				stropheIndex: index,
				note,
				expectedFingerprint: stropheFingerprint(editedStrophe),
			},
			{
				onSuccess: () => {
					if (noteAttempt.current[index] !== attempt) return;
					setNoteStatus((prev) => ({ ...prev, [index]: "saved" }));
					noteStatusTimers.current[index] = setTimeout(() => {
						setNoteStatus((prev) => {
							const { [index]: _removed, ...rest } = prev;
							return rest;
						});
					}, SAVED_BADGE_MS);
				},
				// onError already surfaces a toast (see useSetStropheNote) — the
				// badge should just get out of the way, not duplicate that.
				onError: () => {
					if (noteAttempt.current[index] !== attempt) return;
					setNoteStatus((prev) => {
						const { [index]: _removed, ...rest } = prev;
						return rest;
					});
				},
			},
		);
		// Never wait on the mutation: offline it stays paused indefinitely.
		setEditingIndex(null);
	};

	if (!song) return null;

	return (
		<div data-testid="song-page">
			<PageHeader
				variant="detail"
				title={
					<h1
						className="font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400 select-none"
						onClick={handleTitleTap}
					>
						{song.id}. {song.title}
					</h1>
				}
				right={
					<div className="flex items-center gap-4">
						{song.sheet_music_url && (
							<Link
								to={`${supabaseUrl}/storage/v1/object/public${song.sheet_music_url}`}
								className="ml-auto p-3 bg-jubilateBlue-500 dark:bg-jubilateBlue-400 hover:bg-jubilateBlue-600 dark:hover:bg-jubilateBlue-300 text-white rounded-full transition-colors duration-200 flex items-center gap-2"
								title="Voir la partition"
								target="_blank"
							>
								<DocumentTextIcon className="size-6" />
							</Link>
						)}
						<Link
							className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
							onClick={() => document.body.requestFullscreen()}
							to={`/slides/${song?.id}`}
						>
							<ComputerDesktopIcon className="size-6 fill-white" />
						</Link>
					</div>
				}
			/>
			<SongViewer
				song={song}
				onStropheLongPress={showNotes ? setEditingIndex : undefined}
				noteStatus={noteStatus}
			/>
			<PerformanceNoteSheet
				key={editingIndex}
				open={editingIndex !== null}
				onClose={() => setEditingIndex(null)}
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

export { SongPage };
