import { describe, expect, it } from "vitest";
import type { AelfInformations, AelfLecture } from "./aelf";
import { celebrationDetails } from "./aelf";
import { extractLiturgicalPayload } from "./compactSongData";

const informations = (over: Partial<AelfInformations>): AelfInformations => ({
	date: "2026-11-01",
	zone: "romain",
	couleur: "blanc",
	annee: null,
	temps_liturgique: null,
	semaine: null,
	jour: null,
	jour_liturgique_nom: "Tous les Saints (dimanche)",
	fete: "Solennité",
	degre: "Solennité",
	ligne1: "Tous les Saints",
	ligne2: "Solennité",
	ligne3: "",
	couleur2: null,
	couleur3: null,
	...over,
});

const psaume: AelfLecture = {
	type: "psaume",
	titre: null,
	contenu: "<p>Au Seigneur, le monde</p>",
	ref: "Ps 23",
	intro_lue: null,
	refrain_psalmique: "<p>Voici le peuple</p>",
	ref_refrain: null,
	verset_evangile: null,
	ref_verset: null,
};

describe("celebrationDetails", () => {
	it("keeps the feast and its rank, dropping empty lines", () => {
		expect(
			celebrationDetails(
				informations({
					ligne2: "S. Martin de Porrès, religieux",
					ligne3: "Mémoire facultative",
				}),
			),
		).toEqual(["S. Martin de Porrès, religieux", "Mémoire facultative"]);
		expect(
			celebrationDetails(informations({ ligne2: "", ligne3: "" })),
		).toEqual([]);
	});
});

describe("extractLiturgicalPayload", () => {
	it("names a solemnity even though temps_liturgique is null", () => {
		const payload = extractLiturgicalPayload(informations({}), [psaume]);
		expect(payload).toMatchObject({
			celebration: "Tous les Saints",
			details: ["Solennité"],
			temps_liturgique: null,
		});
		expect(payload.lectures[0]).toEqual({
			type: "psaume",
			titre: null,
			ref: "Ps 23",
			contenu: "Au Seigneur, le monde",
			refrain_psalmique: "Voici le peuple",
			verset_evangile: undefined,
		});
	});
});
