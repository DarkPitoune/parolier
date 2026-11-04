import { mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Catalogue, parseCatalogueHtml } from "./catalogue";
import { search } from "./text";

const entry = (cid: number, title: string) => ({
	cid,
	cote: "04-58",
	title,
	tags: ["Louange"],
	carnet: true,
	main: true,
	hasChords: true,
	strophes: [
		{
			type: "chorus",
			repetition: false,
			content: [{ text: `${title}, alléluia !`, chords: "Am E" }],
		},
	],
});

const page = (entries: unknown[]) =>
	`<!doctype html><html><body><script>const SONGS = JSON.parse(document.getElementById('data').textContent);</script><script type="application/json" id="data">${JSON.stringify(entries)}</script></body></html>`;

describe("parseCatalogueHtml", () => {
	it("reads the embedded song list", () => {
		const entries = parseCatalogueHtml(
			page([entry(1, "Sa parole est lumière")]),
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.strophes[0]).toMatchObject({ type: "chorus" });
	});

	it("fails loudly when the page has no data block", () => {
		expect(() => parseCatalogueHtml("<html></html>")).toThrow(/id="data"/);
	});

	it.runIf(process.env.CATALOGUE_FIXTURE)(
		"parses the real import page",
		async () => {
			const { readFileSync } = await import("node:fs");
			const entries = parseCatalogueHtml(
				readFileSync(String(process.env.CATALOGUE_FIXTURE), "utf8"),
			);
			expect(entries.length).toBeGreaterThan(1000);
		},
	);
});

describe("Catalogue", () => {
	it("reloads when the file changes", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "catalogue-"));
		const file = path.join(dir, "index.html");
		writeFileSync(file, page([entry(1, "Sa parole est lumière")]));
		const catalogue = new Catalogue(file);
		expect(catalogue.size).toBe(1);

		writeFileSync(
			file,
			page([
				entry(1, "Sa parole est lumière"),
				entry(2, "Source de la lumière"),
			]),
		);
		const later = new Date(Date.now() + 5000);
		utimesSync(file, later, later);
		expect(catalogue.size).toBe(2);
		expect(
			search(catalogue.entries(), "source de la lumiere")[0]?.item.cid,
		).toBe(2);
		expect(catalogue.get(2)?.title).toBe("Source de la lumière");
	});
});
