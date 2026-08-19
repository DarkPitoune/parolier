import {
	PageHeader,
	SongItem,
	SongPicker,
	SongViewer,
	TextInput,
	TextItem,
	TextPicker,
} from "@/components";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSetlist } from "@/hooks/queries/useSetlistQueries";
import { queryKeys } from "@/utils/queryKeys";
import {
	setlistItemAppendMutation,
	setlistItemDeleteMutation,
	setlistItemPositionMutation,
	setlistNameMutation,
	setlistNameQuery,
	setlistTextItemMutation,
} from "@/utils/supabase";
import { useQueryClient } from "@tanstack/react-query";
import {
	DocumentTextIcon,
	MusicalNoteIcon,
	PencilIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	TouchSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

type SetlistItem = NonNullable<ReturnType<typeof useSetlist>["data"]>[number];

function SortableSetlistItem({
	item,
	selected,
	onSelect,
	onDelete,
}: {
	item: SetlistItem;
	selected: boolean;
	onSelect: (id: number) => void;
	onDelete: (id: number) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	return (
		<li
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
				opacity: isDragging ? 0.5 : 1,
				WebkitTouchCallout: "none",
			}}
			className={clsx(
				"flex pr-2 select-none hover:bg-jubilateBlue-100 dark:hover:bg-slate-600 items-center",
				isDragging ? "cursor-grabbing" : "cursor-grab",
				selected && "bg-gray-100 dark:bg-slate-700",
			)}
			{...attributes}
			{...listeners}
		>
			<button
				type="button"
				className="w-full text-left min-w-0 flex items-center gap-2 pl-2"
				onClick={() => onSelect(item.id)}
			>
				{item.songs && (
					<>
						<MusicalNoteIcon className="w-5 shrink-0 text-jubilateBlue-500 dark:text-jubilateBlue-400" />
						<SongItem song={item.songs} hover={false} />
					</>
				)}
				{item.texts && (
					<>
						<DocumentTextIcon className="w-5 shrink-0 text-jubilateGreen" />
						<TextItem text={item.texts} hover={false} />
					</>
				)}
				{item.text != null && (
					<>
						<PencilIcon className="w-5 shrink-0 text-jubilatePurple" />
						<p className="px-2 text-black dark:text-white truncate">
							{item.text.split("\n")[0] || "Texte libre (vide)"}
						</p>
					</>
				)}
			</button>
			<div className="flex items-center h-fit w-fit my-2 mx-2">
				<button type="button" onClick={() => onDelete(item.id)}>
					<XMarkIcon className="size-8.5 shrink-0 rounded-full bg-jubilateRed/85 hover:bg-jubilateRed p-1 text-white transition" />
				</button>
			</div>
		</li>
	);
}

