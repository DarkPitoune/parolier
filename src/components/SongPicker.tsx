import {
	type AllSongs,
	type TaggedSong,
	allSongsQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { getSongItemId, SongItem } from "./SongItem";
import clsx from "clsx";
import { SongViewer } from "./SongViewer";
import Fuse from "fuse.js";

type SongPickerProps = {
	handleClose: (songId?: number) => void;
};

const SongPicker = ({ handleClose }: SongPickerProps) => {
	const [songs, setSongs] = useState<AllSongs>([]);
	const [filteredSongs, setFilteredSongs] = useState<AllSongs>([]);
	const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
	const [selectedSong, setSelectedSong] = useState<TaggedSong | null>(null);

	useEffect(() => {
		allSongsQuery().then(({ data }) => {
			if (data) {
				setSongs(data);
				setFilteredSongs(data);
			}
		});
	}, []);

	useEffect(() => {
		if (selectedSongId !== null) {
			taggedSongQuery(selectedSongId).then(({ data }) => {
				if (data) setSelectedSong(data);
			});
		}
	}, [selectedSongId]);

	const scrollToSelectedSong = useCallback(() => {
		if (selectedSongId !== null) {
			const element = document.getElementById(getSongItemId(selectedSongId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedSongId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to trigger the function when selectedSongId changes
	useEffect(scrollToSelectedSong, [scrollToSelectedSong]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") handleClose();
			if (event.key === "Enter" && selectedSongId !== null)
				handleClose(selectedSongId);
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedSongId((prev) => {
					if (prev === null) return 0;
					const index = filteredSongs.findIndex((s) => s.id === prev);
					if (index > 0) return filteredSongs[index - 1].id;
					return prev;
				});
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setSelectedSongId((prev) => {
					if (prev === null) return filteredSongs[0].id;
					const index = filteredSongs.findIndex((s) => s.id === prev);
					if (index < filteredSongs.length - 1)
						return filteredSongs[index + 1].id;
					return prev;
				});
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [filteredSongs, selectedSongId, handleClose]);

	const fuse = useMemo(() => new Fuse(songs, { keys: ["title"] }), [songs]);
	const [searchValue, setSearchValue] = useState("");

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) setFilteredSongs(songs);
			else {
				window.scrollTo(0, 0);
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
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className="bg-black/50 fixed inset-0 flex justify-center items-center"
			onClick={() => handleClose()}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: fine here since we're just doing a bubble stopper */}
			<div
				className="bg-white dark:bg-gray-800 rounded-lg w-4/5 h-4/5 overflow-y-auto grid grid-cols-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex flex-col col-span-1 min-h-0">
					<h2 className="text-xl font-bold px-4 py-2 shadow dark:text-white text-black">
						Sélectionner un chant
					</h2>
					<div>
						<input
							placeholder="Tapez un chant ici"
							className="px-2 py-1 w-full bg-transparent text-black dark:text-white outline-none"
							type="text"
							value={searchValue}
							onChange={search}
							autoFocus
						/>
					</div>
					<div className="grow min-h-0 overflow-y-auto scrollbar">
						{filteredSongs.map((song) => (
							<button
								key={song.id}
								className={clsx(
									"w-full text-left",
									selectedSongId === song.id && "bg-gray-100 dark:bg-gray-900",
								)}
								type="button"
								onClick={() => setSelectedSongId(song.id)}
							>
								<SongItem song={song} />
							</button>
						))}
					</div>
					{selectedSongId !== null && (
						<div className="p-2 flex shadow">
							<button
								className="bg-jubilateBlue-500 text-white hover:bg-jubilateBlue-300 py-1 px-4 rounded grow transition-colors"
								type="submit"
								onClick={() => handleClose(selectedSongId)}
							>
								Sélectionner
							</button>
						</div>
					)}
				</div>
				<div className="col-span-2 min-h-0 overflow-y-auto">
					{selectedSong && <SongViewer song={selectedSong} />}
				</div>
			</div>
		</div>
	);
};

export { SongPicker };
