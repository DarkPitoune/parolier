import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Catalogue } from "../catalogue";
import { makeDb } from "../supabase";
import { catalogueTools } from "./catalogue";
import { SongIndex, type ToolContext } from "./context";
import { ordinaireTools } from "./ordinaires";
import { setlistTools } from "./setlists";
import { songTools } from "./songs";

const run = Date.now();
const entryLine = {
	text: `Sa parole est lumière ${run}, alléluia !`,
	chords: "Am E",
};
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_KEY;

function catalogueFile(): string {
	const file = path.join(
		mkdtempSync(path.join(tmpdir(), "catalogue-")),
		"index.html",
	);
	const entries = [
		{
			cid: 75434,
			cote: "04-58",
			title: `Sa parole est lumière ${run}`,
			tags: ["Louange"],
			carnet: true,
			main: true,
			hasChords: true,
			strophes: [{ type: "chorus", repetition: false, content: [entryLine] }],
		},
	];
	writeFileSync(
		file,
		`<script type="application/json" id="data">${JSON.stringify(entries)}</script>`,
	);
	return file;
}

describe.runIf(url && key)("tools against the local Supabase stack", () => {
	const ctx: ToolContext = {
		db: makeDb(String(url), String(key), "telegram:test"),
		catalogue: new Catalogue(catalogueFile()),
		appUrl: "https://parolier.test",
		songIndex: new SongIndex(),
	};
	const tools = Object.fromEntries(
		[
			...songTools(ctx),
			...catalogueTools(ctx),
			...ordinaireTools(ctx),
			...setlistTools(ctx),
		].map((t) => [t.name, t]),
	);
	const call = async (name: string, input: unknown) => {
		const tool = tools[name];
		if (!tool) throw new Error(`no tool ${name}`);
		return JSON.parse(String(await tool.run(tool.schema.parse(input))));
	};

	it("finds seeded songs and refuses to duplicate them", async () => {
		const hits = await call("search_songs", { query: "tu es la" });
		expect(hits[0]).toMatchObject({ id: 601, title: "Tu es là" });

		const refused = await call("create_song", {
			title: "Tu es là",
			language: "fr",
			strophes: [
				{
					type: "verse",
					repetition: false,
					content: [{ text: "Autre texte", chords: "" }],
				},
			],
			tag_ids: [],
		});
		expect(refused).toMatchObject({
			created: false,
			reason: "likely_duplicate",
			candidates: [{ id: 601 }],
		});
	});

	it("creates a song with tags, and only from the fixed tag list", async () => {
		const title = `Nuit de lumière ${run}`;
		const strophes = [
			{
				type: "chorus",
				repetition: true,
				content: [{ text: `Nuit de lumière ${run}`, chords: "D A" }],
			},
		];
		await expect(
			call("create_song", {
				title,
				language: "fr",
				strophes,
				tag_ids: [999999],
			}),
		).rejects.toThrow(/Unknown tag ids/);

		const created = await call("create_song", {
			title,
			language: "fr",
			strophes,
			tag_ids: [901],
		});
		expect(created).toMatchObject({
			created: true,
			url: expect.stringContaining("/songs/"),
		});
		const song = await call("get_song", { id: created.id });
		expect(song.tags).toEqual([{ id: 901, name: "Louange" }]);
		expect(song.strophes[0]).toMatchObject({
			type: "chorus",
			content: [{ chords: "D A" }],
		});
	});

	it("edits one strophe, keeps its note, records the revision and undoes it", async () => {
		const before = await call("get_song", { id: 602 });
		expect(before.strophes[0].has_note).toBe(true);

		const edited = await call("edit_song", {
			id: 602,
			version: before.version,
			strophe_edits: [
				{
					op: "replace",
					index: 0,
					strophe: {
						type: "verse",
						repetition: false,
						content: [{ text: "Je vous salue, Marie", chords: "G" }],
					},
				},
			],
		});
		expect(edited).toMatchObject({ updated: true });
		const after = await call("get_song", { id: 602 });
		expect(after.strophes[0]).toMatchObject({
			content: [{ text: "Je vous salue, Marie" }],
			has_note: true,
		});

		const stale = await call("edit_song", {
			id: 602,
			version: before.version,
			title: "x",
		});
		expect(stale).toMatchObject({
			updated: false,
			reason: "changed_since_read",
		});

		const hidden = await ctx.db.from("song_revisions").select("id").limit(1);
		expect(hidden.error?.message).toMatch(/permission denied/);
		if (serviceKey) {
			const admin = makeDb(String(url), serviceKey, "test");
			const revision = await admin
				.from("song_revisions")
				.select("source")
				.eq("song_id", 602)
				.order("id", { ascending: false })
				.limit(1)
				.single();
			expect(revision.data?.source).toBe("telegram:test");
		}

		await call("undo_song_edit", { id: 602 });
		const restored = await call("get_song", { id: 602 });
		expect(restored.version).toBe(before.version);
	});

	it("creates a setlist with songs and text items in order, then appends", async () => {
		const created = await call("create_setlist", {
			name: `Veillée test ${Date.now()}`,
			tags: ["veillée"],
			items: [{ song_id: 601 }, { text: "Silence" }, { song_id: 602 }],
		});
		expect(created).toMatchObject({ created: true, items: 3 });
		await call("append_to_setlist", {
			id: created.id,
			items: [{ song_id: 601 }],
		});
		const setlist = await call("get_setlist", { id: created.id });
		expect(
			setlist.items.map(
				(i: { song_id?: number; text?: string }) => i.song_id ?? i.text,
			),
		).toEqual([601, "Silence", 602, 601]);

		await expect(
			call("create_setlist", {
				name: "x",
				tags: [],
				items: [{ song_id: 999999 }],
			}),
		).rejects.toThrow(/No song/);
	});

	it("imports a catalogue song exactly once", async () => {
		const [hit] = await call("search_catalogue", {
			query: `sa parole est lumiere ${run}`,
		});
		expect(hit).toMatchObject({ cid: 75434, in_parolier: [] });

		const imported = await call("import_from_catalogue", {
			cid: 75434,
			tag_ids: [901],
		});
		expect(imported).toMatchObject({ created: true, cote: "04-58" });
		const song = await call("get_song", { id: imported.id });
		expect(song.strophes[0].content[0]).toEqual(entryLine);

		const [again] = await call("search_catalogue", {
			query: `sa parole est lumiere ${run}`,
		});
		expect(again.in_parolier).toEqual([imported.id]);
		const refused = await call("import_from_catalogue", {
			cid: 75434,
			tag_ids: [],
		});
		expect(refused).toMatchObject({
			created: false,
			reason: "likely_duplicate",
		});
	});

	it("builds a Mass ordinary part by part, one part per role", async () => {
		const existing = await call("create_ordinaire", {
			name: "messe de saint jean",
		});
		expect(existing).toMatchObject({ created: false, id: 701 });
		const [hit] = await call("search_songs", { query: "messe de saint jean" });
		expect(hit).toMatchObject({ id: 604, type: "ordinaire" });

		const created = await call("create_ordinaire", {
			name: `Messe de lumière ${run}`,
		});
		expect(created).toMatchObject({
			created: true,
			url: expect.stringContaining("/ordinaires/"),
		});
		const part = await call("add_ordinaire_part", {
			ordinaire_id: created.id,
			role: "kyrie",
			cid: 75434,
		});
		expect(part).toMatchObject({ created: true, role: "kyrie" });
		const song = await call("get_song", { id: part.song_id });
		expect(song).toMatchObject({
			title: "Kyrie",
			type: "ordinaire",
			ordinaire: { id: created.id, role: "kyrie" },
		});
		expect(song.strophes[0].content[0]).toEqual(entryLine);

		const again = await call("add_ordinaire_part", {
			ordinaire_id: created.id,
			role: "kyrie",
			strophes: [
				{
					type: "verse",
					repetition: false,
					content: [{ text: "Kyrie eleison", chords: "" }],
				},
			],
		});
		expect(again).toMatchObject({
			created: false,
			reason: "role_taken",
			song_id: part.song_id,
		});

		const [listed] = (await call("list_ordinaires", {})).filter(
			(o: { id: number }) => o.id === created.id,
		);
		expect(listed.parts).toEqual([
			{ song_id: part.song_id, role: "kyrie", title: "Kyrie" },
		]);
		expect(listed.missing_roles).not.toContain("kyrie");
	});
});
