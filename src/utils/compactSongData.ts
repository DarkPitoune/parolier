import type { Strophe } from "@/assets/types";
import {
	type AelfInformations,
	type AelfLecture,
	celebrationDetails,
} from "@/utils/aelf";
import type { AllTaggedSongs } from "@/utils/supabase";

export interface CompactSong {
	id: number;
	title: string;
	tags: string[];
	excerpt: string;
}

export interface LiturgicalPayload {
	date: string;
	celebration: string;
	details: string[];
	temps_liturgique: string | null;
	couleur: string;
	lectures: Array<{
		type: string;
		titre: string | null;
		ref: string;
		contenu: string;
		refrain_psalmique?: string;
		verset_evangile?: string;
	}>;
}

export function stripHtml(html: string): string {
	const doc = new DOMParser().parseFromString(html, "text/html");
	return doc.body.textContent ?? "";
}

function extractExcerpt(strophes: Strophe[]): string {
	// Find first chorus, or fall back to first verse
	const chorus = strophes.find(
		(s) => s.type === "chorus" && !("repetition" in s && s.repetition),
	);
	const target = chorus ?? strophes.find((s) => s.type !== "section");

	if (!target || target.type === "section") return "";

	const text = target.content
		.map((line) => line.text)
		.join("\n")
		.slice(0, 200);

	return text;
}

// Tags are named "CD 1"…"CD 5" in the database.
const CD_TAG = /^CD\s*\d+$/;

export function compactSongs(songs: AllTaggedSongs): CompactSong[] {
	return songs
		.filter(
			(song) =>
				(song.type ?? "song") === "song" &&
				!song.tags?.some((t) => t.name !== null && CD_TAG.test(t.name)),
		)
		.map((song) => ({
			id: song.id,
			title: song.title,
			tags:
				song.tags?.map((t) => t.name).filter((n): n is string => n !== null) ??
				[],
			excerpt: extractExcerpt((song.strophes as unknown as Strophe[]) ?? []),
		}));
}

export function extractLiturgicalPayload(
	informations: AelfInformations,
	lectures: AelfLecture[],
): LiturgicalPayload {
	return {
		date: informations.date,
		celebration: informations.ligne1,
		details: celebrationDetails(informations),
		temps_liturgique: informations.temps_liturgique,
		couleur: informations.couleur,
		lectures: lectures.map((l) => ({
			type: l.type,
			titre: l.titre,
			ref: l.ref,
			contenu: stripHtml(l.contenu),
			refrain_psalmique: l.refrain_psalmique
				? stripHtml(l.refrain_psalmique)
				: undefined,
			verset_evangile: l.verset_evangile
				? stripHtml(l.verset_evangile)
				: undefined,
		})),
	};
}
