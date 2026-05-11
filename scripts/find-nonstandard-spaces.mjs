// One-off scan: find non-standard space / invisible characters in the songs table.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

// Map: code point (number) -> human label
const SUSPECT_LIST = [
	[0x00a0, "U+00A0 NO-BREAK SPACE"],
	[0x1680, "U+1680 OGHAM SPACE MARK"],
	[0x2000, "U+2000 EN QUAD"],
	[0x2001, "U+2001 EM QUAD"],
	[0x2002, "U+2002 EN SPACE"],
	[0x2003, "U+2003 EM SPACE"],
	[0x2004, "U+2004 THREE-PER-EM SPACE"],
	[0x2005, "U+2005 FOUR-PER-EM SPACE"],
	[0x2006, "U+2006 SIX-PER-EM SPACE"],
	[0x2007, "U+2007 FIGURE SPACE"],
	[0x2008, "U+2008 PUNCTUATION SPACE"],
	[0x2009, "U+2009 THIN SPACE"],
	[0x200a, "U+200A HAIR SPACE"],
	[0x200b, "U+200B ZERO WIDTH SPACE"],
	[0x200c, "U+200C ZERO WIDTH NON-JOINER"],
	[0x200d, "U+200D ZERO WIDTH JOINER"],
	[0x202f, "U+202F NARROW NO-BREAK SPACE"],
	[0x205f, "U+205F MEDIUM MATHEMATICAL SPACE"],
	[0x3000, "U+3000 IDEOGRAPHIC SPACE"],
	[0xfeff, "U+FEFF ZERO WIDTH NO-BREAK SPACE (BOM)"],
	[0x0085, "U+0085 NEXT LINE (NEL)"],
	[0x00ad, "U+00AD SOFT HYPHEN"],
	[0x2028, "U+2028 LINE SEPARATOR"],
	[0x2029, "U+2029 PARAGRAPH SEPARATOR"],
	[0x000b, "U+000B VERTICAL TAB"],
	[0x000c, "U+000C FORM FEED"],
];

const LABEL = new Map(SUSPECT_LIST.map(([cp, label]) => [cp, label]));
const SHORT = new Map(
	SUSPECT_LIST.map(([cp, label]) => [cp, label.split(" ")[0]]),
);

const charClass = SUSPECT_LIST.map(([cp]) =>
	`\\u{${cp.toString(16)}}`,
).join("");
const SUSPECT_RE = new RegExp(`[${charClass}]`, "gu");

function visualize(s) {
	return s.replace(SUSPECT_RE, (c) => `«${SHORT.get(c.codePointAt(0))}»`);
}

function* walk(value, path) {
	if (typeof value === "string") {
		yield [path, value];
	} else if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) yield* walk(value[i], `${path}[${i}]`);
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) yield* walk(v, `${path}.${k}`);
	}
}

function findHits(text) {
	const counts = {};
	for (const m of text.matchAll(SUSPECT_RE)) {
		const cp = m[0].codePointAt(0);
		counts[cp] = (counts[cp] || 0) + 1;
	}
	return counts;
}

const PAGE = 1000;
let from = 0;
let totalSongs = 0;
let songsWithHits = 0;
const globalCounts = {};
const offenders = [];

while (true) {
	const { data, error } = await supabase
		.from("songs")
		.select("id, title, type, ordinaire_role, strophes, sheet_music_url")
		.order("id")
		.range(from, from + PAGE - 1);
	if (error) {
		console.error("Supabase error:", error);
		process.exit(1);
	}
	if (!data || data.length === 0) break;
	totalSongs += data.length;
	for (const song of data) {
		const fieldHits = [];
		for (const field of ["title", "type", "ordinaire_role", "sheet_music_url", "strophes"]) {
			for (const [path, str] of walk(song[field], field)) {
				const counts = findHits(str);
				if (Object.keys(counts).length > 0) {
					for (const [cp, n] of Object.entries(counts)) {
						globalCounts[cp] = (globalCounts[cp] || 0) + n;
					}
					fieldHits.push({ path, sample: visualize(str), counts });
				}
			}
		}
		if (fieldHits.length > 0) {
			songsWithHits++;
			offenders.push({ id: song.id, title: song.title, hits: fieldHits });
		}
	}
	if (data.length < PAGE) break;
	from += PAGE;
}

console.log(`\nScanned ${totalSongs} songs. Found suspect chars in ${songsWithHits} songs.\n`);
console.log("Global counts by character:");
const sortedCounts = Object.entries(globalCounts).sort((a, b) => b[1] - a[1]);
for (const [cp, n] of sortedCounts) {
	console.log(`  ${LABEL.get(Number(cp))}: ${n}`);
}

console.log("\n--- Offenders ---");
for (const o of offenders) {
	console.log(`\n[song ${o.id}] ${o.title}`);
	for (const h of o.hits) {
		const summary = Object.entries(h.counts)
			.map(([cp, n]) => `${SHORT.get(Number(cp))}×${n}`)
			.join(", ");
		console.log(`  ${h.path}  (${summary})`);
		const trimmed = h.sample.length > 250 ? `${h.sample.slice(0, 250)}…` : h.sample;
		console.log(`    ${trimmed}`);
	}
}
