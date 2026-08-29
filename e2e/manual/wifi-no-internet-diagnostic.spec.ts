/**
 * Diagnostic test for WiFi-no-internet offline resilience.
 *
 * Run with:
 *   pnpm build && pnpm exec playwright test e2e/wifi-no-internet-diagnostic.spec.ts --headed
 *
 * This test uses page.pause() (Playwright Inspector) to pause for manual network switching.
 * It does NOT simulate offline — you physically switch WiFi networks.
 */
import { test, type Page } from "@playwright/test";

test.setTimeout(300_000); // 5 min — includes human wait time

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SUPABASE_HOST = "unlpbctlejrzjjvkmczk.supabase.co";
const BIBLE_HOST = "bible-api-lovat.vercel.app";

interface Snapshot {
	ts: string;
	elapsed: string;
	offlineBanner: boolean;
	pulsingBar: boolean;
	songListVisible: boolean;
	songCount: number;
	navigatorOnLine: boolean;
}

async function takeSnapshot(page: Page, startMs: number): Promise<Snapshot> {
	const now = Date.now();
	return page.evaluate(
		({ startMs, now }) => {
			const offlineBanner = !!document.querySelector(
				'[data-testid="offline-banner"]',
			);
			const pulsingBar = !!document.querySelector(".animate-pulse");
			const songList = document.querySelector('[data-testid="song-list"]');
			const songCount = songList
				? songList.querySelectorAll("a").length
				: -1;

			return {
				ts: new Date(now).toISOString().slice(11, 23),
				elapsed: `${((now - startMs) / 1000).toFixed(1)}s`,
				offlineBanner,
				pulsingBar,
				songListVisible: !!songList && songList.checkVisibility(),
				songCount,
				navigatorOnLine: navigator.onLine,
			};
		},
		{ startMs, now },
	);
}

function logSnap(label: string, snap: Snapshot) {
	console.log(
		`[DIAG] ${label} @${snap.elapsed} | online=${snap.navigatorOnLine} banner=${snap.offlineBanner} pulse=${snap.pulsingBar} songs=${snap.songCount} listVisible=${snap.songListVisible}`,
	);
}

async function dumpCaches(page: Page, label: string) {
	const info = await page.evaluate(async () => {
		const names = await caches.keys();
		const result: Record<string, number> = {};
		for (const name of names) {
			const cache = await caches.open(name);
			const keys = await cache.keys();
			result[name] = keys.length;
		}
		return result;
	});
	console.log(`[DIAG] SW caches (${label}):`, JSON.stringify(info, null, 2));
}

async function dumpTQCache(page: Page, label: string) {
	const info = await page.evaluate(() => {
		// TanStack Query exposes the cache on window.__REACT_QUERY_DEVTOOLS_GLOBAL_STORE__
		// but we can also access it through the QueryClient on the React tree.
		// Simpler: count query cache entries via the global QueryClient if exposed.
		// Fallback: check if there's a QueryClientProvider context we can read.
		const qc = (window as unknown as Record<string, unknown>)
			.__QUERY_CLIENT__ as
			| { getQueryCache?: () => { getAll?: () => unknown[] } }
			| undefined;
		if (qc?.getQueryCache) {
			const all = qc.getQueryCache().getAll?.() ?? [];
			return {
				count: all.length,
				keys: all
					.slice(0, 20)
					.map((q) => (q as Record<string, unknown>).queryKey),
			};
		}
		return { count: -1, note: "QueryClient not exposed on window" };
	});
	console.log(`[DIAG] TQ cache (${label}):`, JSON.stringify(info, null, 2));
}

