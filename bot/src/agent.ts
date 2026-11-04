import type {
	AssistantMessage,
	ChatCompletionRequest,
	ChatCompletionResponse,
	ContentChunk,
	ToolCall,
	ToolMessage,
	UserMessage,
} from "@mistralai/mistralai/models/components";
import { dataUrl } from "./media";
import { SYSTEM_PROMPT } from "./prompt";
import { type Tool, type ToolOutput, toMistralTool } from "./tools/tool";

export type Message =
	| (AssistantMessage & { role: "assistant" })
	| ToolMessage
	| UserMessage;
export type Complete = (
	request: ChatCompletionRequest,
) => Promise<ChatCompletionResponse>;

export interface TurnUsage {
	input: number;
	output: number;
	requests: number;
	toolCalls: number;
}

export interface TurnResult {
	text: string;
	messages: Message[];
	usage: TurnUsage;
	finishReason: string | null;
	calls: ToolTrace[];
}

export interface ToolTrace {
	tool: string;
	args: string;
	result: string;
	error: boolean;
}

const clip = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n)}…` : s);

function trace(call: ToolCall, reply: ToolMessage): ToolTrace {
	const args = call.function.arguments;
	const content =
		typeof reply.content === "string"
			? reply.content
			: (reply.content ?? [])
					.map((c) => (c.type === "text" ? c.text : `[${c.type}]`))
					.join(" ");
	return {
		tool: call.function.name,
		args: clip(typeof args === "string" ? args : JSON.stringify(args), 200),
		result: clip(content),
		error: content.startsWith("Error:"),
	};
}

const MAX_REQUESTS = 14;
const CUT_SHORT_TEXT =
	"Je me suis arrêté en route, la demande était trop longue. Redis-moi ce qu'il reste à faire.";

function textOf(content: AssistantMessage["content"]): string {
	if (!content) return "";
	if (typeof content === "string") return content;
	return content
		.flatMap((chunk) => (chunk.type === "text" ? [chunk.text] : []))
		.join("");
}

function parseArguments(raw: ToolCall["function"]["arguments"]): unknown {
	return typeof raw === "string" ? JSON.parse(raw || "{}") : raw;
}

function toolContent(output: ToolOutput): ToolMessage["content"] {
	if (typeof output === "string") return output;
	return [
		{ type: "text", text: output.text },
		...output.images.map(
			(image): ContentChunk => ({
				type: "image_url",
				imageUrl: dataUrl(image.data, image.type),
			}),
		),
	];
}

async function runTool(
	tools: Map<string, Tool>,
	call: ToolCall,
): Promise<ToolMessage> {
	const tool = tools.get(call.function.name);
	const reply = (content: ToolMessage["content"]): ToolMessage => ({
		role: "tool",
		toolCallId: call.id ?? null,
		name: call.function.name,
		content,
	});
	if (!tool) return reply(`Error: unknown tool ${call.function.name}`);
	let input: unknown;
	try {
		input = parseArguments(call.function.arguments);
	} catch {
		return reply(
			"Error: the arguments are not valid JSON. Call the tool again.",
		);
	}
	const parsed = tool.schema.safeParse(input);
	if (!parsed.success)
		return reply(`Error: invalid arguments: ${parsed.error.message}`);
	try {
		return reply(toolContent(await tool.run(parsed.data)));
	} catch (error) {
		return reply(
			`Error: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function runTurn(options: {
	complete: Complete;
	model: string;
	tools: Tool[];
	history: Message[];
	content: ContentChunk[];
	cacheKey?: string;
}): Promise<TurnResult> {
	const tools = new Map(options.tools.map((t) => [t.name, t]));
	const definitions = options.tools.map(toMistralTool);
	const messages: Message[] = [
		...options.history,
		{ role: "user", content: options.content },
	];
	const calls: ToolTrace[] = [];
	const usage: TurnUsage = { input: 0, output: 0, requests: 0, toolCalls: 0 };

	for (let i = 0; i < MAX_REQUESTS; i++) {
		const res = await options.complete({
			model: options.model,
			temperature: 0.2,
			maxTokens: 8000,
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				...messages,
			] as ChatCompletionRequest["messages"],
			tools: definitions,
			toolChoice: "auto",
			parallelToolCalls: true,
			...(options.cacheKey ? { promptCacheKey: options.cacheKey } : {}),
		});
		usage.requests += 1;
		usage.input += res.usage.promptTokens ?? 0;
		usage.output += res.usage.completionTokens ?? 0;

		const choice = res.choices[0];
		const message = choice?.message;
		if (!choice || !message) throw new Error("Mistral returned no message");
		const toolCalls = message.toolCalls ?? [];
		messages.push({
			role: "assistant",
			content: message.content ?? "",
			...(toolCalls.length ? { toolCalls } : {}),
		});

		if (toolCalls.length === 0) {
			const text = textOf(message.content).trim();
			const cut =
				choice.finishReason === "length" ||
				choice.finishReason === "model_length";
			return {
				text: cut
					? text
						? `${text}\n\n${CUT_SHORT_TEXT}`
						: CUT_SHORT_TEXT
					: text || "C'est fait.",
				messages,
				usage,
				finishReason: choice.finishReason,
				calls,
			};
		}

		usage.toolCalls += toolCalls.length;
		const replies = await Promise.all(
			toolCalls.map((call) => runTool(tools, call)),
		);
		toolCalls.forEach((call, i) => {
			const reply = replies[i];
			if (reply) calls.push(trace(call, reply));
		});
		messages.push(...replies);
	}

	return {
		text: CUT_SHORT_TEXT,
		messages,
		usage,
		finishReason: "max_requests",
		calls,
	};
}
