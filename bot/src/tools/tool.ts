import type { Tool as MistralTool } from "@mistralai/mistralai/models/components";
import { z } from "zod";

export interface ToolImage {
	data: Buffer;
	type: string;
}

export type ToolOutput = string | { text: string; images: ToolImage[] };

export interface Tool<S extends z.ZodType = z.ZodType> {
	name: string;
	description: string;
	schema: S;
	run: (input: z.infer<S>) => Promise<ToolOutput>;
}

export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool {
	return tool as unknown as Tool;
}

export function toMistralTool(tool: Tool): MistralTool {
	const { $schema: _ignored, ...parameters } = z.toJSONSchema(tool.schema, {
		target: "draft-7",
		reused: "inline",
		unrepresentable: "any",
	}) as Record<string, unknown>;
	return {
		type: "function",
		function: { name: tool.name, description: tool.description, parameters },
	};
}
