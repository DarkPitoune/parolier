import type { DraftItem, SongSlot } from "@/utils/veillee";

export type DraftOp =
	| { op: "replace"; key: string; songId: number }
	| { op: "insert"; afterKey: string | null; slot: SongSlot; songId: number }
	| { op: "remove"; key: string }
	| { op: "move"; key: string; toIndex: number }
	| { op: "addSilence"; afterKey: string | null };

export interface ApplyResult {
	items: DraftItem[];
	changed: string[];
	skipped: string[];
}

const SONG_SLOTS: SongSlot[] = ["louange", "esprit", "adoration", "marie"];

const insertAt = (items: DraftItem[], afterKey: string | null) =>
	afterKey === null ? 0 : items.findIndex((i) => i.key === afterKey) + 1;

const freshSilenceKey = (items: DraftItem[]) => {
	let n = items.length;
	while (items.some((i) => i.key === `silence-${n}`)) n++;
	return `silence-${n}`;
};

/**
 * Applies edits proposed by the model or the UI. Ops run in order against the
 * result of the previous ones; an op that doesn't make sense against the
 * current draft is skipped and reported, never thrown. Any song may go in any
 * slot, but a draft keeps at most one Esprit Saint pivot.
 */
export function applyOps(
	items: DraftItem[],
	ops: DraftOp[],
	knownIds: Set<number>,
): ApplyResult {
	let current = [...items];
	const changed = new Set<string>();
	const skipped: string[] = [];

	const inDraft = (songId: number) => current.some((i) => i.songId === songId);
	const indexOf = (key: string) => current.findIndex((i) => i.key === key);
	const skip = (op: DraftOp, reason: string) =>
		skipped.push(`${op.op}: ${reason}`);

	for (const op of ops) {
		switch (op.op) {
			case "replace": {
				const index = indexOf(op.key);
				const target = current[index];
				if (!target || target.songId === null) {
					skip(op, `élément ${op.key} introuvable`);
					break;
				}
				if (!knownIds.has(op.songId)) {
					skip(op, `chant ${op.songId} inconnu`);
					break;
				}
				if (inDraft(op.songId)) {
					skip(op, `chant ${op.songId} déjà présent`);
					break;
				}
				const key = `song-${op.songId}`;
				current = current.map((item, i) =>
					i === index
						? {
								...item,
								key,
								songId: op.songId,
								reasoning: undefined,
								alternatives: [
									target.songId as number,
									...(item.alternatives ?? []).filter((id) => id !== op.songId),
								],
							}
						: item,
				);
				changed.add(key);
				break;
			}
			case "insert": {
				if (op.afterKey !== null && indexOf(op.afterKey) === -1) {
					skip(op, `élément ${op.afterKey} introuvable`);
					break;
				}
				if (!SONG_SLOTS.includes(op.slot)) {
					skip(op, `moment ${op.slot} inconnu`);
					break;
				}
				if (!knownIds.has(op.songId)) {
					skip(op, `chant ${op.songId} inconnu`);
					break;
				}
				if (inDraft(op.songId)) {
					skip(op, `chant ${op.songId} déjà présent`);
					break;
				}
				if (op.slot === "esprit" && current.some((i) => i.slot === "esprit")) {
					skip(op, "un seul chant à l'Esprit Saint");
					break;
				}
				const key = `song-${op.songId}`;
				const at = insertAt(current, op.afterKey);
				current = [
					...current.slice(0, at),
					{ key, slot: op.slot, songId: op.songId },
					...current.slice(at),
				];
				changed.add(key);
				break;
			}
			case "remove": {
				if (indexOf(op.key) === -1) {
					skip(op, `élément ${op.key} introuvable`);
					break;
				}
				current = current.filter((i) => i.key !== op.key);
				changed.delete(op.key);
				break;
			}
			case "move": {
				const from = indexOf(op.key);
				if (from === -1) {
					skip(op, `élément ${op.key} introuvable`);
					break;
				}
				const to = Math.max(0, Math.min(current.length - 1, op.toIndex));
				const next = [...current];
				const [item] = next.splice(from, 1);
				next.splice(to, 0, item);
				current = next;
				changed.add(op.key);
				break;
			}
			case "addSilence": {
				if (op.afterKey !== null && indexOf(op.afterKey) === -1) {
					skip(op, `élément ${op.afterKey} introuvable`);
					break;
				}
				const key = freshSilenceKey(current);
				const at = insertAt(current, op.afterKey);
				current = [
					...current.slice(0, at),
					{ key, slot: "silence", songId: null },
					...current.slice(at),
				];
				changed.add(key);
				break;
			}
			default:
				skipped.push("opération inconnue");
		}
	}

	return { items: current, changed: [...changed], skipped };
}
