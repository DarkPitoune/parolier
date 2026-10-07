import type { SuggestedItem } from "@/utils/veillee";
import type { DraftOp } from "@/utils/veilleeDraft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const failure = (data: unknown, fallback: string) =>
	new Error(
		isRecord(data) && typeof data.error === "string" ? data.error : fallback,
	);

export function parseSuggestResponse(data: unknown): {
	summary: string;
	items: SuggestedItem[];
} {
	if (!isRecord(data) || data.success !== true || !Array.isArray(data.items)) {
		throw failure(data, "Aucune suggestion retournée");
	}
	return {
		summary: typeof data.summary === "string" ? data.summary : "",
		items: data.items
			.filter(
				(item): item is SuggestedItem =>
					isRecord(item) &&
					typeof item.songId === "number" &&
					typeof item.slot === "string",
			)
			.map((item) => ({
				...item,
				reasoning: typeof item.reasoning === "string" ? item.reasoning : "",
				alternatives: Array.isArray(item.alternatives)
					? item.alternatives.filter(
							(id): id is number => typeof id === "number",
						)
					: [],
			})),
	};
}

export function parseRefineResponse(data: unknown): {
	reply: string;
	ops: DraftOp[];
} {
	if (!isRecord(data) || data.success !== true) {
		throw failure(data, "Pas de réponse de l'assistant");
	}
	return {
		reply: typeof data.reply === "string" ? data.reply : "",
		ops: Array.isArray(data.ops)
			? data.ops.filter(
					(op): op is DraftOp => isRecord(op) && typeof op.op === "string",
				)
			: [],
	};
}

/**
 * supabase-js reports a non-2xx edge function call as a generic error and
 * keeps the response on `context`; the function's own message is in its body.
 */
export async function functionErrorMessage(error: unknown): Promise<string> {
	const context = isRecord(error) ? error.context : undefined;
	if (context instanceof Response) {
		try {
			const body = await context.clone().json();
			if (isRecord(body) && typeof body.error === "string") return body.error;
		} catch {
			// Not JSON: fall through to the generic message.
		}
	}
	return error instanceof Error ? error.message : "Erreur inconnue";
}
