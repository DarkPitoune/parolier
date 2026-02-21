import { useAllSongs } from "@/hooks/queries/useSongQueries";
import type { AllSongs } from "@/utils/supabase";
import clsx from "clsx";
import Fuse from "fuse.js";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { SongItem, getSongItemId } from "./SongItem";

type SongPickerInlineProps = {
	onSongSelect: (songId: number) => void;
};

const SongPickerInline = ({ onSongSelect }: SongPickerInlineProps) => {
	const { data: songsData } = useAllSongs();
	const songs = useMemo(() => songsData ?? [], [songsData]);
	const [filteredSongs, setFilteredSongs] = useState<AllSongs>([]);
	const [selectedSongId, setSelectedSongId] = useState<number | null>(null);

	// Sync filteredSongs when songs load
	useEffect(() => {
		if (songs.length > 0) setFilteredSongs(songs);
	}, [songs]);

	// Auto-scroll to selected song when it changes
	useEffect(() => {
		if (selectedSongId !== null) {
			const element = document.getElementById(getSongItemId(selectedSongId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedSongId]);

	// Handle song selection (immediate selection, no confirmation needed)
	const handleSongClick = useCallback(
		(songId: number) => {
			setSelectedSongId(songId);
			onSongSelect(songId);
		},
		[onSongSelect],
	);

	// Search functionality
	const fuse = useMemo(() => new Fuse(songs, { keys: ["title"] }), [songs]);
	const [searchValue, setSearchValue] = useState("");

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) {
				setFilteredSongs(songs);
			} else {
				if (!Number.isNaN(Number(event.target.value))) {
					const song = songs.find((s) => s.id === Number(event.target.value));
					setFilteredSongs(song ? [song] : []);
					setSelectedSongId(song ? song.id : null);
				} else {
					const searchResults = fuse
						.search(event.target.value)
						.map((hit) => hit.item);
					setFilteredSongs(searchResults);
					setSelectedSongId(
						searchResults.length > 0 ? searchResults[0].id : null,
					);
				}
			}
		},
		[fuse, songs],
	);

	return (
		<div className="h-full flex flex-col bg-white dark:bg-gray-800">
			{/* Header */}
			<div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-lg font-semibold px-4 text-black py-3 dark:text-white">
					Chants
				</h2>
				<div className="px-4 pb-3">
					<input
						placeholder="Rechercher un chant..."
						className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 text-black dark:text-white outline-none rounded border border-gray-200 dark:border-gray-600 focus:border-jubilateBlue-500 dark:focus:border-jubilateBlue-400"
						type="text"
						value={searchValue}
						onChange={search}
					/>
				</div>
			</div>

			{/* Song List */}
			<div className="flex-1 overflow-y-auto">
				{filteredSongs.length > 0 ? (
					filteredSongs.map((song) => (
						<button
							key={song.id}
							className={clsx(
								"w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
								selectedSongId === song.id &&
									"bg-jubilateBlue-50 dark:bg-jubilateBlue-900",
							)}
							type="button"
							onClick={() => handleSongClick(song.id)}
						>
							<SongItem song={song} />
						</button>
					))
				) : (
					<div className="p-4 text-center text-gray-500 dark:text-gray-400">
						<p>Aucun chant trouvé</p>
					</div>
				)}
			</div>

			{/* Footer with count */}
			<div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{filteredSongs.length} chant{filteredSongs.length !== 1 ? "s" : ""}
					{searchValue && ` trouvé${filteredSongs.length !== 1 ? "s" : ""}`}
				</p>
			</div>
		</div>
	);
};

export { SongPickerInline };
