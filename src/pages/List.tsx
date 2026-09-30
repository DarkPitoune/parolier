import { PageHeader, SongItem, useLeader } from "@/components";
import { filtersAtom } from "@/components/Contexts/SettingsContext";
import { TagChip } from "@/components/TagChip";
import {
	UnifiedSearchInput,
	UnifiedSearchResults,
} from "@/components/UnifiedSearch/UnifiedSearch";
import { useUnifiedSearch } from "@/components/UnifiedSearch/useUnifiedSearch";
import { useAllSongs, useAllTags } from "@/hooks/queries/useSongQueries";
import supabase, { type AllSongs } from "@/utils/supabase";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
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
	const { leader } = useLeader();
	const filtersRef = useRef<HTMLDivElement>(null);
	const drag = useRef({
		active: false,
		startX: 0,
		startScroll: 0,
		moved: false,
	});

	// Molette verticale → défilement horizontal (desktop)
	useEffect(() => {
		const el = filtersRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);

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
					className="pb-2"
					left={
						<UnifiedSearchInput
							search={unifiedSearch}
							placeholder="Vite, une idée ..."
						/>
					}
				/>
				<div
					ref={filtersRef}
					className="flex flex-nowrap items-center w-0 min-w-full px-5 pb-4 overflow-x-auto overscroll-x-contain shadow-sm font-flame bg-jubilateBlue-500 dark:bg-slate-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0"
					data-testid="tag-filters"
					onPointerDown={(e) => {
						if (e.pointerType !== "mouse") return;
						drag.current = {
							active: true,
							startX: e.clientX,
							startScroll: e.currentTarget.scrollLeft,
							moved: false,
						};
					}}
					onPointerMove={(e) => {
						const d = drag.current;
						if (!d.active) return;
						const dx = e.clientX - d.startX;
						if (Math.abs(dx) > 5) d.moved = true;
						e.currentTarget.scrollLeft = d.startScroll - dx;
					}}
					onPointerUp={() => {
						drag.current.active = false;
					}}
					onPointerLeave={() => {
						drag.current.active = false;
					}}
					onClickCapture={(e) => {
						// évite de (dé)sélectionner un filtre à la fin d'un glissement
						if (drag.current.moved) {
							e.stopPropagation();
							e.preventDefault();
							drag.current.moved = false;
						}
					}}
				>
					{tags.map((tag) => (
						<TagChip
							key={tag.id}
							tag={tag}
							className="h-10"
							onClick={() => toggleTag(tag.id)}
							inverted={selectedTags.includes(tag.id)}
							outline
						/>
					))}
				</div>
			</div>
			{unifiedSearch.showResults ? (
				<UnifiedSearchResults
					search={unifiedSearch}
					onAskNewSong={askNewSong}
				/>
			) : (
				<div
					className="flex flex-col items-stretch px-2 divide-y dark:bg-gray-800 print:block print:p-0"
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
