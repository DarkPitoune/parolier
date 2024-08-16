import { ChevronUpIcon, MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import Fuse from "fuse.js";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Link } from "react-router-dom";
import type { Tag, TaggedSong } from "./assets/types";
import DynamicText from "./components/DynamicText";
import { useLeader } from "./components/LeaderContext";
import supabase from "./utils/supabase";

function Index() {
	const [songs, setSongs] = useState<Omit<TaggedSong, "strophes">[]>([]);
	const [filteredSongs, setFilteredSongs] = useState<
		Omit<TaggedSong, "strophes">[]
	>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [selectedTags, setSelectedTags] = useState<number[]>([]);
	const [tagTabOpen, setTagTabOpen] = useState(false);
	const fuse = useMemo(() => new Fuse(songs, { keys: ["title"] }), [songs]);
	const { leader } = useLeader();

	const toggleTag = (id: number) => {
		setSelectedTags((oldTags) => {
			if (!oldTags.includes(id)) return oldTags.concat([id]);
			return oldTags.filter((tagId) => tagId !== id);
		});
	};

	useEffect(() => {
		supabase
			.from("songs")
			.select("title, id, tags (id, name, svg, color)")
			.then(({ data }) => {
				if (data && data.length > 0) {
					data.sort((a, b) => a.id - b.id);
					setSongs(data);
					setFilteredSongs(data);
					fuse.setCollection(data);
				}
			});
		supabase
			.from("tags")
			.select()
			.then(({ data }) => {
				if (data && data.length > 0) {
					data.sort((a, b) => a.id - b.id);
					setTags(data);
				}
			});
	}, [fuse.setCollection]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to scroll AFTER the songs are loaded in the DOM
	useEffect(() => {
		window.scroll({
			top: Number.parseInt(sessionStorage.getItem("indexScroll") || "0"),
		});
	}, [songs]);

	useEffect(() => {
		const setScrollY = () =>
			sessionStorage.setItem("indexScroll", window.scrollY.toString());
		window.addEventListener("scroll", setScrollY);
		return () => {
			window.removeEventListener("scroll", setScrollY);
		};
	}, []);

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			if (event.target.value.length === 0) setFilteredSongs(songs);
			else {
				window.scrollTo(0, 0);
				if (!Number.isNaN(Number.parseInt(event.target.value))) {
					const song = songs.find(
						(s) => s.id === Number.parseInt(event.target.value),
					);
					setFilteredSongs(song ? [song] : []);
				} else {
					setFilteredSongs(
						fuse.search(event.target.value).map((hit) => hit.item),
					);
				}
			}
		},
		[fuse, songs],
	);

	const isCorrectTag = (song: Omit<TaggedSong, "strophes">) => {
		if (selectedTags.length === 0) return true;
		return song.tags.some(({ id }) => selectedTags.includes(id));
	};

	return (
		<div className="bg-white dark:bg-gray-800">
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800",
					leader ? "top-6" : "top-0",
				)}
			>
				<div className="bg-jubilateBlue-500 dark:bg-slate-900 px-6 py-4 gap-4 flex justify-between items-center">
					<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
						<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						<input
							className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white"
							type="search"
							onChange={search}
							placeholder="Vite, une idée..."
						/>
					</div>
					<img className="h-12" src="/svg/logo.svg" alt="Logo" />
				</div>
				<div className="px-6 py-2 flex flex-col items-stretch shadow font-flame">
					<button
						className="flex gap-2 text-jubilateBlue-500 dark:text-jubilateBlue-400 items-center"
						onClick={() => setTagTabOpen((v) => !v)}
						type="button"
					>
						<ChevronUpIcon
							data-tabopen={tagTabOpen}
							className="size-10 data-[tabopen=false]:rotate-180 transition"
						/>
						<h3 className="text-2xl font-bold">Filtres</h3>
						{selectedTags.length > 0 && (
							<div className="bg-jubilateBlue-500 rounded-full text-white font-bold w-6">
								{selectedTags.length}
							</div>
						)}
					</button>
					<div>
						{tagTabOpen &&
							tags.map((tag) => (
								<button
									onClick={() => toggleTag(tag.id)}
									key={tag.id}
									aria-checked={selectedTags.includes(tag.id)}
									type="button"
									className={clsx(
										"rounded-full border-2 font-semibold px-3 py-0.5 inline-flex items-center gap-2 m-1",
										selectedTags.includes(tag.id)
											? "text-white bg-[var(--tag-color)] border-[var(--tag-color)]"
											: "text-[var(--tag-color)] bg-transparent border-[var(--tag-color)] border-2",
									)}
									style={{ "--tag-color": tag.color } as React.CSSProperties}
								>
									<div
										// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
										dangerouslySetInnerHTML={{ __html: tag.svg }}
										style={{
											fill: selectedTags.includes(tag.id) ? "white" : tag.color,
										}}
										className="w-4 h-4"
									/>
									{tag.name}
								</button>
							))}
					</div>
				</div>
			</div>

			<div className="flex flex-col items-stretch px-2 divide-y divide-jubilateBlue-300 dark:bg-gray-800">
				{filteredSongs.filter(isCorrectTag).map((song) => (
					<Link
						className="px-2 py-4 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-baseline gap-3 text-black dark:text-jubilateBlue-400"
						key={song.id}
						to={`/songs/${song.id}`}
					>
						<div className="w-10 text-center border-r font-bold">{song.id}</div>
						<DynamicText
							className="grow text-black dark:text-white"
							text={song.title}
						/>
						<div className="flex gap-2">
							{song.tags.map((tag) => (
								<div
									style={{ fill: tag.color }}
									className="size-6 "
									key={tag.id}
									// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
									dangerouslySetInnerHTML={{ __html: tag.svg }}
								/>
							))}
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}

export { Index };
