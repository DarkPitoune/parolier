import type { Strophe } from "@/assets/types";
import type { TaggedSong } from "@/utils/supabase";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import {
	addChorusAtom,
	showPerformanceNotesAtom,
} from "./Contexts/SettingsContext";
import { SongViewer } from "./SongViewer";

const strophe = (text: string, over: Partial<Strophe> = {}): Strophe =>
	({
		content: [{ text, chords: "Em" }],
		type: "verse",
		repetition: false,
		...over,
	}) as Strophe;

// chorus, couplet 1, chorus (repetition), couplet 2 — the shape of song 104.
const strophes: Strophe[] = [
	strophe("Tu es là présent", { type: "chorus" }),
	strophe("Couplet 1"),
	strophe("Tu es là présent", { type: "chorus", repetition: true }),
	strophe("Couplet 2"),
];

const makeSong = (over: Partial<TaggedSong> = {}) =>
	({
		id: 104,
		title: "Tu fais ta demeure en nous",
		strophes,
		tags: [],
		type: "song",
		...over,
	}) as TaggedSong;

function renderViewer(
	ui: React.ReactElement,
	{ showNotes = false, addChorus = false } = {},
) {
	const store = createStore();
	store.set(showPerformanceNotesAtom, showNotes);
	store.set(addChorusAtom, addChorus);
	// test-utils mounts a bare Jotai provider, so the atom has to be seeded here.
	return render(<Provider store={store}>{ui}</Provider>);
}

const longPress = (text: string) => {
	fireEvent.pointerDown(screen.getByText(text), {
		pointerType: "touch",
		clientX: 0,
		clientY: 0,
		button: 0,
	});
	act(() => {
		vi.advanceTimersByTime(500);
	});
};

describe("SongViewer notes", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("renders no note when the setting is off", () => {
		const song = makeSong({
			strophes: [
				{ ...strophes[0], note: { who: ["🥁"], how: [] } } as Strophe,
				...strophes.slice(1),
			],
		});
		renderViewer(<SongViewer song={song} />, { showNotes: false });

		expect(screen.queryByTestId("performance-note")).toBeNull();
	});

	it("renders the note when the setting is on", () => {
		const song = makeSong({
			strophes: [
				{
					...strophes[0],
					note: { who: ["🥁"], how: [], text: "on installe" },
				} as Strophe,
				...strophes.slice(1),
			],
		});
		renderViewer(<SongViewer song={song} />, { showNotes: true });

		expect(screen.getByTestId("performance-note")).toBeTruthy();
		expect(screen.getByText("on installe")).toBeTruthy();
	});

	it("brings back an annotated repetition with Refrains off, and marks it", () => {
		const song = makeSong({
			strophes: [
				...strophes.slice(0, 2),
				{ ...strophes[2], note: { who: ["🥁"], how: ["🔥"] } } as Strophe,
				strophes[3],
			],
		});
		renderViewer(<SongViewer song={song} />, { showNotes: true });

		expect(screen.getByText("refrain 2 · affiché car annoté")).toBeTruthy();
	});

	it("reports the ORIGINAL index when a repetition above is hidden", () => {
		// The regression that would silently annotate the wrong strophe: with
		// Refrains off, "Couplet 2" is the 3rd strophe on screen but the 4th in
		// the data.
		const onStropheLongPress = vi.fn();
		renderViewer(
			<SongViewer song={makeSong()} onStropheLongPress={onStropheLongPress} />,
		);

		longPress("Couplet 2");

		expect(onStropheLongPress).toHaveBeenCalledWith(3);
	});

	it("does nothing on long press when no handler is passed", () => {
		renderViewer(<SongViewer song={makeSong()} />);
		expect(() => longPress("Couplet 2")).not.toThrow();
	});
});
