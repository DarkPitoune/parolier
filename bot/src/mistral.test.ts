import type { ConversationResponse } from "@mistralai/mistralai/models/components";
import { describe, expect, it } from "vitest";
import { readSearchResponse } from "./mistral";

describe("readSearchResponse", () => {
	it("keeps the answer text and the cited pages, once each", () => {
		const res = {
			object: "conversation.response",
			conversationId: "c",
			usage: {},
			outputs: [
				{ type: "tool.execution", name: "web_search" },
				{
					type: "message.output",
					role: "assistant",
					content: [
						{ type: "text", text: "Deux pages : " },
						{
							type: "tool_reference",
							tool: "web_search",
							title: "Nuit de lumière",
							url: "https://a.example/nuit",
						},
						{ type: "text", text: "et une partition." },
						{
							type: "tool_reference",
							tool: "web_search",
							title: "Nuit de lumière",
							url: "https://a.example/nuit",
						},
						{
							type: "tool_reference",
							tool: "web_search",
							title: "PDF",
							url: "https://b.example/nuit.pdf",
						},
					],
				},
			],
		} as unknown as ConversationResponse;
		expect(readSearchResponse(res)).toEqual({
			answer: "Deux pages : et une partition.",
			sources: [
				{ title: "Nuit de lumière", url: "https://a.example/nuit" },
				{ title: "PDF", url: "https://b.example/nuit.pdf" },
			],
		});
	});
});
