import { PageHeader, SongItem, useLeader } from "@/components";
import { globalSearchEnabledAtom } from "@/components/Contexts/SettingsContext";
import { getSongItemId } from "@/components/SongItem";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllRefrains } from "@/hooks/queries/useSongQueries";
import { normalize } from "@/utils/normalize";
import { queryKeys } from "@/utils/queryKeys";
import { type AllRefrains, newRefrainMutation } from "@/utils/supabase";
import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useAtomValue } from "jotai";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

export function Refrains() {
	const { data: refrainsData } = useAllRefrains();
	const queryClient = useQueryClient();

	const refrains = useMemo(
		() => (refrainsData ? [...refrainsData].sort((a, b) => a.id - b.id) : []),
		[refrainsData],
	);

	const [searchResults, setSearchResults] = useState<AllRefrains | null>(null);
	const globalSearchEnabled = useAtomValue(globalSearchEnabledAtom);
	const unifiedSearch = useUnifiedSearch("refrains");
	const filteredRefrains = searchResults ?? refrains;
	const navigate = useNavigate();
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const fuse = useMemo(
		() =>
			new Fuse(refrains, {
				keys: ["title"],
				threshold: 0.3,
				getFn: (obj, path) => {
					const k = Array.isArray(path) ? path[0] : path;
					const v = (obj as Record<string, unknown>)[k];
					return typeof v === "string" ? normalize(v) : "";
				},
			}),
		[refrains],
	);
	const { leader } = useLeader();

	const scrollToSelected = useCallback(() => {
		if (selectedIndex !== null) {
			const selectedId = filteredRefrains[selectedIndex]?.id;
			const element = document.getElementById(getSongItemId(selectedId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedIndex, filteredRefrains]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: trigger scroll on index change
	useEffect(scrollToSelected, [scrollToSelected]);

	useEffect(() => {
		if (globalSearchEnabled) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (selectedIndex !== null && event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedIndex(Math.max(0, selectedIndex - 1));
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				if (selectedIndex === null) setSelectedIndex(0);
				else
					setSelectedIndex(
						Math.min(filteredRefrains.length - 1, selectedIndex + 1),
					);
			}
			if (event.key === "Enter") {
				if (selectedIndex !== null) {
					navigate(`/songs/${filteredRefrains[selectedIndex].id}`);
				}
			}
			if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
				const searchInput = document.querySelector(
					'input[type="search"]',
				) as HTMLInputElement | null;
				if (searchInput) {
					searchInput.focus();
					if (document.activeElement !== searchInput) {
						searchInput.value += event.key;
						const inputEvent = new Event("input", { bubbles: true });
						searchInput.dispatchEvent(inputEvent);
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [globalSearchEnabled, selectedIndex, filteredRefrains, navigate]);

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			if (event.target.value.length === 0) setSearchResults(null);
			else {
				window.scrollTo(0, 0);
				if (!Number.isNaN(Number(event.target.value))) {
					const refrain = refrains.find(
						(s) => s.id === Number(event.target.value),
					);
					setSearchResults(refrain ? [refrain] : []);
					setSelectedIndex(0);
				} else {
					setSearchResults(
						fuse.search(normalize(event.target.value)).map((hit) => hit.item),
					);
					setSelectedIndex(null);
				}
			}
		},
		[fuse, refrains],
	);

	const createNewRefrain = async (suggestedTitle?: string) => {
		const title = prompt("Titre du refrain", suggestedTitle ?? "");
		if (!title) return;
		const { error, data } = await newRefrainMutation(title);
		if (error) {
			toast.error(`Erreur lors de la création du refrain: ${error.message}`);
		} else {
			queryClient.invalidateQueries({
				queryKey: queryKeys.songs.refrainList(),
			});
			toast.success("Refrain créé avec succès");
			navigate(`/songs/${data.id}`);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800">
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="list"
					left={
						globalSearchEnabled ? (
							<UnifiedSearchInput
								search={unifiedSearch}
								placeholder="Chercher un refrain..."
							/>
						) : (
							<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
								<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
								<input
									className="w-full h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
									type="search"
									onChange={search}
									placeholder="Chercher un refrain..."
								/>
							</div>
						)
					}
				/>
			</div>
			{globalSearchEnabled && unifiedSearch.query.trim().length > 0 ? (
				<UnifiedSearchResults
					search={unifiedSearch}
					onCreateRefrain={createNewRefrain}
				/>
			) : (
				<>
					<div
						className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0"
						style={{ columnCount: 2 }}
					>
						{filteredRefrains.map((refrain, index) => (
							<Link
								key={refrain.id}
								to={`/songs/${refrain.id}`}
								className={
									index === selectedIndex ? "bg-gray-300 dark:bg-slate-700" : ""
								}
							>
								<SongItem song={refrain} />
							</Link>
						))}
					</div>
					<div className="flex justify-center py-4">
						<button
							className="px-4 py-2 bg-jubilateBlue-500 text-white rounded-full hover:bg-jubilateBlue-600 transition"
							type="button"
							onClick={() => createNewRefrain()}
						>
							Nouveau refrain
						</button>
					</div>
				</>
			)}
		</div>
	);
}
