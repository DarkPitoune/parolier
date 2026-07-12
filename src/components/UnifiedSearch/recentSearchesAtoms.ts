import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { Section } from "./useUnifiedSearch";

export interface RecentSearch {
	section: Section;
	href: string;
	label: string;
	sublabel?: string;
	pickedAt: number;
}

export const MAX_RECENT = 8;

export const recentSearchesAtom = atomWithStorage<RecentSearch[]>(
	"recentSearches",
	[],
	createJSONStorage(() => localStorage),
	{ getOnInit: true },
);
