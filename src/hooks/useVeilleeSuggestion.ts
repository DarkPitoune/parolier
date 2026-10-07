import supabase from "@/utils/supabase";
import {
	type CompactVeilleeSong,
	type DraftItem,
	type SuggestedItem,
	type VeilleeBrief,
	type VeilleeDraft,
	buildDraft,
	buildTemplate,
} from "@/utils/veillee";
import type { DraftOp } from "@/utils/veilleeDraft";
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

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

interface RefineVariables {
	brief: VeilleeBrief;
	items: DraftItem[];
	messages: ChatMessage[];
	songs: CompactVeilleeSong[];
}

interface RefineResponse {
	success: boolean;
	reply?: string;
	ops?: DraftOp[];
	error?: string;
}

async function refineVeillee({
	brief,
	items,
	messages,
	songs,
}: RefineVariables): Promise<{ reply: string; ops: DraftOp[] }> {
	const { data, error } = await supabase.functions.invoke("suggest-veillee", {
		body: {
			mode: "refine",
			brief,
			draft: items.map(({ key, slot, songId }) => ({ key, slot, songId })),
			messages,
			songs,
		},
	});
	if (error) {
		throw new Error(`Erreur lors de l'appel à l'assistant: ${error.message}`);
	}

	const result = data as RefineResponse;
	if (!result.success) {
		throw new Error(result.error ?? "Pas de réponse de l'assistant");
	}
	return { reply: result.reply ?? "", ops: result.ops ?? [] };
}

export const useVeilleeRefine = () =>
	useMutation({ mutationFn: refineVeillee });
