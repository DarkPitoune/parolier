import type { GlyphGroup, StropheNote } from "@/assets/types";
import { PlusIcon, TrashIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useState } from "react";
import { BottomSheet } from "../BottomSheet/BottomSheet";
import { type GlyphDefinition, HOW_GLYPHS, WHO_GLYPHS } from "./glyphPalette";

type PerformanceNoteSheetProps = {
	open: boolean;
	onClose: () => void;
	/** The note as stored, or undefined when the strophe has none. */
	note?: StropheNote;
	/** First line of the target strophe, shown as context. */
	stropheLabel?: string;
	/** `undefined` means: delete this note. */
	onSave: (note: StropheNote | undefined) => void;
	/** The write is queued behind a dead connection. */
	isQueued?: boolean;
};

function GlyphKey({
	glyph,
	label,
	group,
	selected,
	onToggle,
	autoFocus,
}: GlyphDefinition & {
	selected: boolean;
	onToggle: () => void;
	autoFocus?: boolean;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			aria-pressed={selected}
			onClick={onToggle}
			// Sends focus here rather than to the textarea, which would pop the
			// keyboard open on every long press in a glyph-first flow.
			{...(autoFocus ? { "data-autofocus": true } : {})}
			className={clsx(
				"flex size-11 items-center justify-center rounded-lg border text-xl transition-colors",
				selected
					? group === "who"
						? "border-jubilateBlue-500 bg-jubilateBlue-100 dark:border-jubilateBlue-400 dark:bg-slate-600"
						: "border-amber-600 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/30"
					: "border-gray-200 bg-transparent dark:border-gray-600",
			)}
		>
			{glyph}
		</button>
	);
}

function GlyphSection({
	title,
	hint,
	group,
	palette,
	selected,
	onToggle,
	autoFocusFirst,
}: {
	title: string;
	hint: string;
	group: GlyphGroup;
	palette: readonly GlyphDefinition[];
	selected: string[];
	onToggle: (glyph: string) => void;
	autoFocusFirst?: boolean;
}) {
	const [freeOpen, setFreeOpen] = useState(false);
	const [freeValue, setFreeValue] = useState("");

	const addFree = () => {
		const value = freeValue.trim();
		if (value && !selected.includes(value)) onToggle(value);
		setFreeValue("");
		setFreeOpen(false);
	};

	// Emoji written through the escape hatch, so it can be toggled off again.
	const extras = selected.filter((g) => !palette.some((d) => d.glyph === g));

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline gap-2">
				<h2 className="font-flame text-lg text-jubilateBlue-500 dark:text-jubilateBlue-400">
					{title}
				</h2>
				<span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{palette.map((definition, index) => (
					<GlyphKey
						key={definition.glyph}
						{...definition}
						selected={selected.includes(definition.glyph)}
						onToggle={() => onToggle(definition.glyph)}
						autoFocus={autoFocusFirst && index === 0}
					/>
				))}
				{extras.map((glyph) => (
					<GlyphKey
						key={glyph}
						glyph={glyph}
						label={glyph}
						group={group}
						selected
						onToggle={() => onToggle(glyph)}
					/>
				))}
				{freeOpen ? (
					<input
						autoFocus
						value={freeValue}
						onChange={(e) => setFreeValue(e.target.value)}
						onBlur={addFree}
						onKeyDown={(e) => e.key === "Enter" && addFree()}
						aria-label={`Ajouter un emoji — ${title}`}
						placeholder="🎵"
						className="size-11 rounded-lg border border-dashed border-jubilateBlue-300 bg-transparent text-center text-xl dark:border-slate-500"
					/>
				) : (
					<button
						type="button"
						onClick={() => setFreeOpen(true)}
						// Emoji has no bass, no organ, no cantor. This is the repair.
						aria-label={`Autre emoji — ${title}`}
						className="flex size-11 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
					>
						<PlusIcon className="size-4" />
					</button>
				)}
			</div>
		</div>
	);
}

function PerformanceNoteForm({
	note,
	stropheLabel,
	onClose,
	onSave,
	isQueued,
}: Omit<PerformanceNoteSheetProps, "open">) {
	const [who, setWho] = useState<string[]>(note?.who ?? []);
	const [how, setHow] = useState<string[]>(note?.how ?? []);
	const [text, setText] = useState(note?.text ?? "");

	const toggle =
		(setter: React.Dispatch<React.SetStateAction<string[]>>) =>
		(glyph: string) =>
			setter((current) =>
				current.includes(glyph)
					? current.filter((g) => g !== glyph)
					: [...current, glyph],
			);

	const isEmpty = who.length === 0 && how.length === 0 && text.trim() === "";
	const willDelete = isEmpty && Boolean(note);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-baseline justify-between gap-2">
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Note de jeu
				</h1>
				{stropheLabel && (
					<span className="truncate text-xs text-gray-500 dark:text-gray-400">
						{stropheLabel}
					</span>
				)}
			</div>

			<GlyphSection
				title="Qui joue"
				hint="absent = se tait"
				group="who"
				palette={WHO_GLYPHS}
				selected={who}
				onToggle={toggle(setWho)}
				autoFocusFirst
			/>
			<GlyphSection
				title="Comment"
				hint="intention, rupture"
				group="how"
				palette={HOW_GLYPHS}
				selected={how}
				onToggle={toggle(setHow)}
			/>

			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				// iOS does not lift a fixed sheet above the keyboard on its own.
				onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
				rows={2}
				placeholder="on envoie — batterie entre sur « Tu es là »"
				aria-label="Texte de la note"
				className="w-full rounded-lg bg-jubilateBlue-100 px-3 py-2 text-base italic text-black outline-solid outline-jubilateBlue-300 focus:outline-jubilateBlue-500 dark:bg-slate-700 dark:text-white sm:text-sm"
			/>

			{isQueued && (
				<p className="text-xs text-gray-500 dark:text-gray-400">
					En attente de réseau — la note partira toute seule.
				</p>
			)}

			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300"
				>
					Annuler
				</button>
				<button
					type="button"
					onClick={() =>
						onSave(isEmpty ? undefined : { who, how, text: text.trim() })
					}
					className={clsx(
						"flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white",
						willDelete
							? "bg-jubilateRed"
							: "bg-jubilateBlue-500 dark:bg-jubilateBlue-400",
					)}
				>
					{willDelete && <TrashIcon className="size-4" />}
					{willDelete ? "Supprimer" : "Enregistrer"}
				</button>
			</div>
		</div>
	);
}

/**
 * Written where it is read — on the song page, not through the song editor,
 * because notes get jotted down mid-rehearsal.
 *
 * The form is mounted only while open and the caller keys it per strophe, so
 * a different strophe always starts from a clean draft.
 */
function PerformanceNoteSheet({
	open,
	onClose,
	...formProps
}: PerformanceNoteSheetProps) {
	return (
		<BottomSheet open={open} onClose={onClose}>
			{open && <PerformanceNoteForm onClose={onClose} {...formProps} />}
		</BottomSheet>
	);
}

export { PerformanceNoteSheet };
