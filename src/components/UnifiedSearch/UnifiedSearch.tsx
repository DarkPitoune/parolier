import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import {
	type ChangeEventHandler,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Section, UnifiedSearchState } from "./useUnifiedSearch";

const SECTION_LABEL: Record<Section, string> = {
	songs: "Chants",
	refrains: "Refrains",
	texts: "Textes",
	bible: "Bible",
	setlists: "Setlists",
};

interface UnifiedSearchInputProps {
	search: UnifiedSearchState;
	placeholder?: string;
}

export function UnifiedSearchInput({
	search,
	placeholder = "Rechercher...",
}: UnifiedSearchInputProps) {
	const { query, setQuery, flatResults, selectedIndex, setSelectedIndex } =
		search;
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);

	const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			setQuery(e.target.value);
		},
		[setQuery],
	);

	const goTo = useCallback(
		(href: string) => {
			setQuery("");
			setSelectedIndex(null);
			inputRef.current?.blur();
			navigate(href);
			const hashIndex = href.indexOf("#");
			if (hashIndex !== -1) {
				const id = href.slice(hashIndex + 1);
				setTimeout(() => {
					document
						.getElementById(id)
						?.scrollIntoView({ block: "center", behavior: "smooth" });
				}, 150);
			}
		},
		[navigate, setQuery, setSelectedIndex],
	);

	const onKeyDown = useCallback(
		(e: ReactKeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setQuery("");
				setSelectedIndex(null);
				inputRef.current?.blur();
				return;
			}
			if (flatResults.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex(
					selectedIndex === null
						? 0
						: Math.min(flatResults.length - 1, selectedIndex + 1),
				);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex(
					selectedIndex === null ? 0 : Math.max(0, selectedIndex - 1),
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				const target = flatResults[selectedIndex ?? 0];
				if (target) goTo(target.href);
			}
		},
		[flatResults, selectedIndex, setSelectedIndex, goTo, setQuery],
	);

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.key.length !== 1 || !/[a-zA-Z]/.test(event.key)) return;
			if (event.ctrlKey || event.metaKey || event.altKey) return;
			const active = document.activeElement as HTMLElement | null;
			if (active === inputRef.current) return;
			const tag = active?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || active?.isContentEditable)
				return;
			inputRef.current?.focus();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	return (
		<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
			<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
			<input
				ref={inputRef}
				className="w-full h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
				type="search"
				value={query}
				onChange={onChange}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
			/>
		</div>
	);
}

interface UnifiedSearchResultsProps {
	search: UnifiedSearchState;
	onAskNewSong?: (query: string) => void;
	onCreateRefrain?: (query: string) => void;
}