async function observeAtCheckpoints(
	page: Page,
	checkpointsSeconds: number[],
	phaseLabel: string,
) {
	const startMs = Date.now();
	for (const sec of checkpointsSeconds) {
		const waitMs = sec * 1000 - (Date.now() - startMs);
		if (waitMs > 0) await page.waitForTimeout(waitMs);

		const snap = await takeSnapshot(page, startMs);
		logSnap(`${phaseLabel} +${sec}s`, snap);
	}
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test("WiFi-no-internet diagnostic", async ({ page }) => {
	// -----------------------------------------------------------------------
	// Setup: request/response logging
	// -----------------------------------------------------------------------
	let requestCount = 0;
	let failedCount = 0;

	page.on("request", (req) => {
		const url = req.url();
		if (url.includes(SUPABASE_HOST) || url.includes(BIBLE_HOST)) {
			requestCount++;
			console.log(`[DIAG] REQ  #${requestCount} ${req.method()} ${url}`);
		}
	});

	page.on("response", async (res) => {
		const url = res.url();
		if (url.includes(SUPABASE_HOST) || url.includes(BIBLE_HOST)) {
			const fromSW = res.fromServiceWorker();
			console.log(
				`[DIAG] RES  ${res.status()} fromSW=${fromSW} ${url.slice(0, 120)}`,
			);
		}
	});

	page.on("requestfailed", (req) => {
		const url = req.url();
		if (url.includes(SUPABASE_HOST) || url.includes(BIBLE_HOST)) {
			failedCount++;
			console.log(
				`[DIAG] FAIL #${failedCount} ${req.failure()?.errorText} ${url.slice(0, 120)}`,
			);
		}
	});

	// Forward [DIAG] console messages from the browser
	page.on("console", (msg) => {
		const text = msg.text();
		if (text.includes("[DIAG]")) {
			console.log(`[BROWSER] ${text}`);
		}
	});

	// -----------------------------------------------------------------------
	// Install MutationObserver for banner & pulsing bar changes
	// -----------------------------------------------------------------------
	const installObserver = async () => {
		await page.evaluate(() => {
			const log = (msg: string) => console.log(`[DIAG] DOM-WATCH: ${msg}`);
			const observer = new MutationObserver(() => {
				const banner = !!document.querySelector(
					'[data-testid="offline-banner"]',
				);
				const pulse = !!document.querySelector(".animate-pulse");
				log(`banner=${banner} pulse=${pulse}`);
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["class"],
			});
		});
	};

	// -----------------------------------------------------------------------
	// Phase 1: Warm up caches (online)
	// -----------------------------------------------------------------------
	console.log("\n[DIAG] ========== PHASE 1: Warm up caches ==========");

	await page.goto("/", { waitUntil: "networkidle" });
	await installObserver();

	// Wait for SW activation
	const swState = await page.evaluate(async () => {
		const reg = await navigator.serviceWorker?.ready;
		return reg?.active?.state;
	});
	console.log(`[DIAG] SW state: ${swState}`);

	// Wait for song list to load
	await page.waitForSelector('[data-testid="song-list"]', { timeout: 15_000 });
	const initialSongCount = await page
		.getByTestId("song-list")
		.locator("a")
		.count();
	console.log(`[DIAG] Initial song count: ${initialSongCount}`);

	// Navigate to a song to cache it
	const firstSongLink = page.getByTestId("song-list").locator("a").first();
	const songHref = await firstSongLink.getAttribute("href");
	console.log(`[DIAG] Navigating to song: ${songHref}`);
	await firstSongLink.click();
	await page.waitForTimeout(2000);

	// Navigate to setlists
	console.log("[DIAG] Navigating to /setlists");
	await page.goto("/setlists", { waitUntil: "networkidle" });
	await page.waitForTimeout(2000);

	// Try to navigate to a setlist detail
	const setlistLink = page.locator("a[href*='/setlists/']").first();
	if (await setlistLink.isVisible().catch(() => false)) {
		const setlistHref = await setlistLink.getAttribute("href");
		console.log(`[DIAG] Navigating to setlist: ${setlistHref}`);
		await setlistLink.click();
		await page.waitForTimeout(2000);
	}

	// Back to home
	await page.goto("/", { waitUntil: "networkidle" });
	await page.waitForTimeout(1000);

	// Dump caches
	await dumpCaches(page, "after warmup");
	await dumpTQCache(page, "after warmup");

	console.log(`[DIAG] Total requests so far: ${requestCount}`);
	console.log(`[DIAG] Failed requests so far: ${failedCount}`);

	// -----------------------------------------------------------------------
	// Phase 2: Prompt to switch to router WiFi
	// -----------------------------------------------------------------------
	console.log(
		"\n[DIAG] ========== PHASE 2: Switch to router WiFi ==========",
	);
	console.log(
		"[DIAG] >>> Switch to the router WiFi now (no internet), then click Resume in the Playwright Inspector <<<",
	);

	// page.pause() opens the Playwright Inspector and blocks until you click "Resume"
	await page.pause();

	console.log("[DIAG] User confirmed network switch");

	// -----------------------------------------------------------------------
	// Phase 3: Observe without reload (90s)
	// -----------------------------------------------------------------------
	console.log(
		"\n[DIAG] ========== PHASE 3: Observe (no reload) ==========",
	);

	requestCount = 0;
	failedCount = 0;

	await observeAtCheckpoints(
		page,
		[0, 3, 5, 10, 15, 20, 30, 45, 60, 90],
		"Phase3",
	);

	console.log(
		`[DIAG] Phase 3 totals: requests=${requestCount} failed=${failedCount}`,
	);

	// -----------------------------------------------------------------------
	// Phase 4: Reload and observe (60s) — critical phase
	// -----------------------------------------------------------------------
	console.log(
		"\n[DIAG] ========== PHASE 4: Reload + observe (critical) ==========",
	);

	await dumpCaches(page, "before reload");

	requestCount = 0;
	failedCount = 0;

	try {
		await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
	} catch (e) {
		console.log(`[DIAG] Reload error: ${e}`);
	}

	await installObserver();
	await dumpCaches(page, "after reload");

	await observeAtCheckpoints(
		page,
		[0, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60],
		"Phase4",
	);

	console.log(
		`[DIAG] Phase 4 totals: requests=${requestCount} failed=${failedCount}`,
	);

	// -----------------------------------------------------------------------
	// Phase 5: Navigate to specific pages
	// -----------------------------------------------------------------------
	console.log(
		"\n[DIAG] ========== PHASE 5: Navigate to specific pages ==========",
	);

	const pagesToVisit = [
		{ path: songHref ?? "/songs/1", label: "song detail" },
		{ path: "/", label: "song list" },
		{ path: "/setlists", label: "setlists" },
	];

	for (const { path, label } of pagesToVisit) {
		console.log(`\n[DIAG] --- Navigating to ${label} (${path}) ---`);
		const navStart = Date.now();

		try {
			await page.goto(path, {
				waitUntil: "domcontentloaded",
				timeout: 10_000,
			});
		} catch (e) {
			console.log(`[DIAG] Navigation error for ${label}: ${e}`);
		}

		// Wait a moment for rendering
		await page.waitForTimeout(3000);
		const snap = await takeSnapshot(page, navStart);
		logSnap(label, snap);

		// Log page content excerpt if empty
		if (snap.songCount <= 0) {
			const bodyText = await page.evaluate(
				() => document.body.innerText?.slice(0, 300) ?? "(empty)",
			);
			console.log(`[DIAG] Page text (${label}): ${bodyText}`);
		}
	}

	// Try first setlist detail if we can find one
	const setlistLinks = page.locator("a[href*='/setlists/']");
	if ((await setlistLinks.count()) > 0) {
		const href = await setlistLinks.first().getAttribute("href");
		if (href) {
			console.log(`\n[DIAG] --- Navigating to setlist detail (${href}) ---`);
			const navStart = Date.now();
			try {
				await page.goto(href, {
					waitUntil: "domcontentloaded",
					timeout: 10_000,
				});
			} catch (e) {
				console.log(`[DIAG] Navigation error: ${e}`);
			}
			await page.waitForTimeout(3000);
			const snap = await takeSnapshot(page, navStart);
			logSnap("setlist detail", snap);
		}
	}

	// -----------------------------------------------------------------------
	// Phase 6: Switch back to internet
	// -----------------------------------------------------------------------
	console.log(
		"\n[DIAG] ========== PHASE 6: Recovery (switch back to internet) ==========",
	);

	// Go to home first for consistent observation
	try {
		await page.goto("/", {
			waitUntil: "domcontentloaded",
			timeout: 10_000,
		});
	} catch {
		// may fail if still offline
	}

	console.log(
		"[DIAG] >>> Switch back to internet WiFi, then click Resume in the Playwright Inspector <<<",
	);
	await page.pause();

	console.log("[DIAG] User confirmed internet restored");
	await installObserver();

	requestCount = 0;
	failedCount = 0;

	await observeAtCheckpoints(
		page,
		[0, 3, 5, 10, 15, 20, 30, 45, 60],
		"Recovery",
	);

	console.log(
		`[DIAG] Recovery totals: requests=${requestCount} failed=${failedCount}`,
	);

	// Final cache state
	await dumpCaches(page, "final");

	console.log("\n[DIAG] ========== DIAGNOSTIC COMPLETE ==========");
	console.log(
		"[DIAG] Review the logs above for: banner visibility, SW cache hits, TQ behavior, and timing.",
	);
});
