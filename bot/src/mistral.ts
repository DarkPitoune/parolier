import { MistralCore } from "@mistralai/mistralai/core.js";
import { betaConversationsStart } from "@mistralai/mistralai/funcs/betaConversationsStart.js";
import { chatComplete } from "@mistralai/mistralai/funcs/chatComplete.js";
import { ocrProcess } from "@mistralai/mistralai/funcs/ocrProcess.js";
import type {
	ChatCompletionRequest,
	ChatCompletionResponse,
	ConversationResponse,
} from "@mistralai/mistralai/models/components";
import { dataUrl } from "./media";

export const OCR_MODEL = "mistral-ocr-latest";
export const SEARCH_MODEL = "mistral-medium-latest";

/** The tree-shakeable core client: the full SDK class pulls in voice-agent code that needs native modules. */
export type Mistral = MistralCore;

export function makeMistral(apiKey: string): Mistral {
	return new MistralCore({ apiKey, timeoutMs: 120_000 });
}

function ok<T>(
	result: { ok: true; value: T } | { ok: false; error: unknown },
): T {
	if (!result.ok) throw result.error;
	return result.value;
}

export async function complete(
	client: Mistral,
	request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
	return ok(await chatComplete(client, request));
}

export async function pdfToText(client: Mistral, pdf: Buffer): Promise<string> {
	const res = ok(
		await ocrProcess(client, {
			model: OCR_MODEL,
			document: {
				type: "document_url",
				documentUrl: dataUrl(pdf, "application/pdf"),
			},
		}),
	);
	return res.pages
		.map((page) => page.markdown)
		.join("\n\n")
		.trim();
}

export interface SearchResult {
	answer: string;
	sources: Array<{ title: string; url: string }>;
}

export function readSearchResponse(res: ConversationResponse): SearchResult {
	const text: string[] = [];
	const sources = new Map<string, string>();
	for (const entry of res.outputs) {
		if (entry.type !== "message.output") continue;
		const content = "content" in entry ? entry.content : [];
		if (typeof content === "string") {
			text.push(content);
			continue;
		}
		for (const chunk of content) {
			if (chunk.type === "text") text.push(chunk.text);
			if (chunk.type === "tool_reference" && chunk.url)
				sources.set(chunk.url, chunk.title);
		}
	}
	return {
		answer: text.join("").trim(),
		sources: [...sources].map(([url, title]) => ({ title, url })),
	};
}

export async function webSearch(
	client: Mistral,
	query: string,
): Promise<SearchResult> {
	const res = ok(
		await betaConversationsStart(client, {
			model: SEARCH_MODEL,
			inputs: `Cherche sur le web : ${query}\nListe les pages les plus utiles (paroles, accords ou partition) avec leur adresse et une ligne sur ce que chacune contient. Ne recopie pas les paroles.`,
			tools: [{ type: "web_search" }],
			store: false,
			completionArgs: { temperature: 0.2 },
		}),
	);
	return readSearchResponse(res);
}
