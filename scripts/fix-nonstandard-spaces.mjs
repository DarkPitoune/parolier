// Fix "bad" U+00A0 NO-BREAK SPACE occurrences in the songs table.
//
// Rule — French typography: an NBSP is KEPT if and only if it is
//   - directly followed by  ! ? ; : »
//   - OR directly preceded by «
// All other NBSPs are replaced with a regular space (U+0020).
//
// Usage:
//   node scripts/fix-nonstandard-spaces.mjs           # dry-run (default)
//   node scripts/fix-nonstandard-spaces.mjs --apply   # actually update rows

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const MODE = APPLY ? "APPLY (writing changes)" : "DRY-RUN (no writes)";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const env = Object.fromEntries(
	readFileSync(envPath, "utf8")
		.split("\n")
		.filter((l) => l && !l.startsWith("#") && l.includes("="))
		.map((l) => {
			const i = l.indexOf("=");
			return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
		}),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const NBSP = " ";
const KEEP_AFTER = new Set(["!", "?", ";", ":", "»"]);
const KEEP_BEFORE = new Set(["«"]);

function fixString(s) {
	if (typeof s !== "string" || !s.includes(NBSP)) return { value: s, changed: 0, kept: 0 };
	let changed = 0;
	let kept = 0;
	let out = "";
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c !== NBSP) {
			out += c;
			continue;
		}
		const next = s[i + 1];
		const prev = s[i - 1];
		if (KEEP_AFTER.has(next) || KEEP_BEFORE.has(prev)) {
			out += NBSP;
			kept++;
		} else {
			out += " ";
			changed++;
		}
	}
	return { value: out, changed, kept };
}

function fixJson(value) {
	if (typeof value === "string") {
		const r = fixString(value);
		return { value: r.value, changed: r.changed, kept: r.kept };
	}
	if (Array.isArray(value)) {
		let changed = 0;
		let kept = 0;
		const out = value.map((v) => {
			const r = fixJson(v);
			changed += r.changed;
			kept += r.kept;
			return r.value;
		});
		return { value: out, changed, kept };
	}
	if (value && typeof value === "object") {
		let changed = 0;
		let kept = 0;
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			const r = fixJson(v);
			changed += r.changed;
			kept += r.kept;
			out[k] = r.value;
		}
		return { value: out, changed, kept };
	}
	return { value, changed: 0, kept: 0 };
}

function diffSnippet(before, after) {
	const limit = 200;
	const visBefore = before.replace(/ /g, "«NBSP»");
	const visAfter = after.replace(/ /g, "«NBSP»");
	const b = visBefore.length > limit ? `${visBefore.slice(0, limit)}…` : visBefore;
	const a = visAfter.length > limit ? `${visAfter.slice(0, limit)}…` : visAfter;
	return { before: b, after: a };
}

function* walkStrings(value, path) {
	if (typeof value === "string") yield [path, value];
	else if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) yield* walkStrings(value[i], `${path}[${i}]`);
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) yield* walkStrings(v, `${path}.${k}`);
	}
}

console.log(`\nMode: ${MODE}\n`);

const PAGE = 1000;
let from = 0;
let totalScanned = 0;
let totalSongsTouched = 0;
let totalReplaced = 0;
let totalKept = 0;
let totalWriteFailures = 0;

while (true) {
	const { data, error } = await supabase
		.from("songs")
		.select("id, title, type, ordinaire_role, strophes, sheet_music_url")
		.order("id")
		.range(from, from + PAGE - 1);
	if (error) {
		console.error("Supabase read error:", error);
		process.exit(1);
	}
	if (!data || data.length === 0) break;
	totalScanned += data.length;

	for (const song of data) {
		const updates = {};
		let songReplaced = 0;
		let songKept = 0;
		const diffs = [];

		for (const field of ["title", "ordinaire_role", "sheet_music_url"]) {
			const orig = song[field];
			if (typeof orig !== "string" || !orig.includes(NBSP)) continue;
			const r = fixString(orig);
			songKept += r.kept;
			if (r.changed > 0) {
				updates[field] = r.value;
				songReplaced += r.changed;
				diffs.push({ path: field, ...diffSnippet(orig, r.value) });
			}
		}

		if (song.strophes && Array.isArray(song.strophes)) {
			const r = fixJson(song.strophes);
			songKept += r.kept;
			if (r.changed > 0) {
				updates.strophes = r.value;
				songReplaced += r.changed;
				const beforeMap = new Map();
				for (const [p, s] of walkStrings(song.strophes, "strophes")) beforeMap.set(p, s);
				for (const [p, after] of walkStrings(r.value, "strophes")) {
					const before = beforeMap.get(p);
					if (before !== after && before?.includes(NBSP)) {
						diffs.push({ path: p, ...diffSnippet(before, after) });
					}
				}
			}
		}

		if (songReplaced === 0) continue;

		totalSongsTouched++;
		totalReplaced += songReplaced;
		totalKept += songKept;

		console.log(`\n[song ${song.id}] ${song.title}`);
		console.log(`  replacing ${songReplaced} NBSP(s), keeping ${songKept} typographic NBSP(s)`);
		for (const d of diffs) {
			console.log(`  ${d.path}`);
			console.log(`    BEFORE: ${d.before}`);
			console.log(`    AFTER : ${d.after}`);
		}

		if (APPLY) {
			const { error: updateError } = await supabase
				.from("songs")
				.update(updates)
				.eq("id", song.id);
			if (updateError) {
				totalWriteFailures++;
				console.log(`  !! UPDATE FAILED: ${updateError.message}`);
			} else {
				console.log("  ✓ updated");
			}
		}
	}

	if (data.length < PAGE) break;
	from += PAGE;
}

console.log("\n----- Summary -----");
console.log(`Mode:                    ${MODE}`);
console.log(`Songs scanned:           ${totalScanned}`);
console.log(`Songs with bad NBSPs:    ${totalSongsTouched}`);
console.log(`NBSPs replaced:          ${totalReplaced}`);
console.log(`NBSPs kept (typography): ${totalKept}`);
if (APPLY) console.log(`Update failures:         ${totalWriteFailures}`);
if (!APPLY)
	console.log("\nRun with --apply to write these changes to the database.");
