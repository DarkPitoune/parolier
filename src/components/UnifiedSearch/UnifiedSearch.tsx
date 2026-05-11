import { MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import {
	type ChangeEventHandler,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { type Section, useUnifiedSearch } from "./useUnifiedSearch";

const SECTION_LABEL: Record<Section, string> = {
	songs: "Chants",
	refrains: "Refrains",
	texts: "Textes",
	bible: "Bible",
	setlists: "Setlists",
};

interface UnifiedSearchProps {
	currentSection: Section;
	placeholder?: string;
}

export function UnifiedSearch({
	currentSection,
	placeholder = "Rechercher...",
}: UnifiedSearchProps) {
	const { query, setQuery, results, sectionOrder, flatResults } =
		useUnifiedSearch(currentSection);
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset selection whenever the query changes
	useEffect(() => {
		setSelectedIndex(null);
	}, [query]);

	useEffect(() => {
		if (selectedIndex !== null && selectedIndex >= flatResults.length) {
			setSelectedIndex(
				flatResults.length === 0 ? null : flatResults.length - 1,
			);
		}
	}, [flatResults.length, selectedIndex]);

	const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			setQuery(e.target.value);
			setIsOpen(true);
		},
		[setQuery],
	);

	const goTo = useCallback(
		(href: string) => {
			setQuery("");
			setIsOpen(false);
			setSelectedIndex(null);
			inputRef.current?.blur();
			navigate(href);
			const hashIndex = href.indexOf("#");
			if (hashIndex !== -1) {
				const id = href.slice(hashIndex + 1);
				// Destination page mounts and renders the anchor in a later effect;
				// give it a tick before we scroll.
				setTimeout(() => {
					document
						.getElementById(id)
						?.scrollIntoView({ block: "center", behavior: "smooth" });
				}, 150);
			}
		},
		[navigate, setQuery],
	);

	const onKeyDown = useCallback(
		(e: ReactKeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setQuery("");
				setIsOpen(false);
				setSelectedIndex(null);
				inputRef.current?.blur();
				return;
			}
			if (flatResults.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev === null ? 0 : Math.min(flatResults.length - 1, prev + 1),
				);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => (prev === null ? 0 : Math.max(0, prev - 1)));
			} else if (e.key === "Enter") {
				e.preventDefault();
				const target = flatResults[selectedIndex ?? 0];
				if (target) goTo(target.href);
			}
		},
		[flatResults, selectedIndex, goTo, setQuery],
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

	const containerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!isOpen) return;
		const handler = (e: MouseEvent) => {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [isOpen]);

	const showDropdown = isOpen && query.trim().length > 0;

	const flatIndexBySection = useMemo(() => {
		const map = new Map<string, number>();
		flatResults.forEach((r, idx) => map.set(r.key, idx));
		return map;
	}, [flatResults]);

	const isSelected = (key: string) => {
		const idx = flatIndexBySection.get(key);
		return idx !== undefined && idx === selectedIndex;
	};

	return (
		<div ref={containerRef} className="relative flex-1">
			<div className="flex bg-white flex-1 rounded-full pl-2 gap-1 items-center">
				<MagnifyingGlassIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
				<input
					ref={inputRef}
					className="w-full h-9 rounded-full px-2 outline-hidden bg-white dark:bg-white text-black dark:text-black"
					type="search"
					value={query}
					onChange={onChange}
					onFocus={() => setIsOpen(true)}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
				/>
			</div>
			{showDropdown && (
				<div className="absolute left-0 right-0 top-full mt-1 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl z-20 border border-jubilateBlue-200 dark:border-slate-700">
					{sectionOrder.length === 0 && (
						<div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
							Aucun résultat
						</div>
					)}
					{sectionOrder.map((section) => (
						<div key={section} className="py-1">
							<h3 className="sticky top-0 px-3 py-1 text-xs font-bold uppercase tracking-wide text-jubilateBlue-500 dark:text-jubilateBlue-400 bg-white dark:bg-gray-800">
								{SECTION_LABEL[section]}
							</h3>
							{section === "songs" &&
								results.songs.map((song) => {
									const key = `song-${song.id}`;
									return (
										<Link
											key={key}
											to={`/songs/${song.id}`}
											onClick={() => goTo(`/songs/${song.id}`)}
											className={clsx(
												"block px-4 py-2 text-sm text-black dark:text-white",
												isSelected(key)
													? "bg-jubilateBlue-100 dark:bg-slate-700"
													: "hover:bg-gray-100 dark:hover:bg-slate-700",
											)}
										>
											<span className="text-gray-500 dark:text-gray-400 mr-2">
												#{song.id}
											</span>
											{song.title}
										</Link>
									);
								})}
							{section === "refrains" &&
								results.refrains.map((refrain) => {
									const key = `refrain-${refrain.id}`;
									return (
										<Link
											key={key}
											to={`/songs/${refrain.id}`}
											onClick={() => goTo(`/songs/${refrain.id}`)}
											className={clsx(
												"block px-4 py-2 text-sm text-black dark:text-white",
												isSelected(key)
													? "bg-jubilateBlue-100 dark:bg-slate-700"
													: "hover:bg-gray-100 dark:hover:bg-slate-700",
											)}
										>
											<span className="text-gray-500 dark:text-gray-400 mr-2">
												#{refrain.id}
											</span>
											{refrain.title}
										</Link>
									);
								})}
							{section === "texts" &&
								results.texts.map((text) => {
									const key = `text-${text.id}`;
									return (
										<Link
											key={key}
											to={`/texts/${text.id}`}
											onClick={() => goTo(`/texts/${text.id}`)}
											className={clsx(
												"block px-4 py-2 text-sm text-black dark:text-white",
												isSelected(key)
													? "bg-jubilateBlue-100 dark:bg-slate-700"
													: "hover:bg-gray-100 dark:hover:bg-slate-700",
											)}
										>
											<span className="text-gray-500 dark:text-gray-400 mr-2">
												#{text.id}
											</span>
											{text.title}
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
											onClick={() => goTo(href)}
											className={clsx(
												"block px-4 py-2 text-sm",
												isSelected(key)
													? "bg-jubilateBlue-100 dark:bg-slate-700"
													: "hover:bg-gray-100 dark:hover:bg-slate-700",
											)}
										>
											<span className="font-semibold text-jubilateBlue-600 dark:text-jubilateBlue-400 mr-2">
												{verse.bookName} {verse.chapter}:{verse.verse}
											</span>
											<span className="text-gray-700 dark:text-gray-200 line-clamp-2">
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
											onClick={() => goTo(`/setlists/${setlist.id}`)}
											className={clsx(
												"block px-4 py-2 text-sm text-black dark:text-white",
												isSelected(key)
													? "bg-jubilateBlue-100 dark:bg-slate-700"
													: "hover:bg-gray-100 dark:hover:bg-slate-700",
											)}
										>
											{setlist.name}
										</Link>
									);
								})}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
