import { MistralCore } from "@mistralai/mistralai/core.js";
import { HTTPClient } from "@mistralai/mistralai/lib/http.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runTurn } from "./agent";
import { complete } from "./mistral";
import { defineTool } from "./tools/tool";

function capturingClient(responses: unknown[]) {
	const bodies: Array<Record<string, unknown>> = [];
	const httpClient = new HTTPClient({
		fetcher: async (input, init) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			bodies.push(JSON.parse(await request.text()));
			return new Response(JSON.stringify(responses.shift()), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		},
	});
	return { client: new MistralCore({ apiKey: "test", httpClient }), bodies };
}

const completion = (
	message: Record<string, unknown>,
	finish_reason: string,
) => ({
	id: "x",
	object: "chat.completion",
	model: "m",
	created: 0,
	usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
	choices: [
		{ index: 0, message: { role: "assistant", ...message }, finish_reason },
	],
});

describe("requests as sent to the Mistral API", () => {
	it("serialises images, tool calls and tool results in the API's own field names", async () => {
		const picture = defineTool({
			name: "picture",
			description: "image",
			schema: z.object({ url: z.string() }),
			run: async () => ({
				text: "Image",
				images: [{ data: Buffer.from([1, 2]), type: "image/png" }],
			}),
		});
		const { client, bodies } = capturingClient([
			completion(
				{
					content: "",
					tool_calls: [
						{
							id: "abc123XYZ",
							type: "function",
							function: {
								name: "picture",
								arguments: '{"url":"https://a.example/x.png"}',
							},
						},
					],
				},
				"tool_calls",
			),
			completion({ content: "Vu." }, "stop"),
		]);

		const result = await runTurn({
			complete: (request) => complete(client, request),
			model: "mistral-large-latest",
			tools: [picture],
			history: [],
			content: [
				{ type: "text", text: "regarde" },
				{ type: "image_url", imageUrl: "data:image/jpeg;base64,AA==" },
			],
			cacheKey: "chat-1",
		});

		expect(result.text).toBe("Vu.");
		const second = bodies[1] as {
			messages: Array<Record<string, unknown>>;
			tools: unknown[];
			prompt_cache_key: string;
		};
		expect(second.prompt_cache_key).toBe("chat-1");
		expect(second.messages[1]).toEqual({
			role: "user",
			content: [
				{ type: "text", text: "regarde" },
				{ type: "image_url", image_url: "data:image/jpeg;base64,AA==" },
			],
		});
		expect(second.messages[2]).toMatchObject({
			role: "assistant",
			tool_calls: [{ id: "abc123XYZ", function: { name: "picture" } }],
		});
		expect(second.messages[3]).toMatchObject({
			role: "tool",
			tool_call_id: "abc123XYZ",
			name: "picture",
			content: [
				{ type: "text", text: "Image" },
				{ type: "image_url", image_url: "data:image/png;base64,AQI=" },
			],
		});
		expect(second.tools).toHaveLength(1);
	});
});
