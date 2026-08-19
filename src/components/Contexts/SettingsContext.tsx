import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const fontSizeAtom = atomWithStorage("settings.fontSize", 2);
export const showChordsAtom = atomWithStorage("settings.showChords", true);
export const addChorusAtom = atomWithStorage("settings.addChorus", false);

// True is : I want to see the "notes de jeu" (how to play, not what to sing).
// getOnInit avoids a first frame without notes for someone who has them on —
// same reason slideHelpAtom below uses it.
export const showPerformanceNotesAtom = atomWithStorage(
	"settings.showPerformanceNotes",
	false,
	createJSONStorage(() => localStorage),
	{ getOnInit: true },
);
export const globalSearchEnabledAtom = atomWithStorage(
	"globalSearchEnabled",
	false,
);
export type ThemeMode = "system" | "dark" | "light";
export const themeModeAtom = atomWithStorage<ThemeMode>(
	"settings.themeMode",
	"system",
);

const systemPrefersDarkAtom = atom(
	typeof window !== "undefined"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
		: false,
);

export { systemPrefersDarkAtom };

export const isDarkAtom = atom((get) => {
	const mode = get(themeModeAtom);
	if (mode === "dark") return true;
	if (mode === "light") return false;
	return get(systemPrefersDarkAtom);
});

export const tonalityAtom = atom(0);

// True is : I want to see the slide help
export const slideHelpAtom = atomWithStorage(
	"help.slide",
	true,
	// using a custom storage to avoid the flash of the help
	createJSONStorage(() => localStorage),
	{
		getOnInit: true,
	},
);

// True is : I want to see the song editor help
export const songEditorHelpOpen = atomWithStorage("help.songEditor", true);

export const filtersAtom = atomWithStorage<number[]>(
	"filters",
	[],
	createJSONStorage(() => sessionStorage),
);

export const tagTabOpenAtom = atomWithStorage(
	"tagTabOpen",
	false,
	createJSONStorage(() => sessionStorage),
);
