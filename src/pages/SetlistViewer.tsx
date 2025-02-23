import { SongItem, SongViewer } from "@/components";
import {
	type Setlist,
	type TaggedSong,
	setlistQuery,
	taggedSongFromSetlistStepQuery,
} from "@/utils/supabase";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const SetlistViewer = () => {
	const { setlistId } = useParams();

	const [setlist, setSetlist] = useState<Setlist | null>(null);
	const [selectedStep, setSelectedStep] = useState<number>(0);
	const [selectedSong, setSelectedSong] = useState<TaggedSong>();

	const updateSetlist = useCallback(() => {
		setlistId && setlistQuery(setlistId).then(({ data }) => setSetlist(data));
	}, [setlistId]);

	useEffect(() => {
		updateSetlist();
	}, [updateSetlist]);

	useEffect(() => {
		if (!setlistId || selectedStep === undefined) return;

		const fetchSong = async () => {
			const { data } = await taggedSongFromSetlistStepQuery(
				setlistId,
				selectedStep,
			);
			if (data?.songs) setSelectedSong(data.songs);
		};

		fetchSong();
	}, [setlistId, selectedStep]);

	const setlistName = setlist?.[0]?.setlists?.name;

	return (
		<div>
			{setlist ? (
				<div className="grid grid-cols-3">
					<ul className="col-span-1 border-r-2 border-gray-200 dark:border-gray-600 h-screen">
						<li className="h-12 px-4 flex justify-between">
							<input
								type="text"
								value={setlistName || ""}
								className="font-semibold text-lg text-black dark:text-white bg-transparent outline-none w-full leading-normal h-full"
							/>
						</li>
						{setlist.map((item) => (
							<li key={item.position}>
								<button
									type="button"
									className={clsx(
										"w-full text-left",
										selectedStep === item.position &&
											"bg-gray-100 dark:bg-gray-900",
									)}
									onClick={() => {
										setSelectedStep(item.position);
									}}
								>
									{item.songs && <SongItem song={item.songs} />}
								</button>
							</li>
						))}
					</ul>
					{selectedSong && (
						<div className="col-span-2 max-h-screen overflow-y-auto">
							<SongViewer song={selectedSong} showTopBar={false} />
						</div>
					)}
				</div>
			) : (
				<p>Loading...</p>
			)}
		</div>
	);
};

export { SetlistViewer };
