import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
	entryPoints: [path.join(here, "src/main.ts")],
	outfile: path.join(here, "dist/bot.js"),
	bundle: true,
	platform: "node",
	target: "node24",
	format: "esm",
	sourcemap: true,
	alias: {
		"@": path.join(here, "../src"),
		// grammY polyfills AbortController, and native fetch rejects the polyfill's signals.
		"abort-controller": path.join(here, "shims/abort-controller.cjs"),
	},
	banner: {
		js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
	},
});
