import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const fontSizeAtom = atomWithStorage("settings.fontSize", 2);
export const showChordsAtom = atomWithStorage("settings.showChords", true);
export const addChorusAtom = atomWithStorage("settings.addChorus", false);
export const darkModeAtom = atomWithStorage("settings.darkMode", false);

export const settingsOpenAtom = atom(false);

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
