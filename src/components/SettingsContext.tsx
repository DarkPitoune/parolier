import { atomWithStorage } from "jotai/utils";

export const fontSizeAtom = atomWithStorage("settings.fontSize", 2);
export const showChordsAtom = atomWithStorage("settings.showChords", true);
export const addChorusAtom = atomWithStorage("settings.addChorus", false);
export const darkModeAtom = atomWithStorage("settings.darkMode", false);
export const usernameAtom = atomWithStorage(
	"settings.username",
	navigator.platform,
); // deprecated but idc
