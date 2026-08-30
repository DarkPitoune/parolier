import { PageHeader, SongItem, useLeader } from "@/components";
import {
	filtersAtom,
	tagTabOpenAtom,
} from "@/components/Contexts/SettingsContext";
import { TagChip } from "@/components/TagChip";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllSongs, useAllTags } from "@/hooks/queries/useSongQueries";
import supabase, { type AllSongs } from "@/utils/supabase";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

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

	const unifiedSearch = useUnifiedSearch("songs");
	const [selectedTags, setSelectedTags] = useAtom<number[]>(filtersAtom);
	const [tagTabOpen, setTagTabOpen] = useAtom(tagTabOpenAtom);
	const { leader } = useLeader();

	const toggleTag = (id: number) => {
		setSelectedTags((oldTags) => {
			if (!oldTags.includes(id)) return oldTags.concat([id]);
			return oldTags.filter((tagId) => tagId !== id);
		});
	};

	const isCorrectTag = (song: AllSongs[number]) => {
		if (selectedTags.length === 0) return true;
		return song.tags.some(({ id }) => selectedTags.includes(id));
	};

	const askNewSong = (title: string) => {
		if (
			window.confirm(`Voulez-vous vraiment demander l'ajout de "${title}" ?`)
		) {
			const promise = supabase
				.from("song_requests")
				.insert({ title })
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
						<UnifiedSearchInput
							search={unifiedSearch}
							placeholder="Vite, une idée..."
						/>
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
			{unifiedSearch.showResults ? (
				<UnifiedSearchResults
					search={unifiedSearch}
					onAskNewSong={askNewSong}
				/>
			) : (
				<div
					className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800 print:block print:p-0"
					style={{ columnCount: 2 }}
					data-testid="song-list"
				>
					{songs.filter(isCorrectTag).map((song) => (
						<Link
							key={song.id}
							to={`/songs/${song.id}`}
							data-testid={`song-link-${song.id}`}
						>
							<SongItem song={song} />
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

export { Index };
