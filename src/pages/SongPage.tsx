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
		setStropheNoteMutation.mutate({
			songId: song.id,
			stropheIndex: editingIndex,
			note,
			expectedFingerprint: stropheFingerprint(editedStrophe),
		});
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
