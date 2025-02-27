import { SongItem, SongViewer, TextInput } from "@/components";
import {
	type Setlist,
	setlistItemDeleteMutation,
	setlistItemPositionMutation,
	setlistNameMutation,
	setlistQuery,
} from "@/utils/supabase";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const SetlistViewer = () => {
	const { setlistId } = useParams();

	const [setlist, setSetlist] = useState<Setlist | null>(null);
	const [selectedItem, setSelectedItem] = useState<number>();
	const [setlistName, setSetlistName] = useState<string>("");

	useEffect(() => {
		if (!setlistId) return;
		setlistQuery(setlistId).then(({ data }) => {
			if (data) data.sort((a, b) => a.position - b.position);
			setSetlist(data);
			if (data?.[0]?.setlists?.name) setSetlistName(data[0].setlists.name);
		});
	}, [setlistId]);

	const handleSaveSetlistName = () => {
		if (!setlistId) return;
		setlistNameMutation(setlistId, setlistName).then(({ error }) => {
			if (error) {
				console.error("Error updating setlist name", error);
			}
		});
	};

	const handleSwapItemsPosition = (id1: number, id2: number) => {
		if (!setlist || !setlistId) return;
		const newSetlist = [...setlist];
		const index1 = newSetlist.findIndex((item) => item.id === id1);
		const index2 = newSetlist.findIndex((item) => item.id === id2);
		const temp = newSetlist[index1];
		newSetlist[index1] = newSetlist[index2];
		newSetlist[index2] = temp;
		setlistItemPositionMutation(setlistId, id1, index2);
		setlistItemPositionMutation(setlistId, id2, index1);
		setSetlist(newSetlist);
	};

	const handleDelete = (id: number) => {
		if (!setlist || !setlistId) return;
		const newSetlist = setlist.filter((item) => item.id !== id);
		setlistItemDeleteMutation(setlistId, id);
		setSetlist(newSetlist);
	};

	const selectedSong = setlist?.find((item) => item.id === selectedItem)?.songs;

	return (
		<div>
			{setlist ? (
				<div className="grid grid-cols-3">
					<ul className="col-span-1 border-r-2 border-gray-200 dark:border-gray-600 h-screen">
						<li className="h-12 px-4 flex justify-between items-center">
							<TextInput
								value={setlistName}
								onChange={setSetlistName}
								onBlur={handleSaveSetlistName}
							/>
						</li>
						{setlist.map((item, index) => (
							<li key={item.id} className="flex">
								<button
									type="button"
									className={clsx(
										"w-full text-left",
										selectedItem === item.id && "bg-gray-100 dark:bg-gray-900",
									)}
									onClick={() => {
										setSelectedItem(item.id);
									}}
								>
									{item.songs && <SongItem song={item.songs} />}
								</button>
								<div className="w-14">
									<button type="button">🔄</button>
									<button type="button" onClick={() => handleDelete(item.id)}>
										❌
									</button>
									{index < setlist.length - 1 && (
										<button
											type="button"
											onClick={() =>
												handleSwapItemsPosition(item.id, setlist[index + 1].id)
											}
										>
											🔽
										</button>
									)}
									{index > 0 && (
										<button
											type="button"
											onClick={() =>
												handleSwapItemsPosition(item.id, setlist[index - 1].id)
											}
										>
											🔼
										</button>
									)}
								</div>
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
