import type { Strophe } from "@/assets/types";
import type { AllTaggedSongs } from "@/utils/supabase";

export interface CompactSong {
	id: number;
	title: string;
	tags: string[];
	excerpt: string;
}

export interface LiturgicalPayload {
	date: string;
	temps_liturgique: string;
	couleur: string;
	fete: string | null;
	memoire: string | null;
	semaine: string;
	jour: string;
	lectures: Array<{
		titre: string;
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

export function compactSongs(songs: AllTaggedSongs): CompactSong[] {
	const cdTags = ["CD1", "CD2", "CD3", "CD4", "CD5"];
	return songs
		.filter(
			(song) =>
				(song.type ?? "song") === "song" &&
				!song.tags?.some((t) => t.name !== null && cdTags.includes(t.name)),
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
	informations: {
		date: string;
		temps_liturgique: string;
		couleur: string;
		fete?: string;
		mémoire?: string;
		semaine: string;
		jour: string;
	},
	lectures: Array<{
		titre: string;
		ref: string;
		contenu: string;
		refrain_psalmique?: string;
		verset_evangile?: string;
	}>,
): LiturgicalPayload {
	return {
		date: informations.date,
		temps_liturgique: informations.temps_liturgique,
		couleur: informations.couleur,
		fete: informations.fete ?? null,
		memoire: informations.mémoire ?? null,
		semaine: informations.semaine,
		jour: informations.jour,
		lectures: lectures.map((l) => ({
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
