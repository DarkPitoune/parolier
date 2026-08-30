import {
	BookOpenIcon,
	DocumentTextIcon,
	MagnifyingGlassIcon,
	MusicalNoteIcon,
	QueueListIcon,
	RectangleGroupIcon,
	XMarkIcon,
} from "@heroicons/react/16/solid";
import clsx from "clsx";
import {
	type ChangeEventHandler,
	type ComponentType,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RecentSearch } from "./recentSearchesAtoms";
import type { Section, UnifiedSearchState } from "./useUnifiedSearch";

const SECTION_LABEL: Record<Section, string> = {
	songs: "Chants",
	refrains: "Refrains",
	texts: "Textes",
	bible: "Bible",
	setlists: "Setlists",
	ordinaires: "Ordinaires de messe",
};

const SECTION_ICON: Record<Section, ComponentType<{ className?: string }>> = {
	songs: MusicalNoteIcon,
	refrains: MusicalNoteIcon,
	texts: DocumentTextIcon,
	bible: BookOpenIcon,
	setlists: QueueListIcon,
	ordinaires: RectangleGroupIcon,
};

interface UnifiedSearchInputProps {
	search: UnifiedSearchState;
	placeholder?: string;
}

export function UnifiedSearchInput({
	search,
	placeholder = "Rechercher...",
}: UnifiedSearchInputProps) {
	const {
		query,
		setQuery,
		flatResults,
		selectedIndex,
		setSelectedIndex,
		setFocused,
		recordHit,
	} = search;
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);

	const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			setQuery(e.target.value);
		},
		[setQuery],
	);

	const goTo = useCallback(
		(href: string, hit?: Omit<RecentSearch, "pickedAt">) => {
			if (hit) recordHit(hit);
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
		[navigate, setQuery, setSelectedIndex, recordHit],
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
				if (target)
					goTo(target.href, {
						section: target.section,
						href: target.href,
						label: target.label,
						sublabel: target.sublabel,
					});
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
				onFocus={() => setFocused(true)}
				onBlur={() => setTimeout(() => setFocused(false), 150)}
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
	const {
		query,
		setQuery,
		results,
		sectionOrder,
		flatResults,
		selectedIndex,
		recentSearches,
		recordHit,
		removeRecent,
		clearRecents,
	} = search;
	const navigate = useNavigate();

	const goTo = useCallback(
		(href: string, hit?: Omit<RecentSearch, "pickedAt">) => {
			if (hit) recordHit(hit);
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
		[navigate, setQuery, recordHit],
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

	if (trimmedQuery.length === 0) {
		if (recentSearches.length === 0) return null;
		return (
			<div className="flex flex-col">
				<div className="flex items-center justify-between px-6 py-2">
					<h2 className="text-sm font-bold uppercase tracking-wide text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Recherches récentes
					</h2>
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={clearRecents}
						className="text-sm text-gray-500 dark:text-gray-400 hover:text-jubilateBlue-600 dark:hover:text-jubilateBlue-400"
					>
						Effacer
					</button>
				</div>
				{recentSearches.map((hit) => {
					const Icon = SECTION_ICON[hit.section];
					return (
						<div
							key={hit.href}
							className="group flex items-center hover:bg-gray-100 dark:hover:bg-slate-700"
						>
							<Link
								to={hit.href}
								onMouseDown={(e) => e.preventDefault()}
								onClick={(e) => {
									e.preventDefault();
									goTo(hit.href, {
										section: hit.section,
										href: hit.href,
										label: hit.label,
										sublabel: hit.sublabel,
									});
								}}
								className="flex flex-1 items-center gap-3 px-6 py-2 text-base text-black dark:text-white min-w-0"
							>
								<Icon className="w-5 shrink-0 fill-gray-400 dark:fill-gray-500" />
								<span className="truncate">{hit.label}</span>
								{hit.sublabel && (
									<span className="text-gray-500 dark:text-gray-400 text-sm shrink-0">
										{hit.sublabel}
									</span>
								)}
							</Link>
							<button
								type="button"
								aria-label={`Retirer ${hit.label}`}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => removeRecent(hit.href)}
								className="px-4 py-2 text-gray-400 hover:text-jubilateBlue-600 dark:hover:text-jubilateBlue-400"
							>
								<XMarkIcon className="w-5" />
							</button>
						</div>
					);
				})}
			</div>
		);
	}

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
									data-testid={`song-link-${song.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/songs/${song.id}`, {
											section: "songs",
											href: `/songs/${song.id}`,
											label: song.title,
											sublabel: `#${song.id}`,
										});
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
										goTo(`/songs/${refrain.id}`, {
											section: "refrains",
											href: `/songs/${refrain.id}`,
											label: refrain.title,
											sublabel: `#${refrain.id}`,
										});
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
										goTo(`/texts/${text.id}`, {
											section: "texts",
											href: `/texts/${text.id}`,
											label: text.title,
											sublabel: `#${text.id}`,
										});
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
										goTo(href, {
											section: "bible",
											href,
											label: `${verse.bookName} ${verse.chapter}:${verse.verse}`,
										});
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
										goTo(`/setlists/${setlist.id}`, {
											section: "setlists",
											href: `/setlists/${setlist.id}`,
											label: setlist.name ?? "",
										});
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
					{section === "ordinaires" &&
						results.ordinaires.map((ordinaire) => {
							const key = `ordinaire-${ordinaire.id}`;
							return (
								<Link
									key={key}
									to={`/ordinaires/${ordinaire.id}`}
									onClick={(e) => {
										e.preventDefault();
										goTo(`/ordinaires/${ordinaire.id}`, {
											section: "ordinaires",
											href: `/ordinaires/${ordinaire.id}`,
											label: ordinaire.name ?? "",
										});
									}}
									className={clsx(
										"block px-6 py-2 text-base text-black dark:text-white",
										isSelected(key)
											? "bg-jubilateBlue-100 dark:bg-slate-700"
											: "hover:bg-gray-100 dark:hover:bg-slate-700",
									)}
								>
									{ordinaire.name}
								</Link>
							);
						})}
				</section>
			))}
		</div>
	);
}
