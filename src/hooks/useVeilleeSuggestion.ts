import supabase from "@/utils/supabase";
import {
	type CompactVeilleeSong,
	type DraftItem,
	type VeilleeBrief,
	type VeilleeDraft,
	buildDraft,
	buildTemplate,
} from "@/utils/veillee";
import type { DraftOp } from "@/utils/veilleeDraft";
import {
	functionErrorMessage,
	parseRefineResponse,
	parseSuggestResponse,
} from "@/utils/veilleeResponse";
import { useMutation } from "@tanstack/react-query";

async function invoke(body: Record<string, unknown>): Promise<unknown> {
	const { data, error } = await supabase.functions.invoke("suggest-veillee", {
		body,
	});
	if (error) throw new Error(await functionErrorMessage(error));
	return data;
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
	const { summary, items: suggested } = parseSuggestResponse(
		await invoke({ brief, template, songs }),
	);
	const items = buildDraft(
		template,
		suggested,
		new Set(songs.map((s) => s.id)),
	);
	if (!items.some((item) => item.songId !== null)) {
		throw new Error("Aucun chant valide dans la proposition");
	}
	return { summary, items };
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

async function refineVeillee({
	brief,
	items,
	messages,
	songs,
}: RefineVariables): Promise<{ reply: string; ops: DraftOp[] }> {
	return parseRefineResponse(
		await invoke({
			mode: "refine",
			brief,
			draft: items.map(({ key, slot, songId }) => ({ key, slot, songId })),
			messages,
			songs,
		}),
	);
}

export const useVeilleeRefine = () =>
	useMutation({ mutationFn: refineVeillee });
