import { PageHeader, SongItem, useLeader } from "@/components";
import {
	filtersAtom,
	globalSearchEnabledAtom,
	tagTabOpenAtom,
} from "@/components/Contexts/SettingsContext";
import { getSongItemId } from "@/components/SongItem";
import { TagChip } from "@/components/TagChip";
import { UnifiedSearch } from "@/components/UnifiedSearch/UnifiedSearch";
import { unifiedSearchQueryAtom } from "@/components/UnifiedSearch/unifiedSearchAtoms";
import { useAllSongs, useAllTags } from "@/hooks/queries/useSongQueries";
import { normalize } from "@/utils/normalize";
import supabase, { type AllSongs } from "@/utils/supabase";
import {
	ChevronRightIcon,
	MagnifyingGlassIcon,
} from "@heroicons/react/16/solid";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useAtom, useAtomValue } from "jotai";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

function Index() {
	const { data: songsData } = useAllSongs();
	const { data: tagsData } = useAllTags();

	const songs = useMemo(
		() => (songsData ? [...songsData].sort((a, b) => a.id - b.id) : []),
		[songsData],
	);
	const tags = useMemo(
		() => (tagsData ? [...tagsData].sort((a, b) => a.id - b.id) : []),
		[tagsData],
	);

	const [searchResults, setSearchResults] = useState<AllSongs | null>(null);
	const globalSearchEnabled = useAtomValue(globalSearchEnabledAtom);
	const globalSearchQuery = useAtomValue(unifiedSearchQueryAtom);
	const filteredSongs = searchResults ?? songs;
	const [selectedTags, setSelectedTags] = useAtom<number[]>(filtersAtom);
	const [tagTabOpen, setTagTabOpen] = useAtom(tagTabOpenAtom);
	const navigate = useNavigate();
	const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(
		null,
	);
	const fuse = useMemo(
		() =>
			new Fuse(songs, {
				keys: ["title"],
				threshold: 0.3,
				getFn: (obj, path) => {
					const k = Array.isArray(path) ? path[0] : path;
					const v = (obj as Record<string, unknown>)[k];
					return typeof v === "string" ? normalize(v) : "";
				},
			}),
		[songs],
	);
	const { leader } = useLeader();

	const toggleTag = (id: number) => {
		setSelectedTags((oldTags) => {
			if (!oldTags.includes(id)) return oldTags.concat([id]);
			return oldTags.filter((tagId) => tagId !== id);
		});
	};

	const scrollToSelectedSong = useCallback(() => {
		if (selectedSongIndex !== null) {
			const selectedSongId = filteredSongs[selectedSongIndex]?.id;
			const element = document.getElementById(getSongItemId(selectedSongId));
			if (element)
				element.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [selectedSongIndex, filteredSongs]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to trigger the function when selectedSongId changes
	useEffect(scrollToSelectedSong, [scrollToSelectedSong]);

	useEffect(() => {
		if (globalSearchEnabled) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (selectedSongIndex !== null && event.key === "ArrowUp") {
				event.preventDefault();
				setSelectedSongIndex(Math.max(0, selectedSongIndex - 1));
			}
			if (event.key === "ArrowDown") {
				event.preventDefault();
				if (selectedSongIndex === null) setSelectedSongIndex(0);
				else
					setSelectedSongIndex(
						Math.min(filteredSongs.length - 1, selectedSongIndex + 1),
					);
			}
			if (event.key === "Enter") {
				if (selectedSongIndex !== null) {
					navigate(`/songs/${filteredSongs[selectedSongIndex].id}`);
				}
			}
			// Catch any letter input (a-z, A-Z) and focus the search input
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
	}, [globalSearchEnabled, selectedSongIndex, filteredSongs, navigate]);

	const [searchValue, setSearchValue] = useState("");

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) setSearchResults(null);
			else {
				window.scrollTo(0, 0);
				if (!Number.isNaN(Number(event.target.value))) {
					const song = songs.find((s) => s.id === Number(event.target.value));
					setSearchResults(song ? [song] : []);
					setSelectedSongIndex(0);
				} else {
					setSearchResults(
						fuse.search(normalize(event.target.value)).map((hit) => hit.item),
					);
					setSelectedSongIndex(null);
				}
			}
		},
		[fuse, songs],
	);

	useEffect(() => {
		if (!globalSearchEnabled) return;
		setSearchValue(globalSearchQuery);
		if (globalSearchQuery.length === 0) {
			setSearchResults(null);
			return;
		}
		if (!Number.isNaN(Number(globalSearchQuery))) {
			const song = songs.find((s) => s.id === Number(globalSearchQuery));
			setSearchResults(song ? [song] : []);
			setSelectedSongIndex(0);
		} else {
			setSearchResults(
				fuse.search(normalize(globalSearchQuery)).map((hit) => hit.item),
			);
			setSelectedSongIndex(null);
		}
	}, [globalSearchEnabled, globalSearchQuery, songs, fuse]);

	const isCorrectTag = (song: AllSongs[number]) => {
		if (selectedTags.length === 0) return true;
		return song.tags.some(({ id }) => selectedTags.includes(id));
	};

	const askNewSong = () => {
		if (
			window.confirm(
				`Voulez-vous vraiment demander l'ajout de "${searchValue}" ?`,
			)
		) {
			const promise = supabase
				.from("song_requests")
				.insert({ title: searchValue })
				.then() as Promise<void>;
			toast.promise(promise, {
				loading: "Chargement...",
				success: "Chant demandé !",
				error: "Erreur !",
			});
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 pb-12">
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
							<UnifiedSearch
								currentSection="songs"
								placeholder="Vite, une idée..."
							/>
						) : (
							<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
								<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
								<input
									className="w-full h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
									type="search"
									onChange={search}
									placeholder="Vite, une idée..."
								/>
							</div>
						)
					}
				/>
				<div className="px-6 py-2 flex flex-col items-stretch shadow-sm font-flame">
					<button
						className="flex gap-2 text-jubilateBlue-500 dark:text-jubilateBlue-400 items-center"
						onClick={() => setTagTabOpen((v) => !v)}
						type="button"
					>
						<ChevronRightIcon
							data-tabopen={tagTabOpen}
							className="size-6 lg:size-8 data-[tabopen=true]:rotate-90 transition"
						/>
						<h3 className="text-lg lg:text-2xl font-bold">Filtres</h3>
						{selectedTags.length > 0 && (
							<div className="bg-jubilateBlue-500 rounded-full text-white font-bold w-6">
								{selectedTags.length}
							</div>
						)}
					</button>
					<div>
						{tagTabOpen &&
							tags.map((tag) => (
								<TagChip
									key={tag.id}
									tag={tag}
									onClick={() => toggleTag(tag.id)}
									inverted={selectedTags.includes(tag.id)}
									outline
								/>
							))}
					</div>
				</div>
			</div>
			<div
				className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0"
				style={{ columnCount: 2 }}
				data-testid="song-list"
			>
				{filteredSongs.filter(isCorrectTag).map((song, index) => (
					<Link
						key={song.id}
						to={`/songs/${song.id}`}
						data-testid={`song-link-${song.id}`}
						className={
							index === selectedSongIndex ? "bg-gray-300 dark:bg-slate-700" : ""
						}
					>
						<SongItem song={song} />
					</Link>
				))}

				{searchValue && (
					<button
						className="px-2 py-4 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 text-black dark:text-white w-full"
						onClick={askNewSong}
						type="button"
					>
						Demander l'ajout de <b>"{searchValue}"</b> dans la liste
					</button>
				)}
			</div>
		</div>
	);
}

export { Index };
