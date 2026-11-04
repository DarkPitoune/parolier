import type {
	ChatCompletionRequest,
	ChatCompletionResponse,
} from "@mistralai/mistralai/models/components";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type Complete, runTurn } from "./agent";
import { defineTool, toMistralTool } from "./tools/tool";

function reply(
	message: Record<string, unknown>,
	finishReason: string,
): ChatCompletionResponse {
	return {
		id: "x",
		object: "chat.completion",
		model: "m",
		created: 0,
		usage: { promptTokens: 10, completionTokens: 5 },
		choices: [
			{
				index: 0,
				message: { role: "assistant", ...message },
				finishReason,
			},
		],
	} as ChatCompletionResponse;
}

function fake(replies: ChatCompletionResponse[]) {
	const requests: ChatCompletionRequest[] = [];
	const complete: Complete = async (request) => {
		requests.push(structuredClone(request));
		const next = replies.shift();
		if (!next) throw new Error("no more replies");
		return next;
	};
	return { complete, requests };
}

const echo = defineTool({
	name: "echo",
	description: "echo",
	schema: z.object({ word: z.string() }),
	run: async ({ word }) => `echo:${word}`,
});

const call = (id: string, name: string, args: unknown) => ({
	id,
	type: "function",
	function: {
		name,
		arguments: typeof args === "string" ? args : JSON.stringify(args),
	},
});

describe("runTurn", () => {
	it("runs tool calls and returns the whole exchange as the next turn's history", async () => {
		const { complete, requests } = fake([
			reply(
				{ content: "", toolCalls: [call("a1", "echo", { word: "salut" })] },
				"tool_calls",
			),
			reply({ content: "Fini." }, "stop"),
		]);
		const result = await runTurn({
			complete,
			model: "m",
			tools: [echo],
			history: [
				{ role: "user", content: "avant" },
				{ role: "assistant", content: "ok" },
			],
			content: [{ type: "text", text: "dis salut" }],
			cacheKey: "chat-1",
		});

		expect(result.text).toBe("Fini.");
		expect(result.messages.map((m) => m.role)).toEqual([
			"user",
			"assistant",
			"user",
			"assistant",
			"tool",
			"assistant",
		]);
		expect(result.messages[4]).toMatchObject({
			role: "tool",
			toolCallId: "a1",
			name: "echo",
			content: "echo:salut",
		});
		expect(result.usage).toEqual({
			input: 20,
			output: 10,
			requests: 2,
			toolCalls: 1,
		});
		expect(requests[0]?.messages[0]).toMatchObject({ role: "system" });
		expect(requests[0]?.promptCacheKey).toBe("chat-1");
		expect(requests[1]?.messages).toHaveLength(6);
	});

	it("reports bad arguments and tool failures back to the model instead of crashing", async () => {
		const failing = defineTool({
			name: "boom",
			description: "fails",
			schema: z.object({}),
			run: async () => {
				throw new Error("base injoignable");
			},
		});
		const { complete } = fake([
			reply(
				{
					content: "",
					toolCalls: [
						call("a1", "echo", { word: 3 }),
						call("a2", "boom", {}),
						call("a3", "echo", "{not json"),
					],
				},
				"tool_calls",
			),
			reply({ content: "Désolé." }, "stop"),
		]);
		const result = await runTurn({
			complete,
			model: "m",
			tools: [echo, failing],
			history: [],
			content: [{ type: "text", text: "x" }],
		});
		const tools = result.messages
			.filter((m) => m.role === "tool")
			.map((m) => String(m.content));
		expect(tools[0]).toMatch(/invalid arguments/);
		expect(tools[1]).toBe("Error: base injoignable");
		expect(tools[2]).toMatch(/not valid JSON/);
	});

	it("returns images from a tool inside the tool message", async () => {
		const picture = defineTool({
			name: "picture",
			description: "image",
			schema: z.object({}),
			run: async () => ({
				text: "Image",
				images: [{ data: Buffer.from([1, 2]), type: "image/png" }],
			}),
		});
		const { complete } = fake([
			reply(
				{ content: "", toolCalls: [call("a1", "picture", {})] },
				"tool_calls",
			),
			reply({ content: "Vu." }, "stop"),
		]);
		const result = await runTurn({
			complete,
			model: "m",
			tools: [picture],
			history: [],
			content: [{ type: "text", text: "x" }],
		});
		expect(result.messages[2]?.content).toEqual([
			{ type: "text", text: "Image" },
			{ type: "image_url", imageUrl: "data:image/png;base64,AQI=" },
		]);
	});

	it("says so when the answer was cut off", async () => {
		const { complete } = fake([reply({ content: "Début" }, "length")]);
		const result = await runTurn({
			complete,
			model: "m",
			tools: [echo],
			history: [],
			content: [{ type: "text", text: "x" }],
		});
		expect(result.text).toMatch(/^Début\n\nJe me suis arrêté/);
	});
});

describe("toMistralTool", () => {
	it("produces a function definition with an inlined JSON schema", () => {
		const def = toMistralTool(echo);
		expect(def).toEqual({
			type: "function",
			function: {
				name: "echo",
				description: "echo",
				parameters: {
					type: "object",
					properties: { word: { type: "string" } },
					required: ["word"],
					additionalProperties: false,
				},
			},
		});
	});
});
