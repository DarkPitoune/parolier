import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// Local, on-demand tooling for songs.incipits (run when an ordinaire's score is added or fixed).
//
//   node scripts/extract-incipits.mjs extract <dir> [ordinaire-id ...]
//     Reads each ordinaire's sheet-music PDF (read-only) and asks Claude for the soprano line
//     of each piece's first system as ABC, plus where that staff sits on the page. Writes
//     <dir>/incipits.json, one PNG crop per incipit and <dir>/preview.html. No database write.
//     Review the preview, then edit incipits.json: drop an `abc` you don't trust and the crop
//     is shown instead.
//
//   node scripts/extract-incipits.mjs apply <dir>
//     Uploads the crops and writes songs.incipits from <dir>/incipits.json. Targets
//     SUPABASE_URL (default VITE_SUPABASE_URL) with SUPABASE_SERVICE_ROLE_KEY, read from the
//     environment first, then .env.
//
// Needs `pdftoppm` (poppler) and, for extract, ANTHROPIC_API_KEY.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dotenv = Object.fromEntries(
	readFileSync(join(root, ".env"), "utf8")
		.split("\n")
		.filter((l) => l && !l.startsWith("#") && l.includes("="))
		.map((l) => {
			const i = l.indexOf("=");
			return [
				l.slice(0, i).trim(),
				l
					.slice(i + 1)
					.trim()
					.replace(/^["']|["']$/g, ""),
			];
		}),
);
const env = (name) => process.env[name] ?? dotenv[name];

const [command, dirArg, ...idArgs] = process.argv.slice(2);
if (!["extract", "apply"].includes(command) || !dirArg) {
	console.error(
		"Usage: node scripts/extract-incipits.mjs extract|apply <dir> [ordinaire-id ...]",
	);
	process.exit(1);
}
const dir = resolve(dirArg);
mkdirSync(dir, { recursive: true });

if (command === "extract") await extract();
else await apply();

async function extract() {
	const PAGE_DPI = 110;
	const CROP_DPI = 300;
	const supabase = createClient(
		env("VITE_SUPABASE_URL"),
		env("VITE_SUPABASE_ANON_KEY"),
	);
	const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });

	let query = supabase
		.from("ordinaires")
		.select("id, name, sheet_music_url, songs (id, title, ordinaire_role)")
		.not("sheet_music_url", "is", null)
		.order("id");
	if (idArgs.length) query = query.in("id", idArgs.map(Number));
	const { data: ordinaires, error } = await query;
	if (error) throw error;

	const INCIPIT_SCHEMA = {
		type: "object",
		properties: {
			label: { type: "string" },
			page: {
				type: "integer",
				description: "1-based page index of the system",
			},
			bbox: {
				type: "array",
				items: { type: "number" },
				description:
					"[x0, y0, x1, y1] of the soprano staff of that system, as fractions (0-1) of page width/height, including the lyrics line under it",
			},
			abc: { type: "string" },
			lyrics: { type: "string" },
			confidence: { type: "string", enum: ["high", "medium", "low"] },
			notes: { type: "string" },
		},
		required: ["label", "page", "bbox", "abc", "lyrics", "confidence", "notes"],
		additionalProperties: false,
	};
	const SCHEMA = {
		type: "object",
		properties: {
			pieces: {
				type: "array",
				items: {
					type: "object",
					properties: {
						song_id: { type: "integer" },
						found: { type: "boolean" },
						incipits: { type: "array", items: INCIPIT_SCHEMA },
					},
					required: ["song_id", "found", "incipits"],
					additionalProperties: false,
				},
			},
		},
		required: ["pieces"],
		additionalProperties: false,
	};

	const prompt = (
		ordinaire,
	) => `These images are the pages, in order, of the sheet music for the mass setting "${ordinaire.name}".

For each piece listed below, find where that piece starts in the score and transcribe only the **soprano (top) voice of its very first system** (the first line of music of that piece, not the whole piece). Ignore alto, tenor, bass, accompaniment and chord symbols.

Pieces:
${ordinaire.songs.map((s) => `- song_id ${s.id}: ${s.title} (${s.ordinaire_role})`).join("\n")}

Each piece gets one incipit labelled with its title, except a Kyrie that opens with a penitential psalmody (verses such as "Seigneur Jésus, envoyé par le Père…") before its "Kyrie eleison" refrain: give it two incipits, labelled "Prière pénitentielle" (first system of the psalmody) and "Kyrie" (first system of the refrain).

For each incipit return:
- page: the 1-based page index of that system.
- bbox: the soprano staff of that system as [x0, y0, x1, y1] fractions of the page, wide enough to include the clef, key signature and the lyrics directly under that staff.
- abc: valid ABC notation with headers X:1, M: (meter; use M:none for unmetered psalmody), L: (unit note length), Q: (the metronome mark printed for that piece, e.g. a dotted half = 63 is Q:3/4=63 and a quarter = 72 is Q:1/4=72; when none is printed, give a moderate singing tempo on the felt beat, e.g. Q:3/8=60 in 6/8, and say so in notes — without Q: the player defaults to a racing 180 bpm), K: (key, matching the key signature), then the notes of that system with bar lines as written, but no repeat signs or volta brackets (end on |]): the player would otherwise play the line twice. Respect pitch octave carefully (C = middle C, c = one octave above). Use the soprano notes even when the staff shares stems with alto (take the upper note). Shorten psalmody reciting notes (breves) to whole notes.
- lyrics: the text sung under that system (first verse only).
- confidence: how sure you are of the pitches and rhythms.
- notes: anything ambiguous.

If two listed pieces have the same role (duplicates), they refer to the same music: return the same transcription for both. If a piece is not in this score, set found to false and return no incipits.`;

	const results = [];
	for (const ordinaire of ordinaires) {
		console.log(`\n▶ ${ordinaire.name} (${ordinaire.songs.length} pieces)`);
		const slug = `ordinaire-${ordinaire.id}`;
		const pdfPath = join(dir, `${slug}.pdf`);
		const pdfUrl = `${env("VITE_SUPABASE_URL")}/storage/v1/object/public${ordinaire.sheet_music_url}`;
		const res = await fetch(pdfUrl);
		if (!res.ok) {
			console.error(`  ✗ ${res.status} fetching ${pdfUrl}`);
			continue;
		}
		writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()));
		execFileSync("pdftoppm", [
			"-r",
			String(PAGE_DPI),
			"-png",
			pdfPath,
			join(dir, slug),
		]);
		const pages = readdirSync(dir)
			.filter((f) => f.startsWith(`${slug}-`) && f.endsWith(".png"))
			.sort();

		const content = [];
		pages.forEach((file, i) => {
			content.push({ type: "text", text: `Page ${i + 1}:` });
			content.push({
				type: "image",
				source: {
					type: "base64",
					media_type: "image/png",
					data: readFileSync(join(dir, file)).toString("base64"),
				},
			});
		});
		content.push({ type: "text", text: prompt(ordinaire) });

		const message = await anthropic.messages
			.stream({
				model: "claude-opus-5-5",
				max_tokens: 64000,
				output_config: {
					effort: "high",
					format: { type: "json_schema", schema: SCHEMA },
				},
				messages: [{ role: "user", content }],
			})
			.finalMessage();
		if (message.stop_reason !== "end_turn") {
			console.error(`  ✗ stop_reason ${message.stop_reason}`);
			continue;
		}
		const { pieces } = JSON.parse(
			message.content.find((b) => b.type === "text")?.text ?? "",
		);
		console.log(
			`  ✓ ${pieces.length} pieces, ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`,
		);

		const [pageW, pageH] = pdfPageSize(pdfPath);
		for (const piece of pieces) {
			const song = ordinaire.songs.find((s) => s.id === piece.song_id);
			if (!piece.found || !song) continue;
			results.push({
				song_id: piece.song_id,
				title: song.title,
				ordinaire: ordinaire.name,
				incipits: piece.incipits.map((incipit, n) => {
					const crop = `crop-${piece.song_id}-${n + 1}`;
					const [x0, y0, x1, y1] = incipit.bbox;
					const px = (v, size) =>
						String(Math.round((v * size * CROP_DPI) / 72));
					execFileSync("pdftoppm", [
						"-r",
						String(CROP_DPI),
						"-f",
						String(incipit.page),
						"-l",
						String(incipit.page),
						"-singlefile",
						"-x",
						px(x0, pageW),
						"-y",
						px(y0, pageH),
						"-W",
						px(x1 - x0, pageW),
						"-H",
						px(y1 - y0, pageH),
						"-png",
						pdfPath,
						join(dir, crop),
					]);
					return {
						label: incipit.label,
						abc: incipit.abc,
						crop: `${crop}.png`,
						lyrics: incipit.lyrics,
						confidence: incipit.confidence,
						notes: incipit.notes,
					};
				}),
			});
		}
	}

	writeFileSync(join(dir, "incipits.json"), JSON.stringify(results, null, 2));
	writeFileSync(join(dir, "preview.html"), renderPreview(results));
	console.log(`\nWrote ${join(dir, "incipits.json")} and preview.html`);
}

