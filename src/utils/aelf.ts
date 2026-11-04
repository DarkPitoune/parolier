/**
 * `ligne1`–`ligne3` are AELF's own display summary of the day. On solemnities
 * `temps_liturgique`, `semaine` and `jour` are null and `fete` holds the rank
 * ("Solennité"), not the feast's name — only `ligne1` names it reliably.
 */
export interface AelfInformations {
	date: string;
	zone: string;
	couleur: string;
	annee: string | null;
	temps_liturgique: string | null;
	semaine: string | null;
	jour: string | null;
	jour_liturgique_nom: string | null;
	fete: string | null;
	degre: string | null;
	ligne1: string;
	ligne2: string;
	ligne3: string;
	couleur2: string | null;
	couleur3: string | null;
}

export interface AelfLecture {
	type: string;
	titre: string | null;
	contenu: string;
	ref: string;
	intro_lue: string | null;
	refrain_psalmique: string | null;
	ref_refrain: string | null;
	verset_evangile: string | null;
	ref_verset: string | null;
}

export interface AelfMesse {
	nom: string;
	lectures: AelfLecture[];
}

export interface AelfMesseData {
	informations: AelfInformations;
	messes: AelfMesse[];
}

/** The feast and its rank (`ligne2`, `ligne3`), whichever are present. */
export function celebrationDetails(informations: AelfInformations): string[] {
	return [informations.ligne2, informations.ligne3].filter(
		(line) => line.trim().length > 0,
	);
}
