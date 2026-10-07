import { describe, expect, it } from "vitest";
import {
	functionErrorMessage,
	parseRefineResponse,
	parseSuggestResponse,
} from "./veilleeResponse";

describe("parseSuggestResponse", () => {
	it("returns the summary and well-formed items", () => {
		expect(
			parseSuggestResponse({
				success: true,
				summary: "Sur la confiance",
				items: [
					{
						slot: "louange",
						songId: 1,
						reasoning: "Ouvre fort",
						alternatives: [2],
					},
					{ slot: "esprit", songId: 3 },
					{ slot: "louange", songId: "4" },
					null,
				],
			}),
		).toEqual({
			summary: "Sur la confiance",
			items: [
				{
					slot: "louange",
					songId: 1,
					reasoning: "Ouvre fort",
					alternatives: [2],
				},
				{ slot: "esprit", songId: 3, reasoning: "", alternatives: [] },
			],
		});
	});

	it("surfaces the function's error, or a fallback", () => {
		expect(() =>
			parseSuggestResponse({ success: false, error: "Mistral down" }),
		).toThrow("Mistral down");
		expect(() => parseSuggestResponse(null)).toThrow(
			"Aucune suggestion retournée",
		);
		expect(() => parseSuggestResponse({ success: true })).toThrow(
			"Aucune suggestion retournée",
		);
	});
});

describe("parseRefineResponse", () => {
	it("returns the reply and ops that have a name", () => {
		expect(
			parseRefineResponse({
				success: true,
				reply: "C'est fait",
				ops: [{ op: "remove", key: "song-1" }, { key: "song-2" }, "x"],
			}),
		).toEqual({ reply: "C'est fait", ops: [{ op: "remove", key: "song-1" }] });
	});

	it("tolerates a missing reply or ops", () => {
		expect(parseRefineResponse({ success: true })).toEqual({
			reply: "",
			ops: [],
		});
	});

	it("surfaces the function's error, or a fallback", () => {
		expect(() =>
			parseRefineResponse({ success: false, error: "trop long" }),
		).toThrow("trop long");
		expect(() => parseRefineResponse(undefined)).toThrow(
			"Pas de réponse de l'assistant",
		);
	});
});

describe("functionErrorMessage", () => {
	const httpError = (body: string) =>
		Object.assign(new Error("Edge Function returned a non-2xx status code"), {
			context: new Response(body, { status: 500 }),
		});

	it("reads the function's error from the response body", async () => {
		expect(
			await functionErrorMessage(
				httpError(JSON.stringify({ success: false, error: "Mistral down" })),
			),
		).toBe("Mistral down");
	});

	it("falls back to the error's own message", async () => {
		expect(await functionErrorMessage(httpError("<html>"))).toBe(
			"Edge Function returned a non-2xx status code",
		);
		expect(await functionErrorMessage(new Error("offline"))).toBe("offline");
	});
});
