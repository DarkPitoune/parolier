import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "..", "dist");
const BUDGET_BYTES = 4_000_000;

const readPrecacheUrls = (): string[] => {
	const sw = readFileSync(path.join(DIST, "sw.js"), "utf8");
	const call = sw.indexOf("precacheAndRoute([");
	if (call === -1) {
		throw new Error("dist/sw.js has no precache manifest — build first");
	}
	const manifest = sw.slice(call, sw.indexOf("])", call));
	return [...manifest.matchAll(/"url":\s*"([^"]+)"/g)].map((m) =>
		decodeURIComponent(m[1]),
	);
};

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;

const entries = readPrecacheUrls();
// vite-plugin-pwa lists every manifest icon on top of whatever globPatterns
// already matched, so icons appear twice. Workbox caches one copy per URL,
// and one copy per URL is what an install actually downloads.
const urls = [...new Set(entries)];
const byGroup = new Map<string, { files: number; bytes: number }>();
let total = 0;

for (const url of urls) {
	const bytes = statSync(path.join(DIST, url)).size;
	total += bytes;
	const group = url.includes("/") ? `${url.split("/")[0]}/` : "(root)";
	const entry = byGroup.get(group) ?? { files: 0, bytes: 0 };
	byGroup.set(group, { files: entry.files + 1, bytes: entry.bytes + bytes });
}

for (const [group, { files, bytes }] of [...byGroup].sort(
	(a, b) => b[1].bytes - a[1].bytes,
)) {
	console.log(`${mb(bytes).padStart(9)}  ${String(files).padStart(4)} files  ${group}`);
}
console.log(`${mb(total).padStart(9)}  ${String(urls.length).padStart(4)} files  TOTAL`);
if (entries.length !== urls.length) {
	console.log(`(${entries.length - urls.length} duplicate entries not counted)`);
}

if (total > BUDGET_BYTES) {
	console.error(`\nprecache is ${mb(total)}, over the ${mb(BUDGET_BYTES)} budget`);
	process.exit(1);
}
console.log(`\nunder the ${mb(BUDGET_BYTES)} budget`);
