import { readFileSync, statSync } from "node:fs";
import type { Strophe } from "@/assets/types";
import { z } from "zod";
import { type Indexed, indexItem } from "./text";

const entrySchema = z.object({
	cid: z.number(),
	cote: z.string(),
	title: z.string(),
	tags: z.array(z.string()),
	carnet: z.boolean(),
	main: z.boolean(),
	hasChords: z.boolean(),
	strophes: z.array(z.any()),
});

export interface CatalogueEntry {
	cid: number;
	cote: string;
	title: string;
	tags: string[];
	carnet: boolean;
	main: boolean;
	hasChords: boolean;
	strophes: Strophe[];
}

export function parseCatalogueHtml(html: string): CatalogueEntry[] {
	const match = html.match(
		/<script[^>]*id=["']data["'][^>]*>([\s\S]*?)<\/script>/,
	);
	if (!match?.[1])
		throw new Error('No <script id="data"> block in the import page');
	return z.array(entrySchema).parse(JSON.parse(match[1])) as CatalogueEntry[];
}

/** The song list embedded in the import page, re-parsed when the file changes. */
export class Catalogue {
	#entries: Indexed<CatalogueEntry>[] = [];
	#byCid = new Map<number, CatalogueEntry>();
	#mtimeMs = -1;

	constructor(private readonly path: string) {}

	#refresh(): void {
		const { mtimeMs } = statSync(this.path);
		if (mtimeMs === this.#mtimeMs) return;
		const entries = parseCatalogueHtml(readFileSync(this.path, "utf8"));
		this.#entries = entries.map(indexItem);
		this.#byCid = new Map(entries.map((e) => [e.cid, e]));
		this.#mtimeMs = mtimeMs;
	}

	entries(): Indexed<CatalogueEntry>[] {
		this.#refresh();
		return this.#entries;
	}

	get(cid: number): CatalogueEntry | undefined {
		this.#refresh();
		return this.#byCid.get(cid);
	}

	get size(): number {
		return this.entries().length;
	}
}
