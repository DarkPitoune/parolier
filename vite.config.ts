import { type ConfigEnv, defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import path from "node:path";
import packageJson from "./package.json";

// Supabase rejects a request with no Apikey header, and the service worker
// refetches outside the client that would otherwise add one, so the key has to
// be inlined into the generated worker at build time. That much is unavoidable
// and harmless — it is the same public key the bundle already carries.
//
// It has to be inlined as a *literal*, though: workbox serialises these plugins
// by calling toString() on the function, which keeps the source text and drops
// the scope around it. A captured variable therefore reaches the worker as an
// undefined free name and throws on the first cached request, with a build that
// reported success. Building the source here is what keeps the value in the
// body while still reading it from one place.
const supabaseApikeyHeader = (supabaseAnonKey: string) => ({
  requestWillFetch: new Function(
    "{ request }",
    [
      "const withApikey = new Request(request);",
      `withApikey.headers.set("Apikey", ${JSON.stringify(supabaseAnonKey)});`,
      "return withApikey;",
    ].join("\n"),
  ) as ({ request }: { request: Request }) => Promise<Request>,
});

const pwaOptions = (supabaseAnonKey: string): Partial<VitePWAOptions> => ({
  manifest: {
    name: "Chants Jubilate",
    short_name: "Jubilate",
    description: "L'application de carnet des chants de Jubilate",
    id: "/",
    lang: "fr",
    theme_color: "#002e5d",
    background_color: "white",
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "android/android-launchericon-192-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "android/android-launchericon-512-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // The "any" icons bleed to the edge, so a launcher mask cuts the top
        // and foot off the cross. This one holds the same artwork inside the
        // 80% safe circle.
        src: "android/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "ios/180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "screenshots/wide-1-setlists.png",
        sizes: "1905x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/wide-2-song.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/wide-3-setlist-song.png",
        sizes: "1905x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/wide-4-presenter.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/wide-5-liturgy.png",
        sizes: "1905x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/wide-6-bible.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "screenshots/mobile-1-song-list.png",
        sizes: "1560x3376",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "screenshots/mobile-2-song.png",
        sizes: "1560x3376",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "screenshots/mobile-3-setlist-song.png",
        sizes: "1560x3376",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "screenshots/mobile-4-presenter.png",
        sizes: "1560x3376",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  },
  registerType: "autoUpdate",
  workbox: {
    mode: "generateSW",
    globPatterns: ["**/*.{js,css,html,png,jpg,svg,ttf}"],
    // Precached bytes are bytes every install downloads before it can run
    // offline. The manifest still points at the screenshots; the install UI
    // fetches those on demand.
    globIgnores: ["screenshots/**"],
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      // Connectivity probe: bypass SW cache so offline detection works
      {
        urlPattern: ({ request }) =>
          request.headers.get("X-Connectivity-Probe") === "1",
        handler: "NetworkOnly",
      },
      // Songs & tags: the critical path — must render instantly even on a
      // slow connection or wifi-with-no-internet, so StaleWhileRevalidate
      // stays even though the row can be edited. Freshness for lyrics/notes
      // now comes from useSongsRealtimeSync (pushes straight into the
      // TanStack Query cache) and useSaveSongEdit/useSetStropheNote's own
      // cache writes on save — neither goes through a GET, so neither is
      // slowed down or staled by this SW cache. This layer only matters as
      // the fallback for a cold load, where "instant, maybe a second stale"
      // beats "correct, maybe never loads".
      {
        urlPattern: ({ url }) =>
          url.href.includes("/rest/v1/songs") ||
          url.href.includes("/rest/v1/tags"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-songs-cache",
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [200] },
          plugins: [supabaseApikeyHeader(supabaseAnonKey)],
        },
      },
      // Setlists: must be fresh, NetworkFirst with 3s timeout fallback
      {
        urlPattern: ({ url }) =>
          url.href.includes("/rest/v1/setlist") ||
          url.href.includes("/rest/v1/leader_position"),
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-setlists-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: { statuses: [200] },
          plugins: [supabaseApikeyHeader(supabaseAnonKey)],
        },
      },
      // Texts: rarely change, StaleWhileRevalidate
      {
        urlPattern: ({ url }) => url.href.includes("/rest/v1/texts"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-texts-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [200] },
          plugins: [supabaseApikeyHeader(supabaseAnonKey)],
        },
      },
      // Catch-all for other Supabase API calls (excluding analytics)
      {
        urlPattern: ({ url }) =>
          url.href.includes("/rest/v1/") &&
          !url.href.includes("/rest/v1/analytics") &&
          !url.href.includes("/rest/v1/songs") &&
          !url.href.includes("/rest/v1/tags") &&
          !url.href.includes("/rest/v1/setlist") &&
          !url.href.includes("/rest/v1/leader_position") &&
          !url.href.includes("/rest/v1/texts"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [200] },
          plugins: [supabaseApikeyHeader(supabaseAnonKey)],
        },
      },
      // Bible API: static content, CacheFirst
      {
        urlPattern: ({ url }) => url.hostname === "bible-api-lovat.vercel.app",
        handler: "CacheFirst",
        options: {
          cacheName: "bible-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
});

// https://vitejs.dev/config/
export default ({ command, mode }: ConfigEnv) => {
  const { VITE_SUPABASE_ANON_KEY } = loadEnv(mode, __dirname, "VITE_");
  // Only a build writes the key into a service worker. `vite preview` and the
  // dev server resolve this config too, in production mode and without ever
  // generating a worker, so requiring it there would break `pnpm preview` on
  // any checkout with no .env.
  if (command === "build" && !VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      `VITE_SUPABASE_ANON_KEY is not set for mode "${mode}". Without it the ` +
        "service worker would ship an empty Apikey header and 401 every " +
        "request it serves from cache. Add it to the matching .env file.",
    );
  }

  return defineConfig({
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    build: {
      sourcemap: true,
    },
    plugins: [react(), VitePWA(pwaOptions(VITE_SUPABASE_ANON_KEY ?? ""))],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  });
};
