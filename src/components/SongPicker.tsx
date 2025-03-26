import {
	type AllSongs,
	type Song,
	allSongsQuery,
	taggedSongQuery,
} from "@/utils/supabase";
import { useEffect, useState } from "react";
import { SongItem } from "./SongItem";
import clsx from "clsx";
import { SongViewer } from "./SongViewer";

type SongPickerProps = {
	isOpen: boolean;
	handleClose: (songId: number) => void;
};

const SongPicker = ({ isOpen, handleClose }: SongPickerProps) => {
	const [songs, setSongs] = useState<AllSongs>([]);
	const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
	const [selectedSong, setSelectedSong] = useState<Song | null>(null);

	useEffect(() => {
		allSongsQuery().then(({ data }) => {
			if (data) setSongs(data);
		});
	}, []);

	useEffect(() => {
		if (selectedSongId) {
			taggedSongQuery(selectedSongId).then(({ data }) => {
				if (data) setSelectedSong(data);
			});
		}
	}, [selectedSongId]);

	if (!isOpen) return null;

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
		<div
			className="bg-black/50 fixed inset-0 flex justify-center items-center"
			onClick={handleClose}
		>
			<div
				className="bg-white dark:bg-gray-800 rounded-lg w-4/5 h-4/5 overflow-y-auto grid grid-cols-3"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex flex-col col-span-1 min-h-0">
					<h2 className="text-xl font-bold px-4 py-2 shadow dark:text-white">
						Sélectionner un chant
					</h2>
					<div className="grow min-h-0 overflow-y-auto scrollbar">
						{songs.map((song) => (
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
					{selectedSongId && (
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
					{selectedSong && (
						<SongViewer showTopBar={false} song={selectedSong} />
					)}
				</div>
			</div>
		</div>
	);
};

export { SongPicker };
