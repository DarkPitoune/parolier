import type { Strophe } from "@/assets/types";
import type { AllTaggedSongs } from "@/utils/supabase";

export type VeilleeDuration = 30 | 45 | 60 | 90;
export type SilenceAmount = "none" | "few" | "many";

export interface VeilleeBrief {
	theme: string;
	durationMin: VeilleeDuration;
	adoration: boolean;
	silences: SilenceAmount;
	marie: boolean;
}

export type SongSlot = "louange" | "esprit" | "adoration" | "marie";
export type SlotKind = SongSlot | "silence";

export const SONG_MINUTES = 4;
export const SILENCE_MINUTES = 2;
export const SILENCE_TEXT = "Silence";

const MIN_LOUANGE = 3;
const MIN_ADORATION = 2;
const MAX_ADORATION = 5;

export function buildTemplate(brief: VeilleeBrief): SlotKind[] {
	const songCount = Math.round(brief.durationMin / SONG_MINUTES);
	const adorationCount = brief.adoration
		? Math.min(
				MAX_ADORATION,
				Math.max(MIN_ADORATION, Math.round(songCount * 0.3)),
			)
		: 0;
	const silenceCount =
		adorationCount === 0 || brief.silences === "none"
			? 0
			: brief.silences === "few"
				? 1
				: adorationCount;
	const songsTakenBySilences = Math.ceil(
		(silenceCount * SILENCE_MINUTES) / SONG_MINUTES,
	);
	const louangeCount = Math.max(
		MIN_LOUANGE,
		songCount -
			1 -
			(brief.marie ? 1 : 0) -
			adorationCount -
			songsTakenBySilences,
	);

	const template: SlotKind[] = [
		...Array<SlotKind>(louangeCount).fill("louange"),
		"esprit",
	];
	const middle = Math.ceil(adorationCount / 2);
	for (let i = 1; i <= adorationCount; i++) {
		template.push("adoration");
		if (brief.silences === "many" || (silenceCount === 1 && i === middle)) {
			template.push("silence");
		}
	}
	if (brief.marie) template.push("marie");
	return template;
}

export interface DraftItem {
	key: string;
	slot: SlotKind;
	songId: number | null;
	reasoning?: string;
	alternatives?: number[];
}

export interface VeilleeDraft {
	summary: string;
	items: DraftItem[];
}

export function estimateDuration(items: Pick<DraftItem, "slot">[]): number {
	return items.reduce(
		(total, item) =>
			total + (item.slot === "silence" ? SILENCE_MINUTES : SONG_MINUTES),
		0,
	);
}

export type UsageCounts = Partial<Record<SongSlot, number>>;

export interface HistoryRow {
	id: number;
	setlist_id: number;
	position: number;
	song_id: number | null;
	setlists: { name: string | null } | null;
}

type SongInfo = { type: string; tags: string[] };

const hasTag = (song: SongInfo | undefined, tag: string) =>
	song?.tags.includes(tag) ?? false;

/**
 * Where each song has been played in past veillées. Within a set, the first
 * "Esprit Saint" song is the pivot: louange before it, adoration after it, and
 * a closing "Marie" song is counted as marie. Sets without a pivot say nothing
 * about position and are ignored, as are masses (named "Messe…" or holding
 * liturgical parts).
 */
