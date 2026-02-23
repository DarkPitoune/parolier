import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

interface LiturgicalInformation {
	date: string;
	zone_liturgique: string;
	couleur: string;
	temps_liturgique: string;
	semaine: string;
	jour: string;
	fete?: string;
	mémoire?: string;
}

interface Lecture {
	type: string;
	refrain_psalmique?: string;
	titre: string;
	contenu: string;
	ref: string;
	intro_lue?: string;
	verset_evangile?: string;
}

interface Masse {
	nom: string;
	lectures: Lecture[];
}

export interface MesseData {
	informations: LiturgicalInformation;
	messes: Masse[];
}

export const useMesseData = (date: string) =>
	useQuery<MesseData>({
		queryKey: queryKeys.messe.byDate(date),
		queryFn: async () => {
			const response = await fetch(
				`https://api.aelf.org/v1/messes/${date}/france`,
			);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Aucune donnée disponible pour cette date");
				}
				throw new Error("Erreur lors de la récupération des données");
			}
			return response.json();
		},
		staleTime: 60 * 60 * 1000, // 1h
	});
