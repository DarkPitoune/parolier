import { DynamicText, SidePanel, useLeader } from "@/components";
import { filtersAtom } from "@/components/Contexts/SettingsContext";
import supabase, {
	type AllSongs,
	allSongsQuery,
	allTagsQuery,
	type Tags,
} from "@/utils/supabase";
import { ChevronUpIcon, MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import Fuse from "fuse.js";
import { useAtom } from "jotai";
import {
	type ChangeEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

function Index() {
	const [songs, setSongs] = useState<AllSongs>([]);
	const [filteredSongs, setFilteredSongs] = useState<AllSongs>([]);
	const [tags, setTags] = useState<Tags>([]);
	const [selectedTags, setSelectedTags] = useAtom<number[]>(filtersAtom);
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
		allSongsQuery().then(({ data }) => {
			if (data && data.length > 0) {
				data.sort((a, b) => a.id - b.id);
				setSongs(data);
				setFilteredSongs(data);
				fuse.setCollection(data);
			}
		});
		allTagsQuery().then(({ data }) => {
			if (data && data.length > 0) {
				data.sort((a, b) => a.id - b.id);
				setTags(data);
			}
		});
	}, [fuse.setCollection]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to scroll AFTER the songs are loaded in the DOM
	useEffect(() => {
		window.scroll({
			top: Number(sessionStorage.getItem("indexScroll") || "0"),
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

	const [searchValue, setSearchValue] = useState("");

	const search: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setSearchValue(event.target.value);
			if (event.target.value.length === 0) setFilteredSongs(songs);
			else {
				window.scrollTo(0, 0);
				if (!Number.isNaN(Number(event.target.value))) {
					const song = songs.find((s) => s.id === Number(event.target.value));
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
		<div className="bg-white dark:bg-gray-800">
			<SidePanel />
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
							className="w-full h-9 rounded-full px-2 outline-none bg-white dark:bg-white text-black dark:text-black"
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
										dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
										style={{
											fill: selectedTags.includes(tag.id)
												? "white"
												: tag.color || "black",
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
						className="px-2 py-4 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700 flex items-stretch gap-3 text-black dark:text-jubilateBlue-400"
						key={song.id}
						to={`/songs/${song.id}`}
					>
						<div className="w-10 justify-center border-r font-bold flex items-center">
							{song.id}
						</div>
						<DynamicText
							className="grow text-black dark:text-white"
							text={song.title}
						/>
						<div className="flex gap-2">
							{song.tags.map((tag) => (
								<div
									style={{ fill: tag.color || "black" }}
									className="size-6 "
									key={tag.id}
									// biome-ignore lint/security/noDangerouslySetInnerHtml: svg is in database
									dangerouslySetInnerHTML={{ __html: tag.svg || "" }}
								/>
							))}
						</div>
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
