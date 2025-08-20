import { BackButton, SongViewer, useLeader } from "@/components";
import {
	type TaggedSong,
	analyticsSong,
	taggedSongQuery,
} from "@/utils/supabase";
import { ComputerDesktopIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

type RightClickMenuPosition = {
	x: number;
	y: number;
};

function SongPage() {
	const { songId } = useParams();
	const [song, setSong] = useState<TaggedSong>();
	const { setLeaderSong } = useLeader();
	const rightClickMenuRef = useRef<HTMLDivElement>(null);
	const [rightClickMenuPosition, setRightClickMenuPosition] =
		useState<RightClickMenuPosition | null>(null);

	const handleOnContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
		e.preventDefault();
		e.stopPropagation();

		setRightClickMenuPosition({
			x: e.clientX,
			y: e.clientY + window.pageYOffset,
		});
	};

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				rightClickMenuRef.current &&
				!rightClickMenuRef.current.contains(e.target as Node)
			)
				setRightClickMenuPosition(null);
		};

		document.addEventListener("click", handleClick);
		return () => {
			document.removeEventListener("click", handleClick);
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: adding setLeader spams BE
	useEffect(() => {
		if (songId) {
			taggedSongQuery(Number(songId)).then(({ data }) => {
				if (data) setSong(data);
			});
			setLeaderSong(Number(songId));
		}
		let timeout: NodeJS.Timeout;
		if (songId && import.meta.env.MODE === "production")
			timeout = setTimeout(() => {
				analyticsSong(Number(songId));
			}, 30_000);
		return () => clearTimeout(timeout);
	}, [songId]);

	if (!song) return null;

	return (
		<div>
			<div className="flex justify-between items-center py-2 md:py-4 px-2 md:px-6 border-b-4 border-jubilateBlue-500 dark:border-jubilateBlue-400 sticky bg-white dark:bg-gray-900 top-0">
				<BackButton />

				<div className="flex gap-4 items-center font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					<h1>{song.id}.</h1>
					<h1>{song.title}</h1>
				</div>

				<div className="flex items-center gap-4">
					<Link
						className="rounded-full hidden md:block bg-jubilateBlue-500 dark:bg-jubilateBlue-400 text-white p-3"
						onClick={() => document.body.requestFullscreen()}
						to={`/slides/${song?.id}`}
					>
						<ComputerDesktopIcon className="size-6 fill-white" />
					</Link>
				</div>
			</div>
			<div onContextMenu={handleOnContextMenu}>
				<SongViewer song={song} />
				{rightClickMenuPosition && (
					<div
						ref={rightClickMenuRef}
						style={{
							left: rightClickMenuPosition.x,
							top: rightClickMenuPosition.y,
						}}
						className="absolute rounded-md bg-gray-100 dark:bg-slate-800 p-1 flex flex-col gap-1"
					>
						<p className="text-sm italic px-1">Actions administrateur</p>
						<Link
							to={`/songs/${song.id}/edit`}
							className="px-2 py-1 text-black dark:text-white dark:hover:bg-slate-700 bg-white hover:bg-slate-200 dark:bg-slate-800 rounded-md transition"
						>
							Modifier le morceau
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}

export { SongPage };
