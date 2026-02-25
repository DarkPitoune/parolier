import {
	type CompactSong,
	type LiturgicalPayload,
	compactSongs,
	extractLiturgicalPayload,
} from "@/utils/compactSongData";
import supabase, {
	massSuggestionsQuery,
	upsertMassSuggestionsMutation,
} from "@/utils/supabase";
import type { AllTaggedSongs } from "@/utils/supabase";
import { useCallback, useState } from "react";

export interface SongSuggestion {
	role: "entree" | "offertoire" | "communion" | "envoi";
	songId: number;
	songTitle: string;
	reasoning: string;
	alternatives: Array<{ songId: number; songTitle: string }>;
}

interface SuggestResponse {
	success: boolean;
	suggestions?: SongSuggestion[];
	liturgicalSummary?: string;
	error?: string;
}

interface MesseInfo {
	informations: {
		date: string;
		temps_liturgique: string;
		couleur: string;
		fete?: string;
		mémoire?: string;
		semaine: string;
		jour: string;
	};
	messes: Array<{
		lectures: Array<{
			titre: string;
			ref: string;
			contenu: string;
			refrain_psalmique?: string;
			verset_evangile?: string;
		}>;
	}>;
}

async function callEdgeFunction(
	messeData: MesseInfo,
	allSongs: AllTaggedSongs,
): Promise<{
	suggestions: SongSuggestion[];
	liturgicalSummary: string | null;
}> {
	const compact: CompactSong[] = compactSongs(allSongs);
	const allLectures = messeData.messes.flatMap((m) => m.lectures);
	const liturgicalData: LiturgicalPayload = extractLiturgicalPayload(
		messeData.informations,
		allLectures,
	);

	const { data, error: fnError } = await supabase.functions.invoke(
		"suggest-mass-songs",
		{
			body: {
				liturgicalData,
				compactSongs: compact,
			},
		},
	);

	if (fnError) {
		throw new Error(
			`Erreur lors de l'appel au service de suggestions: ${fnError.message}`,
		);
	}

	const result = data as SuggestResponse;

	if (!result.success || !result.suggestions) {
		throw new Error(result.error ?? "Aucune suggestion retournée");
	}

	return {
		suggestions: result.suggestions,
		liturgicalSummary: result.liturgicalSummary ?? null,
	};
}

export function useMasseSuggestions() {
	const [suggestions, setSuggestions] = useState<SongSuggestion[] | null>(null);
	const [liturgicalSummary, setLiturgicalSummary] = useState<string | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const suggest = useCallback(
		async (messeData: MesseInfo, allSongs: AllTaggedSongs) => {
			setLoading(true);
			setError(null);
			setSuggestions(null);
			setLiturgicalSummary(null);

			try {
				const date = messeData.informations.date;

				// Check cache first
				const { data: cached } = await massSuggestionsQuery(date);
				if (cached) {
					setSuggestions(cached.suggestions as unknown as SongSuggestion[]);
					setLiturgicalSummary(cached.liturgical_summary);
					return;
				}

				// No cache — call edge function
				const result = await callEdgeFunction(messeData, allSongs);
				setSuggestions(result.suggestions);
				setLiturgicalSummary(result.liturgicalSummary);

				// Cache the result (fire-and-forget)
				upsertMassSuggestionsMutation(
					date,
					result.suggestions,
					result.liturgicalSummary,
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Une erreur est survenue",
				);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const regenerate = useCallback(
		async (messeData: MesseInfo, allSongs: AllTaggedSongs) => {
			setLoading(true);
			setError(null);
			setSuggestions(null);
			setLiturgicalSummary(null);

			try {
				const date = messeData.informations.date;
				const result = await callEdgeFunction(messeData, allSongs);
				setSuggestions(result.suggestions);
				setLiturgicalSummary(result.liturgicalSummary);

				// Update cache (fire-and-forget)
				upsertMassSuggestionsMutation(
					date,
					result.suggestions,
					result.liturgicalSummary,
				);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Une erreur est survenue",
				);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	return {
		suggestions,
		liturgicalSummary,
		loading,
		error,
		suggest,
		regenerate,
		setSuggestions,
	};
}