async function apply() {
	const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
	const key = env("SUPABASE_SERVICE_ROLE_KEY");
	if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for apply");
	const supabase = createClient(url, key);
	const entries = JSON.parse(readFileSync(join(dir, "incipits.json"), "utf8"));
	console.log(`Applying ${entries.length} songs to ${url}`);

	for (const entry of entries) {
		const incipits = [];
		for (const incipit of entry.incipits) {
			const stored = { label: incipit.label };
			if (incipit.abc) stored.abc = incipit.abc;
			if (incipit.crop) {
				const png = readFileSync(join(dir, incipit.crop));
				// Content-addressed so the service worker can cache crops forever.
				const hash = createHash("sha256")
					.update(png)
					.digest("hex")
					.slice(0, 12);
				const objectPath = `incipits/${entry.song_id}-${hash}.png`;
				const { error } = await supabase.storage
					.from("sheet-music")
					.upload(objectPath, png, { contentType: "image/png", upsert: true });
				if (error) throw error;
				stored.image_path = `/sheet-music/${objectPath}`;
			}
			incipits.push(stored);
		}
		const { error } = await supabase
			.from("songs")
			.update({ incipits })
			.eq("id", entry.song_id);
		if (error) throw error;
		console.log(
			`  ✓ ${entry.song_id} ${entry.title}: ${incipits.map((i) => i.label).join(", ")}`,
		);
	}
}

