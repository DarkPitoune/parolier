import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

/**
 * Positions in the `fontSizeTailwind` scale of DynamicText. They stay put even
 * though the steps between them are now unreachable: the stored number is an
 * index into that scale, so renumbering would resize every existing reader.
 */
export const FONT_SIZES = [2, 5, 8] as const;
export type FontSize = (typeof FONT_SIZES)[number];
export const DEFAULT_FONT_SIZE: FontSize = 2;

// getOnInit spares everyone who is not on Normal a first frame at the wrong
// size — the steps are far enough apart that the reflow is impossible to miss.
const storedFontSizeAtom = atomWithStorage<number>(
	"settings.fontSize",
	DEFAULT_FONT_SIZE,
	createJSONStorage(() => localStorage),
	{ getOnInit: true },
);

function nearestFontSize(stored: number): FontSize {
	return FONT_SIZES.reduce((closest, size) =>
		Math.abs(size - stored) < Math.abs(closest - stored) ? size : closest,
	);
}

// Reads snap: builds before the three-step picker stored any position from 0 to 9.
export const fontSizeAtom = atom(
	(get) => nearestFontSize(get(storedFontSizeAtom)),
	(_get, set, size: FontSize) => set(storedFontSizeAtom, size),
);
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
