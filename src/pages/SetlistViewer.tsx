import { SongItem, SongPicker, SongViewer, TextInput } from "@/components";
import {
	type Setlist,
	setlistItemAppendMutation,
	setlistItemDeleteMutation,
	setlistItemPositionMutation,
	setlistNameMutation,
	setlistQuery,
} from "@/utils/supabase";
import {
	ArrowDownIcon,
	ArrowPathIcon,
	ArrowUpIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const SetlistViewer = () => {
	const { setlistId } = useParams();

	const [setlist, setSetlist] = useState<Setlist | null>(null);
	const [selectedItem, setSelectedItem] = useState<number>();
	const [setlistName, setSetlistName] = useState<string>("");
	const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);

	const handleSetlistQuery = useCallback(() => {
		if (!setlistId) return;
		setlistQuery(setlistId).then(({ data }) => {
			if (data) data.sort((a, b) => a.position - b.position);
			setSetlist(data);
			if (data?.[0]?.setlists?.name) setSetlistName(data[0].setlists.name);
		});
	}, [setlistId]);

	useEffect(() => {
		handleSetlistQuery();
	}, [handleSetlistQuery]);

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

	const handleClose = (songId: number) => {
		setIsSongPickerOpen(false);
		if (!setlistId) return;
		setlistItemAppendMutation(Number(setlistId), songId).then(() => {
			handleSetlistQuery();
		});
	};

	const selectedSong = setlist?.find((item) => item.id === selectedItem)?.songs;

	return (
		<>
			{setlist ? (
				<div className="grid grid-cols-3">
					<ul className="col-span-1 border-r-2 border-gray-200 dark:border-gray-600 h-screen">
						<li className="h-12 px-4 flex justify-between items-center bg-slate-700 hover:bg-slate-600 m-2 rounded-md">
							<TextInput
								value={setlistName}
								onChange={setSetlistName}
								onBlur={handleSaveSetlistName}
							/>
						</li>
						{setlist.map((item, index) => (
							<li
								key={item.id}
								className={clsx(
									"flex pr-2 hover:bg-jubilateBlue-100 dark:hover:bg-slate-600",
									selectedItem === item.id && "bg-gray-100 dark:bg-slate-700",
								)}
							>
								<button
									type="button"
									className={clsx("w-full text-left")}
									onClick={() => {
										setSelectedItem(item.id);
									}}
								>
									{item.songs && <SongItem song={item.songs} hover={false} />}
								</button>
								<div className="grid grid-cols-2 items-center h-fit w-fit gap-2 my-2 mr-2">
									<button type="button" className="col-span-1">
										<ArrowPathIcon className=" bg-jubilateGreen bg-opacity-85 hover:bg-opacity-100 text-white w-6 p-1 rounded-md" />
									</button>
									<button
										type="button"
										className="col-span-1"
										onClick={() => handleDelete(item.id)}
									>
										<XMarkIcon className="bg-jubilateRed bg-opacity-85 hover:bg-opacity-100 text-white w-6 p-1 rounded-md" />
									</button>
									{index < setlist.length - 1 ? (
										<button
											type="button"
											className="col-span-1"
											onClick={() =>
												handleSwapItemsPosition(item.id, setlist[index + 1].id)
											}
										>
											<ArrowDownIcon className="bg-jubilateBlue-500 bg-opacity-85 hover:bg-opacity-100 text-white w-6 p-1 rounded-md" />
										</button>
									) : (
										<div className="col-span-1" />
									)}
									{index > 0 ? (
										<button
											type="button"
											className="col-span-1"
											onClick={() =>
												handleSwapItemsPosition(item.id, setlist[index - 1].id)
											}
										>
											<ArrowUpIcon className="bg-jubilateBlue-500 bg-opacity-85 hover:bg-opacity-100 text-white w-6 p-1 rounded-md" />
										</button>
									) : (
										<div className="col-span-1" />
									)}
								</div>
							</li>
						))}
						<li className="text-white border-b-2 border-gray-200 dark:border-gray-600 w-full">
							<button
								type="button"
								className="w-fit place-self-start text-left p-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-700 m-2 rounded-md"
								onClick={() => setIsSongPickerOpen(true)}
							>
								+ Add Song
							</button>
						</li>
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
			<SongPicker isOpen={isSongPickerOpen} handleClose={handleClose} />
		</>
	);
};

export { SetlistViewer };