export function UnifiedSearchResults({
	search,
	onAskNewSong,
	onCreateRefrain,
}: UnifiedSearchResultsProps) {
	const { query, setQuery, results, sectionOrder, flatResults, selectedIndex } =
		search;
	const navigate = useNavigate();

	const goTo = useCallback(
		(href: string) => {
			setQuery("");
			navigate(href);
			const hashIndex = href.indexOf("#");
			if (hashIndex !== -1) {
				const id = href.slice(hashIndex + 1);
				setTimeout(() => {
					document
						.getElementById(id)
						?.scrollIntoView({ block: "center", behavior: "smooth" });
				}, 150);
			}
		},
		[navigate, setQuery],
	);

	const flatIndexByKey = useMemo(() => {
		const map = new Map<string, number>();
		flatResults.forEach((r, idx) => map.set(r.key, idx));
		return map;
	}, [flatResults]);

	const isSelected = (key: string) => {
		const idx = flatIndexByKey.get(key);
		return idx !== undefined && idx === selectedIndex;
	};

	const trimmedQuery = query.trim();
	const anyResults = sectionOrder.length > 0;

	if (!anyResults && trimmedQuery.length === 0) return null;

	return (
		<div className="flex flex-col divide-y divide-jubilateBlue-200 dark:divide-slate-700">
			{!anyResults && (
				<div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
					Aucun résultat pour "{trimmedQuery}"
				</div>
			)}
			{sectionOrder.map((section) => (
				<section key={section} className="py-2">
					<h2 className="px-6 py-2 text-sm font-bold uppercase tracking-wide text-jubilateBlue-500 dark:text-jubilateBlue-400">
						{SECTION_LABEL[section]}
					</h2>
					{section === "songs" &&
						results.songs.map((song) => {
							const key = `song-${song.id}`;
							return (
								<Link
									key={key}
									to={`/songs/${song.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/songs/${song.id}`);
									}}
									className={clsx(
										"flex items-baseline gap-3 px-6 py-2 text-base text-black dark:text-white",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									<span className="text-gray-500 dark:text-gray-400 text-sm w-10 shrink-0">
										#{song.id}
									</span>
									<span>{song.title}</span>
								</Link>
							);
						})}
					{section === "songs" && onAskNewSong && trimmedQuery.length > 0 && (
						<button
							type="button"
							onClick={() => onAskNewSong(trimmedQuery)}
							className="w-full text-left px-6 py-3 text-jubilateBlue-600 dark:text-jubilateBlue-400 hover:bg-jubilateBlue-50 dark:hover:bg-slate-700"
						>
							Demander l'ajout de <b>"{trimmedQuery}"</b> →
						</button>
					)}
					{section === "refrains" &&
						results.refrains.map((refrain) => {
							const key = `refrain-${refrain.id}`;
							return (
								<Link
									key={key}
									to={`/songs/${refrain.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/songs/${refrain.id}`);
									}}
									className={clsx(
										"flex items-baseline gap-3 px-6 py-2 text-base text-black dark:text-white",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									<span className="text-gray-500 dark:text-gray-400 text-sm w-10 shrink-0">
										#{refrain.id}
									</span>
									<span>{refrain.title}</span>
								</Link>
							);
						})}
					{section === "refrains" &&
						onCreateRefrain &&
						trimmedQuery.length > 0 && (
							<button
								type="button"
								onClick={() => onCreateRefrain(trimmedQuery)}
								className="w-full text-left px-6 py-3 text-jubilateBlue-600 dark:text-jubilateBlue-400 hover:bg-jubilateBlue-50 dark:hover:bg-slate-700"
							>
								Nouveau refrain "{trimmedQuery}" →
							</button>
						)}
					{section === "texts" &&
						results.texts.map((text) => {
							const key = `text-${text.id}`;
							return (
								<Link
									key={key}
									to={`/texts/${text.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/texts/${text.id}`);
									}}
									className={clsx(
										"flex items-baseline gap-3 px-6 py-2 text-base text-black dark:text-white",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									<span className="text-gray-500 dark:text-gray-400 text-sm w-10 shrink-0">
										#{text.id}
									</span>
									<span>{text.title}</span>
								</Link>
							);
						})}
					{section === "bible" &&
						results.bible.map((verse) => {
							const key = `bible-${verse.bookAbbr}-${verse.chapter}-${verse.verse}`;
							const href = `/bible/${encodeURIComponent(verse.bookAbbr)}/${encodeURIComponent(verse.chapter)}#verse-${verse.verse}`;
							return (
								<Link
									key={key}
									to={href}
									onClick={(e) => {
										e.preventDefault();
										goTo(href);
									}}
									className={clsx(
										"block px-6 py-2 text-base",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									<span className="font-semibold text-jubilateBlue-600 dark:text-jubilateBlue-400 mr-2">
										{verse.bookName} {verse.chapter}:{verse.verse}
									</span>
									<span className="text-gray-700 dark:text-gray-200">
										{verse.text}
									</span>
								</Link>
							);
						})}
					{section === "setlists" &&
						results.setlists.map((setlist) => {
							const key = `setlist-${setlist.id}`;
							return (
								<Link
									key={key}
									to={`/setlists/${setlist.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/setlists/${setlist.id}`);
									}}
									className={clsx(
										"block px-6 py-2 text-base text-black dark:text-white",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									{setlist.name}
								</Link>
							);
						})}
				</section>
			))}
		</div>
	);
}
