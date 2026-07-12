import { filtersAtom } from "@/components/Contexts/SettingsContext";
import { type BibleVerse, useBible } from "@/hooks/queries/useBibleQueries";
import { useAllSetlists } from "@/hooks/queries/useSetlistQueries";
import {
	useAllOrdinaires,
	useAllRefrains,
	useAllSongs,
} from "@/hooks/queries/useSongQueries";
import { useAllTexts } from "@/hooks/queries/useTextQueries";
import { normalize } from "@/utils/normalize";
import type {
	AllOrdinaires,
	AllRefrains,
	AllSetlists,
	AllSongs,
	AllTexts,
} from "@/utils/supabase";
import Fuse from "fuse.js";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	MAX_RECENT,
	type RecentSearch,
	recentSearchesAtom,
} from "./recentSearchesAtoms";
import { unifiedSearchQueryAtom } from "./unifiedSearchAtoms";

export type Section =
	| "songs"
	| "refrains"
	| "texts"
	| "bible"
	| "setlists"
	| "ordinaires";

export const CANONICAL_SECTION_ORDER: Section[] = [
	"songs",
	"refrains",
	"texts",
	"bible",
	"setlists",
	"ordinaires",
];

export type SongRow = AllSongs[number];
export type RefrainRow = AllRefrains[number];
export type TextRow = AllTexts[number];
export type SetlistRow = AllSetlists[number];
export type OrdinaireRow = AllOrdinaires[number];

export interface UnifiedResults {
	songs: SongRow[];
	refrains: RefrainRow[];
	texts: TextRow[];
	bible: BibleVerse[];
	setlists: SetlistRow[];
	ordinaires: OrdinaireRow[];
}

export interface FlatResult {
	section: Section;
	href: string;
	key: string;
	label: string;
	sublabel?: string;
}

const SECTION_CAP = 5;
const BIBLE_MIN_CHARS = 3;
const BIBLE_DEBOUNCE_MS = 150;
const BIBLE_RESULT_CAP = 50;

const fuseOptions = <T>(keys: (keyof T & string)[]) => ({
	keys,
	threshold: 0.3,
	getFn: (obj: T, path: string | string[]) => {
		const k = Array.isArray(path) ? path[0] : path;
		const value = (obj as Record<string, unknown>)[k];
		return typeof value === "string" ? normalize(value) : "";
	},
});

const useDebouncedValue = <T>(value: T, delay: number): T => {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(t);
	}, [value, delay]);
	return debounced;
};

const scanBible = (
	books: ReturnType<typeof useBible>["data"],
	normalizedQuery: string,
): BibleVerse[] => {
	if (!books) return [];
	const results: BibleVerse[] = [];
	for (const book of books) {
		for (const [chapter, verses] of Object.entries(book.chapters)) {
			for (const [verseNum, text] of Object.entries(verses)) {
				if (normalize(text).includes(normalizedQuery)) {
					results.push({
						bookAbbr: book.abbr,
						bookName: book.name,
						chapter,
						verse: verseNum,
						text,
					});
					if (results.length >= BIBLE_RESULT_CAP) return results;
				}
			}
		}
	}
	return results;
};

