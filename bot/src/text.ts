import type { Strophe } from "@/assets/types";
import { normalize } from "@/utils/normalize";

export function searchKey(s: string): string {
	return normalize(s)
		.replace(/[’']/g, " ")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function stropheLines(strophe: Strophe): string[] {
	if (strophe.type === "section") return [strophe.content];
	return strophe.content.map((line) => line.text);
}

export function firstLine(strophes: Strophe[] | null | undefined): string {
	for (const strophe of strophes ?? []) {
		const line = stropheLines(strophe).find((l) => l.trim());
		if (line) return line.trim();
	}
	return "";
}

export function lyricsText(strophes: Strophe[] | null | undefined): string {
	return (strophes ?? []).flatMap(stropheLines).join(" ");
}

/** A title without its trailing qualifiers, e.g. ", Emmanuel" or " (2)". */
export function coreTitle(title: string): string {
	return searchKey(
		title.replace(/\s*\([^)]*\)\s*$/, "").replace(/,[^,]*$/, ""),
	);
}

export interface Searchable {
	title: string;
	strophes: Strophe[] | null;
}

export interface Indexed<T> {
	item: T;
	title: string;
	core: string;
	first: string;
	body: string;
}

export function indexItem<T extends Searchable>(item: T): Indexed<T> {
	return {
		item,
		title: searchKey(item.title),
		core: coreTitle(item.title),
		first: searchKey(firstLine(item.strophes)),
		body: searchKey(lyricsText(item.strophes)),
	};
}

export function score(entry: Indexed<unknown>, rawQuery: string): number {
	const q = searchKey(rawQuery);
	if (!q) return 0;
	if (entry.title === q || entry.core === q) return 100;
	if (
		entry.title.includes(q) ||
		(entry.core.length > 5 && q.includes(entry.core))
	)
		return 80;
	if (
		entry.first.includes(q) ||
		(entry.first.length > 10 && q.includes(entry.first))
	)
		return 70;
	const words = q.split(" ").filter((w) => w.length > 2);
	if (words.length === 0) return 0;
	const titleWords = new Set(entry.title.split(" "));
	if (words.every((w) => titleWords.has(w))) return 60;
	if (entry.body.includes(q)) return 50;
	const bodyWords = new Set(entry.body.split(" "));
	const hits = words.filter(
		(w) => titleWords.has(w) || bodyWords.has(w),
	).length;
	if (words.every((w) => bodyWords.has(w))) return 40;
	const ratio = hits / words.length;
	return ratio >= 0.6 ? Math.round(ratio * 35) : 0;
}

export function search<T>(
	entries: Indexed<T>[],
	query: string,
	limit = 10,
): Array<{ item: T; score: number }> {
	return entries
		.map((entry) => ({ item: entry.item, score: score(entry, query) }))
		.filter((r) => r.score >= 30)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}

/** Same song if the titles match once qualifiers are dropped, or the opening lines match. */
export function isLikelyDuplicate(
	a: Indexed<unknown>,
	b: Indexed<unknown>,
): boolean {
	if (a.core && a.core === b.core) return true;
	if (
		a.title &&
		(a.title === b.title || a.core === b.title || a.title === b.core)
	)
		return true;
	return a.first.length >= 12 && a.first === b.first;
}
