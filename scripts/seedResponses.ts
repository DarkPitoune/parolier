/**
 * Seeds assembly responses of the Mass into the `songs` table as type="response".
 *
 * Run with: pnpm tsx scripts/seedResponses.ts
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env and inserts via
 * the anon key — the same path the app uses client-side, so RLS applies.
 * Idempotent: skips any (type="response", title) that already exists.
 *
 * Pass --reset to delete all existing type="response" rows first (use after
 * editing wording/titles/roles in responsesData.ts for a clean re-seed).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { RESPONSES } from "./responsesData";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(): Record<string, string> {
	const envPath = resolve(__dirname, "../.env");
	const out: Record<string, string> = {};
	for (const raw of readFileSync(envPath, "utf8").split("\n")) {
		const l = raw.trim();
		if (!l || l.startsWith("#")) continue;
		const eq = l.indexOf("=");
		if (eq === -1) continue;
		const key = l.slice(0, eq).trim();
		let val = l.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		out[key] = val;
	}
	return out;
}

async function main() {
	const env = loadEnv();
	const url = env.VITE_SUPABASE_URL;
	const key = env.VITE_SUPABASE_ANON_KEY;
	if (!url || !key)
		throw new Error(
			"Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env",
		);

	const supabase = createClient(url, key);
	const reset = process.argv.includes("--reset");

	if (reset) {
		const { error } = await supabase
			.from("songs")
			.delete()
			.eq("type", "response");
		if (error) throw error;
		console.log("🗑  deleted existing type=response rows\n");
	}

	const { data: existing, error: fetchErr } = await supabase
		.from("songs")
		.select("title")
		.eq("type", "response");
	if (fetchErr) throw fetchErr;
	const existingTitles = new Set((existing ?? []).map((r) => r.title));

	let inserted = 0;
	let skipped = 0;
	for (const r of RESPONSES) {
		if (existingTitles.has(r.title)) {
			console.log(`⏭  skip (exists): ${r.title}`);
			skipped++;
			continue;
		}
		const { error } = await supabase.from("songs").insert({
			title: r.title,
			type: "response",
			ordinaire_role: r.role,
			strophes: r.strophes,
		});
		if (error) {
			console.error(`✗  ${r.title}: ${error.message}`);
			continue;
		}
		console.log(`✓  inserted: ${r.title}`);
		inserted++;
	}
	console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