function pdfPageSize(pdfPath) {
	const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
	const [, w, h] = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);
	return [Number(w), Number(h)];
}

function renderPreview(entries) {
	const esc = (s) =>
		String(s ?? "").replace(
			/[&<>"]/g,
			(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
		);
	const rows = entries.flatMap((e) =>
		e.incipits.map((i) => ({
			...i,
			song_id: e.song_id,
			title: e.title,
			ordinaire: e.ordinaire,
		})),
	);
	const cards = rows
		.map(
			(
				r,
				k,
			) => `<section><h2>${esc(r.ordinaire)} — ${esc(r.title)} · ${esc(r.label)} <small>song ${r.song_id} · ${esc(r.confidence)}</small></h2>
<img src="${esc(r.crop)}"><div id="abc${k}"></div><button data-i="${k}">▶</button>
<p class="lyrics">${esc(r.lyrics)}</p>${r.notes ? `<p class="notes">${esc(r.notes)}</p>` : ""}<pre>${esc(r.abc)}</pre></section>`,
		)
		.join("\n");
	return `<!doctype html><html><head><meta charset="utf-8"><title>Incipits</title>
<script src="https://cdn.jsdelivr.net/npm/abcjs@6/dist/abcjs-basic-min.js"></script>
<style>body{font-family:system-ui;max-width:1100px;margin:auto;padding:16px}section{border-bottom:1px solid #ccc;padding:12px 0}
img{width:100%;border:1px solid #aaa}pre{background:#f4f4f4;padding:8px;font-size:12px}.notes{color:#a60}.lyrics{font-style:italic}small{color:#777;font-weight:normal}</style>
</head><body><h1>Incipits extraits</h1>${cards}
<script>const abc=${JSON.stringify(rows.map((r) => r.abc))};
const v=abc.map((a,i)=>a?ABCJS.renderAbc("abc"+i,a,{responsive:"resize"})[0]:null);
document.querySelectorAll("button").forEach(b=>b.onclick=async()=>{const t=v[b.dataset.i];if(!t)return;
const s=new ABCJS.synth.CreateSynth();await s.init({visualObj:t});await s.prime();s.start();});</script></body></html>`;
}