export const useUnifiedSearch = (currentSection: Section) => {
	const [query, setQuery] = useAtom(unifiedSearchQueryAtom);
	const filters = useAtomValue(filtersAtom);
	const [focused, setFocused] = useState(false);
	const [recentSearches, setRecentSearches] = useAtom(recentSearchesAtom);

	const recordHit = useCallback(
		(hit: Omit<RecentSearch, "pickedAt">) => {
			setRecentSearches((prev) =>
				[
					{ ...hit, pickedAt: Date.now() },
					...prev.filter((r) => r.href !== hit.href),
				].slice(0, MAX_RECENT),
			);
		},
		[setRecentSearches],
	);

	const removeRecent = useCallback(
		(href: string) => {
			setRecentSearches((prev) => prev.filter((r) => r.href !== href));
		},
		[setRecentSearches],
	);

	const clearRecents = useCallback(() => {
		setRecentSearches([]);
	}, [setRecentSearches]);

	useEffect(
		() => () => {
			setQuery("");
		},
		[setQuery],
	);

	const { data: songsData } = useAllSongs();
	const { data: refrainsData } = useAllRefrains();
	const { data: textsData } = useAllTexts();
	const { data: setlistsData } = useAllSetlists();
	const { data: ordinairesData } = useAllOrdinaires();

	const debouncedQuery = useDebouncedValue(query, BIBLE_DEBOUNCE_MS);
	const bibleEligible = debouncedQuery.trim().length >= BIBLE_MIN_CHARS;
	const { data: bibleData } = useBible({ enabled: bibleEligible });

	const songsFuse = useMemo(
		() => new Fuse(songsData ?? [], fuseOptions<SongRow>(["title"])),
		[songsData],
	);
	const refrainsFuse = useMemo(
		() => new Fuse(refrainsData ?? [], fuseOptions<RefrainRow>(["title"])),
		[refrainsData],
	);
	const textsFuse = useMemo(
		() => new Fuse(textsData ?? [], fuseOptions<TextRow>(["title", "content"])),
		[textsData],
	);
	const ordinairesFuse = useMemo(
		() => new Fuse(ordinairesData ?? [], fuseOptions<OrdinaireRow>(["name"])),
		[ordinairesData],
	);

	const results = useMemo<UnifiedResults>(() => {
		const trimmed = query.trim();
		if (trimmed.length === 0) {
			return {
				songs: [],
				refrains: [],
				texts: [],
				bible: [],
				setlists: [],
				ordinaires: [],
			};
		}
		const isNumeric = /^\d+$/.test(trimmed);
		const numericId = isNumeric ? Number(trimmed) : null;
		const normalizedQuery = normalize(trimmed);

		const filterSongsByTag = (songs: SongRow[]) => {
			if (filters.length === 0) return songs;
			return songs.filter((song) =>
				song.tags.some(({ id }) => filters.includes(id)),
			);
		};

		const songs: SongRow[] =
			isNumeric && currentSection === "songs"
				? (() => {
						const found = (songsData ?? []).find((s) => s.id === numericId);
						return found ? [found] : [];
					})()
				: filterSongsByTag(
						songsFuse.search(normalizedQuery).map((h) => h.item),
					).slice(0, SECTION_CAP);

		const refrains: RefrainRow[] =
			isNumeric && currentSection === "refrains"
				? (() => {
						const found = (refrainsData ?? []).find((r) => r.id === numericId);
						return found ? [found] : [];
					})()
				: refrainsFuse
						.search(normalizedQuery)
						.map((h) => h.item)
						.slice(0, SECTION_CAP);

		const texts: TextRow[] =
			isNumeric && currentSection === "texts"
				? (() => {
						const found = (textsData ?? []).find((t) => t.id === numericId);
						return found ? [found] : [];
					})()
				: textsFuse
						.search(normalizedQuery)
						.map((h) => h.item)
						.slice(0, SECTION_CAP);

		const setlists: SetlistRow[] = isNumeric
			? []
			: (setlistsData ?? [])
					.filter((s) => normalize(s.name ?? "").includes(normalizedQuery))
					.slice(0, SECTION_CAP);

		const ordinaires: OrdinaireRow[] = isNumeric
			? []
			: ordinairesFuse
					.search(normalizedQuery)
					.map((h) => h.item)
					.slice(0, SECTION_CAP);

		const bible: BibleVerse[] =
			isNumeric || debouncedQuery.trim().length < BIBLE_MIN_CHARS
				? []
				: scanBible(bibleData, normalize(debouncedQuery.trim())).slice(
						0,
						SECTION_CAP,
					);

		return { songs, refrains, texts, bible, setlists, ordinaires };
	}, [
		query,
		debouncedQuery,
		filters,
		currentSection,
		songsData,
		refrainsData,
		textsData,
		setlistsData,
		bibleData,
		songsFuse,
		refrainsFuse,
		textsFuse,
		ordinairesFuse,
	]);

	const sectionOrder = useMemo<Section[]>(() => {
		const rest = CANONICAL_SECTION_ORDER.filter((s) => s !== currentSection);
		return [currentSection, ...rest].filter((s) => results[s].length > 0);
	}, [currentSection, results]);

	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset selection whenever query changes
	useEffect(() => {
		setSelectedIndex(null);
	}, [query]);

	const flatResults = useMemo<FlatResult[]>(() => {
		const flat: FlatResult[] = [];
		for (const section of sectionOrder) {
			if (section === "songs") {
				for (const song of results.songs) {
					flat.push({
						section,
						href: `/songs/${song.id}`,
						key: `song-${song.id}`,
						label: song.title,
						sublabel: `#${song.id}`,
					});
				}
			} else if (section === "refrains") {
				for (const refrain of results.refrains) {
					flat.push({
						section,
						href: `/songs/${refrain.id}`,
						key: `refrain-${refrain.id}`,
						label: refrain.title,
						sublabel: `#${refrain.id}`,
					});
				}
			} else if (section === "texts") {
				for (const text of results.texts) {
					flat.push({
						section,
						href: `/texts/${text.id}`,
						key: `text-${text.id}`,
						label: text.title,
						sublabel: `#${text.id}`,
					});
				}
			} else if (section === "bible") {
				for (const verse of results.bible) {
					flat.push({
						section,
						href: `/bible/${encodeURIComponent(verse.bookAbbr)}/${encodeURIComponent(verse.chapter)}#verse-${verse.verse}`,
						key: `bible-${verse.bookAbbr}-${verse.chapter}-${verse.verse}`,
						label: `${verse.bookName} ${verse.chapter}:${verse.verse}`,
					});
				}
			} else if (section === "setlists") {
				for (const setlist of results.setlists) {
					flat.push({
						section,
						href: `/setlists/${setlist.id}`,
						key: `setlist-${setlist.id}`,
						label: setlist.name ?? "",
					});
				}
			} else if (section === "ordinaires") {
				for (const ordinaire of results.ordinaires) {
					flat.push({
						section,
						href: `/ordinaires/${ordinaire.id}`,
						key: `ordinaire-${ordinaire.id}`,
						label: ordinaire.name ?? "",
					});
				}
			}
		}
		return flat;
	}, [results, sectionOrder]);

	const showResults =
		query.trim().length > 0 || (focused && recentSearches.length > 0);

	return {
		query,
		setQuery,
		results,
		sectionOrder,
		flatResults,
		selectedIndex,
		setSelectedIndex,
		focused,
		setFocused,
		showResults,
		recentSearches,
		recordHit,
		removeRecent,
		clearRecents,
	};
};

export type UnifiedSearchState = ReturnType<typeof useUnifiedSearch>;
