import type { Strophe, StropheNote } from "@/assets/types";

export type StropheKind = "verse" | "chorus" | "bridge";

const KIND_LABELS: Record<StropheKind, string> = {
	verse: "couplet",
	chorus: "refrain",
	bridge: "pont",
};

/**
 * Real rows often carry neither `type` nor `repetition` — `newSongMutation`
 * inserts strophes with only `content`. The declared union overstates the data,
 * so every read here normalises defensively rather than trusting the type.
 */
function stropheKind(strophe: Strophe): StropheKind {
	return strophe.type === "chorus" || strophe.type === "bridge"
		? strophe.type
		: "verse";
}

export function isNoteEmpty(note: StropheNote | undefined | null): boolean {
	if (!note) return true;
	return (
		(note.who?.length ?? 0) === 0 &&
		(note.how?.length ?? 0) === 0 &&
		(note.text?.trim() ?? "") === ""
	);
}

export function getStropheNote(strophe: Strophe): StropheNote | undefined {
	if (strophe.type === "section") return undefined;
	return isNoteEmpty(strophe.note) ? undefined : strophe.note;
}

/** Trims text, and collapses an empty note to `undefined` — "no note" has one representation. */
export function normalizeNote(
	note: StropheNote | undefined,
): StropheNote | undefined {
	if (isNoteEmpty(note) || !note) return undefined;
	const text = note.text?.trim() ?? "";
	const normalized: StropheNote = { who: [...note.who], how: [...note.how] };
	if (text) normalized.text = text;
	return normalized;
}

/**
 * Returns a new array with the note set on (or removed from) one strophe.
 * Deleting removes the key entirely rather than storing `{}` or `null`, so
 * `strophe.note ? …` never has to be paired with a length check downstream.
 */
export function setStropheNote(
	strophes: Strophe[],
	index: number,
	note: StropheNote | undefined,
): Strophe[] {
	const target = strophes[index];
	if (!target || target.type === "section") return strophes;

	const normalized = normalizeNote(note);
	const next = [...strophes];
	if (normalized) {
		next[index] = { ...target, note: normalized };
	} else {
		const { note: _removed, ...withoutNote } = target;
		next[index] = withoutNote as Strophe;
	}
	return next;
}

/**
 * Identifies the strophe a note was written against, so a write can refuse to
 * land if the song was re-ordered in the meantime. Position alone is not enough:
 * re-reading a fresh array still writes at an index, and that index may now
 * point somewhere else.
 */
export function stropheFingerprint(strophe: Strophe | undefined): string {
	if (!strophe) return "";
	if (strophe.type === "section") return `section:${strophe.content}`;
	const lines = Array.isArray(strophe.content) ? strophe.content : [];
	return `lyric:${lines[0]?.text ?? ""}`;
}

/**
 * Carries every note from `fresh` (just re-read from the DB) onto the
 * matching strophe in `edited` (the song editor's locally drafted array),
 * matched by content fingerprint rather than index.
 *
 * The song editor never lets a user touch notes — whatever `note` a drafted
 * strophe carries is only ever a leftover from the moment the editor loaded,
 * which can be stale by the time "Enregistrer" is pressed if someone added,
 * changed or deleted a note on their phone in the meantime. Making `fresh`
 * fully authoritative (dropping any note on `edited` that has no match in
 * `fresh`, not just adding the ones that do) means a lyrics save can never
 * clobber a concurrent note edit, without needing a fingerprint check on the
 * whole array the way `useSetStropheNote` needs one for a single strophe.
 *
 * Index isn't used for matching because the editor freely reorders, inserts
 * and removes strophes — a note read at index 2 may no longer belong there
 * by the time this runs. Fingerprint match fails (and the note is dropped)
 * only when the editor also rewrote that strophe's first line badly enough
 * to change its identity, which is rare and already the accepted limit of
 * fingerprint-based matching elsewhere in this file.
 */
export function preserveFreshNotes(
	fresh: Strophe[],
	edited: Strophe[],
): Strophe[] {
	const freshNotes = new Map<string, StropheNote>();
	for (const strophe of fresh) {
		const note = getStropheNote(strophe);
		if (note) freshNotes.set(stropheFingerprint(strophe), note);
	}

	return edited.map((strophe) => {
		if (strophe.type === "section") return strophe;
		const note = freshNotes.get(stropheFingerprint(strophe));
		if (note) return { ...strophe, note };
		if (!strophe.note) return strophe;
		const { note: _dropped, ...withoutNote } = strophe;
		return withoutNote as Strophe;
	});
}

export interface DisplayStrophe {
	strophe: Strophe;
	/** Index in the ORIGINAL array. Stable React key, and the index a write must patch. */
	sourceIndex: number;
	/** e.g. "refrain 2", counted over the full list before filtering. `undefined` for sections. */
	ordinalLabel?: string;
	/** True only when this strophe would have been hidden and its note brought it back. */
	shownBecauseNoted: boolean;
}

export interface DisplayOptions {
	addChorus: boolean;
	showNotes: boolean;
}

/**
 * Decides what `SongViewer` renders. Replaces the inline filter so the rule is
 * testable, and so the original index survives filtering — without it, a write
 * would patch the wrong strophe as soon as a repetition above it is hidden.
 */
export function buildDisplayStrophes(
	strophes: Strophe[] | null | undefined,
	{ addChorus, showNotes }: DisplayOptions,
): DisplayStrophe[] {
	if (!strophes?.length) return [];

	const counters: Record<StropheKind, number> = {
		verse: 0,
		chorus: 0,
		bridge: 0,
	};
	const display: DisplayStrophe[] = [];

	strophes.forEach((strophe, sourceIndex) => {
		if (strophe.type === "section") {
			display.push({ strophe, sourceIndex, shownBecauseNoted: false });
			return;
		}

		const kind = stropheKind(strophe);
		// Counted before any filtering, so "refrain 3" stays true when 2 is hidden.
		counters[kind] += 1;
		const ordinalLabel = `${KIND_LABELS[kind]} ${counters[kind]}`;

		const isRepetition = strophe.repetition === true;
		// The `showNotes` term is required: without it, someone with notes off
		// would see extra choruses appear with no visible explanation.
		const noted = showNotes && !isNoteEmpty(strophe.note);

		if (!addChorus && isRepetition && !noted) return;

		display.push({
			strophe,
			sourceIndex,
			ordinalLabel,
			// False whenever repetitions are shown anyway, or the marker would lie.
			shownBecauseNoted: !addChorus && isRepetition && noted,
		});
	});

	return display;
}
