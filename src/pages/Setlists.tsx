import { ConfirmDialog, PageHeader } from "@/components";
import {
	isDarkAtom,
	setlistTagFiltersAtom,
} from "@/components/Contexts/SettingsContext";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllSetlists } from "@/hooks/queries/useSetlistQueries";
import { queryKeys } from "@/utils/queryKeys";
import {
	deleteSetlistMutation,
	newNamedSetlistMutation,
} from "@/utils/supabase";
import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	DialogTitle,
} from "@headlessui/react";
import {
	PencilSquareIcon,
	SparklesIcon,
	TrashIcon,
} from "@heroicons/react/16/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

const Setlists = () => {
	const { data: setslists = [], isLoading } = useAllSetlists();
	const darkMode = useAtomValue(isDarkAtom);
	const unifiedSearch = useUnifiedSearch("setlists");
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [tagFilters, setTagFilters] = useAtom(setlistTagFiltersAtom);

	const allTags = useMemo(
		() =>
			[...new Set(setslists.flatMap((s) => s.tags))].sort((a, b) =>
				a.localeCompare(b, "fr"),
			),
		[setslists],
	);
	const activeFilters = tagFilters.filter((tag) => allTags.includes(tag));
	// Untagged setlists stay visible so a forgotten tag never hides one.
	const visibleSetlists =
		activeFilters.length === 0
			? setslists
			: setslists.filter(
					(s) =>
						s.tags.length === 0 ||
						s.tags.some((tag) => activeFilters.includes(tag)),
				);

	const toggleFilter = (tag: string) =>
		setTagFilters(
			activeFilters.includes(tag)
				? activeFilters.filter((t) => t !== tag)
				: [...activeFilters, tag],
		);

	const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newSetlistName, setNewSetlistName] = useState("");

	const createMutation = useMutation({
		mutationFn: (name: string) => newNamedSetlistMutation(name),
		onSuccess: ({ data, error }) => {
			if (error) {
				toast.error("Erreur lors de la création de la setlist");
				return;
			}
			queryClient.invalidateQueries({ queryKey: queryKeys.setlists.list() });
			setIsCreateOpen(false);
			setNewSetlistName("");
			if (data) navigate(`/setlists/${data.id}/edit`);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => deleteSetlistMutation(id),
		onSuccess: ({ error }) => {
			if (error) {
				toast.error("Erreur lors de la suppression de la setlist");
				return;
			}
			queryClient.invalidateQueries({ queryKey: queryKeys.setlists.list() });
		},
	});

	const handleCreateSetlist = () => {
		const name = newSetlistName.trim();
		if (!name) return;
		createMutation.mutate(name);
	};

	const handleConfirmDelete = () => {
		if (deleteTargetId === null) return;
		deleteMutation.mutate(deleteTargetId);
		setDeleteTargetId(null);
	};

	useEffect(() => {
		document.title = "Setlists - Parolier";
	}, []);

	return (
		<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
			<div className="sticky top-0 z-10 bg-white dark:bg-gray-800">
				<PageHeader
					variant="list"
					left={
						<UnifiedSearchInput
							search={unifiedSearch}
							placeholder="Rechercher une setlist..."
						/>
					}
				/>
				<div className="flex flex-wrap justify-center gap-2 border-b border-gray-200 dark:border-gray-600 p-2">
					<button
						type="button"
						onClick={() => setIsCreateOpen(true)}
						className="flex items-center gap-2 px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 text-white rounded-full font-medium transition"
					>
						Créer une setlist
					</button>
					<Link
						to="/veillees/new"
						className="flex items-center gap-2 px-4 py-2 border border-jubilateBlue-500 dark:border-jubilateBlue-400 text-jubilateBlue-500 dark:text-jubilateBlue-300 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 rounded-full font-medium transition"
					>
						<SparklesIcon className="size-4" />
						Préparer une veillée
					</Link>
				</div>
				{allTags.length > 0 && (
					<div className="flex gap-2 overflow-x-auto px-2 py-2 border-b border-gray-200 dark:border-gray-600">
						{allTags.map((tag) => {
							const active = activeFilters.includes(tag);
							return (
								<button
									key={tag}
									type="button"
									aria-pressed={active}
									onClick={() => toggleFilter(tag)}
									className={clsx(
										"shrink-0 rounded-full border-2 px-3 py-0.5 text-sm font-semibold transition",
										active
											? "border-jubilateBlue-500 bg-jubilateBlue-500 text-white"
											: "border-jubilateBlue-300 text-jubilateBlue-500 dark:border-jubilateBlue-400 dark:text-jubilateBlue-300",
									)}
								>
									{tag}
								</button>
							);
						})}
					</div>
				)}
			</div>
			{unifiedSearch.showResults ? (
				<UnifiedSearchResults search={unifiedSearch} />
			) : (
				<div className="flex flex-col items-stretch divide-y pb-14">
					{!isLoading && setslists.length === 0 && (
						<p className="text-center text-gray-500 dark:text-gray-400 py-8">
							Aucune setlist pour le moment.
						</p>
					)}
					{visibleSetlists.map((setlist) => (
						<div
							key={setlist.id}
							className="px-2 text-black dark:text-white hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-center gap-3 relative overflow-clip"
						>
							<Link
								className="grow py-4 flex flex-wrap items-center gap-x-3 gap-y-1"
								to={`/setlists/${setlist.id}`}
							>
								{setlist.name}
								{setlist.tags.map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-jubilateBlue-100 dark:bg-jubilateBlue-700 text-jubilateBlue-700 dark:text-white px-2 text-xs font-medium"
									>
										{tag}
									</span>
								))}
							</Link>
							<button
								type="button"
								onClick={() => setDeleteTargetId(setlist.id)}
								disabled={deleteMutation.isPending}
							>
								<TrashIcon className="size-8.5 rounded-full bg-jubilateRed-500 hover:bg-jubilateRed-400 p-2 text-white" />
							</button>
							<Link to={`/setlists/${setlist.id}/edit`}>
								<PencilSquareIcon className="size-8.5 p-2 bg-jubilateGreen-500 hover:bg-jubilateGreen-400 rounded-full text-white" />
							</Link>
						</div>
					))}
				</div>
			)}
			<ConfirmDialog
				open={deleteTargetId !== null}
				title="Supprimer cette setlist ?"
				message="Cette action est définitive et supprimera tous les éléments qu'elle contient."
				confirmLabel="Supprimer"
				onConfirm={handleConfirmDelete}
				onCancel={() => setDeleteTargetId(null)}
			/>
			<Dialog
				open={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				className={clsx("relative z-20", darkMode && "dark")}
			>
				<DialogBackdrop
					transition
					className="fixed inset-0 bg-jubilateBlue-300/40 transition duration-200 ease-in-out data-closed:opacity-0"
				/>
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<DialogPanel
						transition
						className="w-full max-w-sm transform transition duration-200 ease-in-out data-closed:opacity-0 data-closed:scale-95"
					>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								handleCreateSetlist();
							}}
							className="flex flex-col gap-4 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white p-6 shadow-xl"
						>
							<DialogTitle className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
								Nouvelle setlist
							</DialogTitle>
							<input
								type="text"
								autoFocus
								placeholder="Nom de la setlist"
								value={newSetlistName}
								onChange={(e) => setNewSetlistName(e.target.value)}
								className="px-3 py-2 rounded-md border border-jubilateBlue-100 dark:border-slate-500 bg-transparent outline-hidden focus:border-jubilateBlue-500 dark:focus:border-jubilateBlue-400"
							/>
							<div className="flex gap-2 justify-end">
								<button
									type="button"
									onClick={() => setIsCreateOpen(false)}
									className="px-4 py-2 rounded-full text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								>
									Annuler
								</button>
								<button
									type="submit"
									disabled={!newSetlistName.trim() || createMutation.isPending}
									className="px-4 py-2 rounded-full bg-jubilateBlue-500 hover:bg-jubilateBlue-600 dark:bg-jubilateBlue-400 dark:hover:bg-jubilateBlue-300 disabled:opacity-50 text-white transition"
								>
									{createMutation.isPending ? "Création..." : "Créer"}
								</button>
							</div>
						</form>
					</DialogPanel>
				</div>
			</Dialog>
		</div>
	);
};

export { Setlists };