export function usageHints(
	history: HistoryRow[],
	songs: AllTaggedSongs,
): Map<number, UsageCounts> {
	const songInfo = new Map<number, SongInfo>(
		songs.map((s) => [
			s.id,
			{
				type: s.type ?? "song",
				tags: s.tags?.map((t) => t.name ?? "") ?? [],
			},
		]),
	);

	const bySetlist = new Map<number, HistoryRow[]>();
	for (const row of history) {
		if (row.song_id === null) continue;
		const group = bySetlist.get(row.setlist_id);
		if (group) group.push(row);
		else bySetlist.set(row.setlist_id, [row]);
	}

	const counts = new Map<number, UsageCounts>();
	for (const rows of bySetlist.values()) {
		const name = rows[0].setlists?.name ?? "";
		if (/^messe/i.test(name.trim())) continue;
		const ordered = [...rows]
			.sort((a, b) => a.position - b.position || a.id - b.id)
			.map((r) => r.song_id as number);
		if (ordered.some((id) => (songInfo.get(id)?.type ?? "song") !== "song")) {
			continue;
		}
		const pivot = ordered.findIndex((id) =>
			hasTag(songInfo.get(id), "Esprit Saint"),
		);
		if (pivot === -1) continue;

		const lastIndex = ordered.length - 1;
		const seen = new Set<number>();
		ordered.forEach((id, index) => {
			if (seen.has(id)) return;
			seen.add(id);
			const slot: SongSlot =
				index < pivot
					? "louange"
					: index === pivot
						? "esprit"
						: index === lastIndex && hasTag(songInfo.get(id), "Marie")
							? "marie"
							: "adoration";
			const songCounts = counts.get(id) ?? {};
			songCounts[slot] = (songCounts[slot] ?? 0) + 1;
			counts.set(id, songCounts);
		});
	}
	return counts;
}

export interface CompactVeilleeSong {
	id: number;
	title: string;
	tags: string[];
	usedAs: UsageCounts;
	excerpt: string;
}

const EXCERPT_LENGTH = 400;

const stropheText = (strophe: Strophe | undefined) =>
	strophe && strophe.type !== "section"
		? strophe.content.map((line) => line.text).join("\n")
		: "";

function extractExcerpt(strophes: Strophe[]): string {
	const chorus = strophes.find((s) => s.type === "chorus" && !s.repetition);
	const verse = strophes.find((s) => s.type === "verse");
	return [stropheText(chorus), stropheText(verse)]
		.filter(Boolean)
		.join("\n")
		.slice(0, EXCERPT_LENGTH);
}

export function compactVeilleeSongs(
	songs: AllTaggedSongs,
	hints: Map<number, UsageCounts>,
): CompactVeilleeSong[] {
	return songs
		.filter((song) => (song.type ?? "song") === "song")
		.map((song) => ({
			id: song.id,
			title: song.title,
			tags:
				song.tags?.map((t) => t.name).filter((n): n is string => n !== null) ??
				[],
			usedAs: hints.get(song.id) ?? {},
			excerpt: extractExcerpt((song.strophes as unknown as Strophe[]) ?? []),
		}));
}

export interface SuggestedItem {
	slot: SongSlot;
	songId: number;
	reasoning: string;
	alternatives: number[];
}

/**
 * Lays the model's picks onto the template. The model only chooses songs per
 * slot; positions and silences always come from the template. Unknown ids,
 * repeats and surplus picks are dropped, and a slot left without a valid pick
 * simply disappears from the draft.
 */
export function buildDraft(
	template: SlotKind[],
	suggested: SuggestedItem[],
	knownIds: Set<number>,
): DraftItem[] {
	const used = new Set<number>();
	const queues = new Map<SongSlot, SuggestedItem[]>();
	for (const item of suggested) {
		if (!knownIds.has(item.songId) || used.has(item.songId)) continue;
		used.add(item.songId);
		const queue = queues.get(item.slot);
		if (queue) queue.push(item);
		else queues.set(item.slot, [item]);
	}

	const items: DraftItem[] = [];
	template.forEach((slot, index) => {
		if (slot === "silence") {
			items.push({ key: `silence-${index}`, slot, songId: null });
			return;
		}
		const pick = queues.get(slot)?.shift();
		if (!pick) return;
		items.push({
			key: `song-${pick.songId}`,
			slot,
			songId: pick.songId,
			reasoning: pick.reasoning,
			alternatives: [
				...new Set(
					pick.alternatives.filter((id) => knownIds.has(id) && !used.has(id)),
				),
			],
		});
	});
	return items;
}
