import {
	SongItem,
	SongPicker,
	SongViewer,
	TextInput,
	TextItem,
	TextPicker,
} from "@/components";
import { useSetlist, useSetlistName } from "@/hooks/queries/useSetlistQueries";
import { queryKeys } from "@/utils/queryKeys";
import {
	setlistItemAppendMutation,
	setlistItemDeleteMutation,
	setlistItemPositionMutation,
	setlistNameMutation,
	setlistTextItemMutation,
} from "@/utils/supabase";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

const SetlistEditor = () => {
	const { setlistId } = useParams();
	const queryClient = useQueryClient();

	const { data: setlistData } = useSetlist(setlistId);
	const setlist = useMemo(
		() =>
			setlistData
				? [...setlistData].sort((a, b) => a.position - b.position)
				: null,
		[setlistData],
	);

	const { data: initialSetlistName } = useSetlistName(setlistId);

	const [selectedItem, setSelectedItem] = useState<number>();
	const [setlistName, setSetlistName] = useState<string>("");
	const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
	const [isTextPickerOpen, setIsTextPickerOpen] = useState(false);
	const [textNewValue, setTextNewValue] = useState<string | null>(null);

	// Initialize setlist name from query data
	useEffect(() => {
		if (initialSetlistName) {
			setSetlistName(initialSetlistName);
		}
	}, [initialSetlistName]);

	const handleSelectItem = (id: number) => {
		setSelectedItem(id);
		const textValue = setlist?.find((item) => item.id === id)?.text;
		if (textValue !== undefined && textValue !== null)
			setTextNewValue(textValue);
		else setTextNewValue(null);
	};

	const invalidateSetlist = useCallback(() => {
		if (!setlistId) return;
		queryClient.invalidateQueries({
			queryKey: queryKeys.setlists.detail(setlistId),
		});
	}, [setlistId, queryClient]);

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
		const index1 = setlist.findIndex((item) => item.id === id1);
		const index2 = setlist.findIndex((item) => item.id === id2);
		Promise.all([
			setlistItemPositionMutation(setlistId, id1, index2),
			setlistItemPositionMutation(setlistId, id2, index1),
		]).then(invalidateSetlist);
	};

	const handleDelete = (id: number) => {
		if (!setlist || !setlistId) return;
		setlistItemDeleteMutation(setlistId, id).then(invalidateSetlist);
	};

	const handleClose = (songId?: number) => {
		setIsSongPickerOpen(false);
		if (!songId || !setlistId || setlist === null) return;
		setlistItemAppendMutation(
			setlist.length,
			Number(setlistId),
			songId,
			null,
			null,
		).then(() => {
			invalidateSetlist();
		});
	};

	const handleCloseTextPicker = (textId?: number) => {
		setIsTextPickerOpen(false);
		if (!textId || !setlistId || setlist === null) return;
		setlistItemAppendMutation(
			setlist.length,
			Number(setlistId),
			null,
			null,
			textId,
		).then(() => {
			invalidateSetlist();
		});
	};

	const handleSaveNewText = useCallback(() => {
		if (!setlistId || !selectedItem) return;
		setlistTextItemMutation(setlistId, selectedItem, textNewValue ?? "").then(
			() => {
				invalidateSetlist();
			},
		);
	}, [setlistId, selectedItem, textNewValue, invalidateSetlist]);

	const handleNewTextItem = () => {
		if (!setlistId || setlist === null) return;
		setlistItemAppendMutation(
			setlist.length,
			Number(setlistId),
			null,
			"",
			null,
		).then(() => {
			invalidateSetlist();
		});
	};

	useEffect(() => {
		if (textNewValue === null) return;
		const currentSelectedItem = selectedItem; // Capture the current selectedItem
		const timeout = setTimeout(() => {
			if (!setlistId || !currentSelectedItem) return;
			setlistTextItemMutation(
				setlistId,
				currentSelectedItem,
				textNewValue ?? "",
			).then(() => {
				invalidateSetlist();
			});
		}, 1000);
		return () => clearTimeout(timeout);
	}, [textNewValue, selectedItem, setlistId, invalidateSetlist]);

	const selectedSong = setlist?.find((item) => item.id === selectedItem)?.songs;
	const selectedText = setlist?.find((item) => item.id === selectedItem)?.texts;

	return (
		<>
			{setlist ? (
				<div className="grid grid-cols-3">
					<ul className="col-span-3 md:col-span-1 border-r-2 border-gray-200 dark:border-gray-600 h-screen overflow-scroll">
						<li>
							<Link
								className="px-2 italic text-slate-600 dark:text-slate-200 hover:underline"
								to="/setlists"
							>
								{"<"} Setlists
							</Link>
						</li>
						<li className="px-4 py-2 bg-jubilateBlue-100 hover:bg-jubilateBlue-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md">
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
									className="w-full text-left min-w-0"
									onClick={() => {
										handleSelectItem(item.id);
									}}
								>
									{item.songs && <SongItem song={item.songs} hover={false} />}
									{item.texts && <TextItem text={item.texts} hover={false} />}
									{item.text && (
										<p className="px-4 text-black dark:text-white truncate">
											{item.text.split("\n")[0]}
										</p>
									)}
								</button>
								<div className="grid grid-cols-2 items-center h-fit w-fit gap-2 my-2 mr-2">
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
									<button
										type="button"
										className="col-span-1"
										onClick={() => handleDelete(item.id)}
									>
										<XMarkIcon className="bg-jubilateRed bg-opacity-85 hover:bg-opacity-100 text-white w-6 p-1 rounded-md" />
									</button>
								</div>
							</li>
						))}
						<li className="text-white border-b-2 border-gray-200 dark:border-gray-600 w-full flex items-center flex-wrap gap-1">
							<button
								type="button"
								className="w-fit place-self-start text-left p-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-700 dark:hover:bg-jubilateBlue-400 m-2 rounded-md transition"
								onClick={() => setIsSongPickerOpen(true)}
							>
								+ Morceau
							</button>
							<button
								type="button"
								className="w-fit place-self-start text-left p-2 bg-green-500 hover:bg-green-700 dark:hover:bg-green-400 m-2 rounded-md transition"
								onClick={() => setIsTextPickerOpen(true)}
							>
								+ Ajouter Texte
							</button>
							<button
								type="button"
								className="w-fit place-self-start text-left p-2 bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-400 m-2 rounded-md transition"
								onClick={() => handleNewTextItem()}
							>
								+ Texte libre
							</button>
						</li>
					</ul>
					{selectedSong && (
						<div className="col-span-2 max-h-screen overflow-y-auto hidden md:block">
							<SongViewer song={selectedSong} />
						</div>
					)}
					{selectedText && (
						<div className="col-span-2 max-h-screen overflow-y-auto hidden md:block p-6">
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
								<h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
									{selectedText.title}
								</h2>
								<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
									{selectedText.content}
								</div>
							</div>
						</div>
					)}
					{textNewValue !== null && (
						<div className="p-4 col-span-2 hidden md:block">
							<textarea
								onChange={(value) => setTextNewValue(value.currentTarget.value)}
								className="h-full w-full outline-none bg-transparent text-black dark:text-white"
								onBlur={() => handleSaveNewText()}
								placeholder="Probablement parler de Jésus..."
								value={textNewValue}
							/>
						</div>
					)}
				</div>
			) : (
				<p>Chargement...</p>
			)}
			{isSongPickerOpen && <SongPicker handleClose={handleClose} />}
			{isTextPickerOpen && <TextPicker handleClose={handleCloseTextPicker} />}
		</>
	);
};

export { SetlistEditor };