const SetlistEditor = () => {
	const { setlistId } = useParams();
	const queryClient = useQueryClient();
	const isMobile = useIsMobile();

	const { data: setlistData } = useSetlist(setlistId);
	const setlist = useMemo(
		() =>
			setlistData
				? [...setlistData].sort((a, b) => a.position - b.position)
				: null,
		[setlistData],
	);

	const [selectedItem, setSelectedItem] = useState<number>();
	const [setlistName, setSetlistName] = useState<string>("");
	const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
	const [isTextPickerOpen, setIsTextPickerOpen] = useState(false);
	const [textNewValue, setTextNewValue] = useState<string | null>(null);
	const [orderedIds, setOrderedIds] = useState<number[]>([]);

	// Mouse: a plain click still selects the row; only a drag past a few px reorders it.
	// Touch: matches the app's long-press convention (see useLongPress) before a drag starts,
	// so a normal vertical swipe keeps scrolling the list.
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 500, tolerance: 10 },
		}),
	);

	// Sync local order whenever the server-backed setlist changes (initial load, refetch after a mutation).
	useEffect(() => {
		if (setlist) setOrderedIds(setlist.map((item) => item.id));
	}, [setlist]);

	const orderedSetlist = useMemo(() => {
		if (!setlist) return null;
		const byId = new Map(setlist.map((item) => [item.id, item]));
		return orderedIds
			.map((id) => byId.get(id))
			.filter((item): item is NonNullable<typeof item> => item !== undefined);
	}, [setlist, orderedIds]);

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

	// Load setlist name on mount
	useEffect(() => {
		if (!setlistId) return;
		setlistNameQuery(setlistId).then(({ data }) => {
			if (data?.name) setSetlistName(data.name);
		});
	}, [setlistId]);

	const handleSaveSetlistName = () => {
		if (!setlistId) return;
		setlistNameMutation(setlistId, setlistName).then(({ error }) => {
			if (error) toast.error("Erreur lors de l'enregistrement du nom");
		});
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!setlist || !setlistId || !over || active.id === over.id) return;

		const oldIndex = orderedIds.indexOf(Number(active.id));
		const newIndex = orderedIds.indexOf(Number(over.id));
		if (oldIndex === -1 || newIndex === -1) return;

		const newOrderedIds = arrayMove(orderedIds, oldIndex, newIndex);
		setOrderedIds(newOrderedIds);

		const positionById = new Map(
			setlist.map((item) => [item.id, item.position]),
		);
		const mutations = newOrderedIds
			.map((id, position) => ({ id, position }))
			.filter(({ id, position }) => positionById.get(id) !== position)
			.map(({ id, position }) =>
				setlistItemPositionMutation(setlistId, id, position),
			);
		Promise.all(mutations).then((results) => {
			if (results.some(({ error }) => error))
				toast.error("Erreur lors de la réorganisation");
			invalidateSetlist();
		});
	};

	const handleDelete = (id: number) => {
		if (!setlist || !setlistId) return;
		setlistItemDeleteMutation(setlistId, id).then(({ error }) => {
			if (error) {
				toast.error("Erreur lors de la suppression");
				return;
			}
			invalidateSetlist();
		});
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
		).then(({ error }) => {
			if (error) {
				toast.error("Erreur lors de l'ajout du chant");
				return;
			}
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
		).then(({ error }) => {
			if (error) {
				toast.error("Erreur lors de l'ajout du texte");
				return;
			}
			invalidateSetlist();
		});
	};

	const handleSaveNewText = useCallback(() => {
		if (!setlistId || !selectedItem) return;
		setlistTextItemMutation(setlistId, selectedItem, textNewValue ?? "").then(
			({ error }) => {
				if (error) {
					toast.error("Erreur lors de l'enregistrement du texte");
					return;
				}
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
		).then(({ error }) => {
			if (error) {
				toast.error("Erreur lors de la création du texte libre");
				return;
			}
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
			).then(({ error }) => {
				if (error) {
					toast.error("Erreur lors de l'enregistrement du texte");
					return;
				}
				invalidateSetlist();
			});
		}, 1000);
		return () => clearTimeout(timeout);
	}, [textNewValue, selectedItem, setlistId, invalidateSetlist]);

	const selectedSong = setlist?.find((item) => item.id === selectedItem)?.songs;
	const selectedText = setlist?.find((item) => item.id === selectedItem)?.texts;

	return (
		<div className="flex flex-col h-screen">
			<PageHeader
				variant="detail"
				title={setlistName ? `Modifier « ${setlistName} »` : "Chargement..."}
			/>
			{setlist ? (
				<div className="grid grid-cols-3 flex-1 min-h-0">
					{/* Le padding bottom sert à ne pas cacher le dernier boutton supprimer de la liste avec le bouton menu flottant */}
					<ul className="col-span-3 md:col-span-1 border-r-2 border-gray-200 dark:border-gray-600 h-full min-h-0 overflow-y-auto pb-12">
						<li className="px-4 py-2">
							<TextInput
								label="Nom"
								value={setlistName}
								onChange={setSetlistName}
								onBlur={handleSaveSetlistName}
							/>
						</li>
						<li className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-600 flex items-center justify-center flex-wrap gap-3 p-2">
							<button
								type="button"
								className="px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 dark:bg-jubilateBlue-400 dark:hover:bg-jubilateBlue-300 text-white rounded-full transition"
								onClick={() => setIsSongPickerOpen(true)}
							>
								+ Chant
							</button>
							<button
								type="button"
								className="px-4 py-2 bg-jubilateGreen/85 hover:bg-jubilateGreen text-white rounded-full transition"
								onClick={() => setIsTextPickerOpen(true)}
							>
								+ Texte existant
							</button>
							<button
								type="button"
								className="px-4 py-2 bg-jubilatePurple/85 hover:bg-jubilatePurple text-white rounded-full transition"
								onClick={() => handleNewTextItem()}
							>
								+ Texte libre
							</button>
						</li>
						{orderedSetlist?.length === 0 && (
							<li className="text-center text-gray-500 dark:text-gray-400 py-8 px-4">
								Cette setlist est vide. Ajoutez un chant ou un texte pour
								commencer.
							</li>
						)}
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
							modifiers={[restrictToVerticalAxis]}
						>
							<SortableContext
								items={orderedIds}
								strategy={verticalListSortingStrategy}
							>
								{orderedSetlist?.map((item) => (
									<SortableSetlistItem
										key={item.id}
										item={item}
										selected={selectedItem === item.id}
										onSelect={handleSelectItem}
										onDelete={handleDelete}
									/>
								))}
							</SortableContext>
						</DndContext>
					</ul>
					{selectedSong && (
						<div className="col-span-2 h-full min-h-0 overflow-y-auto hidden md:block">
							<SongViewer song={selectedSong} />
						</div>
					)}
					{selectedText && (
						<div className="col-span-2 h-full min-h-0 overflow-y-auto hidden md:block p-6">
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
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
						<div className="p-4 col-span-2 h-full min-h-0 hidden md:block">
							<textarea
								onChange={(value) => setTextNewValue(value.currentTarget.value)}
								className="h-full w-full outline-hidden bg-transparent text-black dark:text-white"
								onBlur={() => handleSaveNewText()}
								placeholder="Probablement parler de Jésus..."
								value={textNewValue}
							/>
						</div>
					)}
				</div>
			) : (
				<p className="p-4">Chargement...</p>
			)}
			{isMobile && selectedItem !== undefined && (
				// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
				<div
					className="bg-black/50 fixed inset-0 z-50 flex justify-center items-center"
					onClick={() => setSelectedItem(undefined)}
				>
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<div
						className="bg-white dark:bg-gray-800 rounded-lg size-11/12 overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex justify-end p-2 sticky top-0 bg-white dark:bg-gray-800">
							<button type="button" onClick={() => setSelectedItem(undefined)}>
								<XMarkIcon className="w-8 text-black dark:text-white" />
							</button>
						</div>
						{selectedSong && <SongViewer showTitle song={selectedSong} />}
						{selectedText && (
							<div className="p-6">
								<h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
									{selectedText.title}
								</h2>
								<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
									{selectedText.content}
								</div>
							</div>
						)}
						{textNewValue !== null && (
							<div className="p-4">
								<textarea
									onChange={(value) =>
										setTextNewValue(value.currentTarget.value)
									}
									className="h-64 w-full outline-hidden bg-transparent text-black dark:text-white"
									onBlur={() => handleSaveNewText()}
									placeholder="Probablement parler de Jésus..."
									value={textNewValue}
								/>
							</div>
						)}
					</div>
				</div>
			)}
			{isSongPickerOpen && <SongPicker handleClose={handleClose} />}
			{isTextPickerOpen && <TextPicker handleClose={handleCloseTextPicker} />}
		</div>
	);
};

export { SetlistEditor };
