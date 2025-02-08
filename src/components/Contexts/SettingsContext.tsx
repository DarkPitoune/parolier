import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const fontSizeAtom = atomWithStorage("settings.fontSize", 2);
export const showChordsAtom = atomWithStorage("settings.showChords", true);
export const addChorusAtom = atomWithStorage("settings.addChorus", false);
export const darkModeAtom = atomWithStorage("settings.darkMode", false);
export const usernameAtom = atomWithStorage(
	"settings.username",
	navigator.platform,
); // deprecated but idc
export const settingsOpenedAtom = atomWithStorage(
	"settings.settingsOpened",
	false,
);
export const tonalityAtom = atomWithStorage("settings.tonality", 0);

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
