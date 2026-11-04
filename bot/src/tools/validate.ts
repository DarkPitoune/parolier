import { createHash } from "node:crypto";
import type { Strophe } from "@/assets/types";
import { sanitizeStrophes } from "@/utils/sanitizeNbsp";
import { z } from "zod";

export const lineSchema = z.object({
	text: z.string().describe("One sung line, without chords."),
	chords: z
		.string()
		.describe(
			'Chord names for this line separated by single spaces, e.g. "Am E". Empty string when none.',
		),
});

export const stropheSchema = z.union([
	z.object({
		type: z.enum(["verse", "chorus", "bridge"]),
		repetition: z
			.boolean()
			.describe("True when the strophe is sung twice (bis)."),
		content: z.array(lineSchema).min(1),
	}),
	z.object({
		type: z.literal("section"),
		content: z
			.string()
			.describe("A heading or performance instruction shown between strophes."),
	}),
]);

export const strophesSchema = z.array(stropheSchema).min(1);

export function cleanStrophes(
	strophes: z.infer<typeof strophesSchema>,
): Strophe[] {
	const trimmed: Strophe[] = strophes.map((s) =>
		s.type === "section"
			? { type: "section", content: s.content.trim() }
			: {
					type: s.type,
					repetition: s.repetition,
					content: s.content.map((l) => ({
						text: l.text.trim(),
						chords: l.chords.trim().replace(/\s+/g, " "),
					})),
				},
	);
	return sanitizeStrophes(trimmed);
}

export function stropheVersion(
	title: string,
	strophes: Strophe[] | null,
): string {
	return createHash("sha256")
		.update(JSON.stringify([title, strophes ?? []]))
		.digest("hex")
		.slice(0, 12);
}

export const stropheEditSchema = z.discriminatedUnion("op", [
	z.object({
		op: z.literal("replace"),
		index: z.number().int().min(0),
		strophe: stropheSchema,
	}),
	z.object({ op: z.literal("delete"), index: z.number().int().min(0) }),
	z.object({
		op: z.literal("insert"),
		after: z
			.number()
			.int()
			.min(-1)
			.describe(
				"Index of the strophe to insert after; -1 inserts at the start.",
			),
		strophe: stropheSchema,
	}),
]);

export type StropheEdit = z.infer<typeof stropheEditSchema>;

/**
 * Indices refer to the strophes as they were read. A replaced strophe keeps
 * the original's playing note: notes are written in the app and the bot never
 * sees them as something to edit.
 */
export function applyStropheEdits(
	original: Strophe[],
	edits: StropheEdit[],
): Strophe[] {
	const replaced = new Map<number, Strophe>();
	const deleted = new Set<number>();
	const inserted = new Map<number, Strophe[]>();

	for (const edit of edits) {
		const target = edit.op === "insert" ? edit.after : edit.index;
		if (target >= original.length) {
			throw new Error(
				`Strophe index ${target} does not exist (the song has ${original.length} strophes).`,
			);
		}
		if (edit.op === "replace") {
			if (replaced.has(edit.index) || deleted.has(edit.index)) {
				throw new Error(`Strophe ${edit.index} is edited twice.`);
			}
			const [clean] = cleanStrophes([edit.strophe]);
			const before = original[edit.index];
			if (
				clean &&
				before &&
				clean.type !== "section" &&
				before.type !== "section" &&
				before.note
			) {
				replaced.set(edit.index, { ...clean, note: before.note });
			} else if (clean) {
				replaced.set(edit.index, clean);
			}
		} else if (edit.op === "delete") {
			if (replaced.has(edit.index))
				throw new Error(`Strophe ${edit.index} is edited twice.`);
			deleted.add(edit.index);
		} else {
			const list = inserted.get(edit.after) ?? [];
			list.push(...cleanStrophes([edit.strophe]));
			inserted.set(edit.after, list);
		}
	}

	const result: Strophe[] = [...(inserted.get(-1) ?? [])];
	original.forEach((strophe, i) => {
		if (!deleted.has(i)) result.push(replaced.get(i) ?? strophe);
		result.push(...(inserted.get(i) ?? []));
	});
	if (result.length === 0)
		throw new Error("A song needs at least one strophe.");
	return result;
}
