import supabase from "@/utils/supabase";
import {
	type CompactVeilleeSong,
	type SuggestedItem,
	type VeilleeBrief,
	type VeilleeDraft,
	buildDraft,
	buildTemplate,
} from "@/utils/veillee";
import { useMutation } from "@tanstack/react-query";

interface SuggestResponse {
	success: boolean;
	summary?: string;
	items?: SuggestedItem[];
	error?: string;
}

interface SuggestVariables {
	brief: VeilleeBrief;
	songs: CompactVeilleeSong[];
}

async function suggestVeillee({
	brief,
	songs,
}: SuggestVariables): Promise<VeilleeDraft> {
	const template = buildTemplate(brief);
	const { data, error } = await supabase.functions.invoke("suggest-veillee", {
		body: { brief, template, songs },
	});
	if (error) {
		throw new Error(
			`Erreur lors de l'appel au service de suggestions: ${error.message}`,
		);
	}

	const result = data as SuggestResponse;
	if (!result.success || !result.items) {
		throw new Error(result.error ?? "Aucune suggestion retournée");
	}

	const items = buildDraft(
		template,
		result.items,
		new Set(songs.map((s) => s.id)),
	);
	if (!items.some((item) => item.songId !== null)) {
		throw new Error("Aucun chant valide dans la proposition");
	}
	return { summary: result.summary ?? "", items };
}

export const useVeilleeSuggestion = () =>
	useMutation({ mutationFn: suggestVeillee });
