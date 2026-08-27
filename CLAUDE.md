# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Parolier ("Jubilate Book") is a React + TypeScript PWA for managing and displaying church hymns, songs, texts, and presentations. It features a presenter mode with real-time MQTT synchronization, music chord transposition, Bible/liturgy viewing, and offline support.

## Commands

- `pnpm dev` — Start Vite dev server with HMR
- `pnpm build` — TypeScript check + Vite production build
- `pnpm lint` — Lint with Biome
- `pnpm format` — Auto-format with Biome
- `pnpm preview` — Preview production build
- `pnpm test` — Run Vitest unit/integration tests
- `pnpm test -- --run` — Run tests once (no watch mode)
- `pnpm build && pnpm exec playwright test` — Run Playwright e2e tests
- `pnpm extract-types` — Regenerate Supabase TypeScript types into `database-generated.types.ts`

## Architecture

**Stack:** React 18 / TypeScript (strict) / Vite / Tailwind CSS / Supabase / TanStack Query / Jotai / MQTT

**Key directories:**
- `src/pages/` — Route-level components (List, SongPage, SongEditor, SetlistPage, PresenterPage, SlidePage, Bible, Messe, etc.)
- `src/components/` — Reusable UI (SongViewer, Slides/, SidePanel/, Contexts/)
- `src/hooks/` — Custom hooks (useSlideStateMachine + slideReducer, useIsMobile, useMqttConnectionStatus, useWakeLock)
- `src/hooks/queries/` — TanStack Query hooks wrapping Supabase queries (useSongQueries, useSetlistQueries)
- `src/utils/` — Supabase queries/mutations, MQTT pub/sub, chord transposition, connectivity checks

**Data fetching:** TanStack Query (`@tanstack/react-query`) wraps Supabase calls. Query hooks in `src/hooks/queries/` (e.g. `useTaggedSong`, `useSetlistLength`, `useSetlistStep`). Raw query functions in `src/utils/supabase.ts`. QueryClient configured in `src/utils/queryClient.ts`.

**State management:** Jotai atoms (in `components/Contexts/SettingsContext.tsx`) with `atomWithStorage` for persistence. Auth via React Context wrapping Supabase auth.

**Routing:** React Router v6 defined in `src/main.tsx`. Main routes: `/` (song list), `/songs/:songId`, `/setlists/:setlistId`, `/presenter/:setlistId/:stepNumber`, `/slides/:songId`, `/slides` (MQTT-controlled), `/setlists/:setlistId/steps/:stepNumber/slide`, `/bible/:book/:chapter`, `/texts/:textId`.

**Real-time sync (two independent systems):**
- **Presenter/Slideshow:** slide state lives in a reducer (`src/hooks/slideReducer.ts`) driven by
  `src/hooks/useSlideStateMachine.ts`; see `src/hooks/slide-state-machine.md` for the state diagram.
  Two transports carry it. Same-device (presenter window → slide window) goes through
  `localStorage` under the `parolier_slide_state` key plus `storage` events, and works offline.
  Cross-device goes through MQTT over WebSocket (`wss://192.168.8.1:9003`) — the presenter role
  publishes, the display role subscribes, and `SYNC` events are never re-published. The live topic
  is `parolier/slide_state`; `parolier/strophe_change`, `parolier/logo_toggle` and
  `parolier/song_change` are a legacy fan-out kept for an external device that is not in this repo.
- **Leader/Follower:** Supabase Realtime on `leader_position` table. Redirects followers to `/songs/:id` when leader changes song. Managed by `LeaderListener` (mounted globally) + `LeaderContext`.

**Database:** Supabase (PostgreSQL). Types auto-generated in `database-generated.types.ts`, manually extended in `database.types.ts`. Query functions in `src/utils/supabase.ts`.

**Monitoring:** Sentry (`@sentry/react`) for error tracking. Disabled in dev and e2e test builds via `VITE_E2E` env var.

**Path alias:** `@/*` maps to `src/*`.

## Testing

**Unit/Integration:** Vitest + `@testing-library/react`. Config in `vitest.config.ts`, setup in `src/test/setup.ts`. Tests live alongside source files as `*.test.ts(x)`.

**E2e:** Playwright. Config in `playwright.config.ts`, tests in `e2e/`. Runs against `pnpm preview` on port 4173. Sentry is disabled in e2e builds.

## Style Conventions

- Use flex/padding instead of margin for layout
- Reuse the Jubilate color palette (jubilateBlue, jubilateRed, jubilateGreen, etc.) defined in `tailwind.config.js`
- All UI must work in both dark mode and light mode
- Use Heroicons (`@heroicons/react`) instead of custom SVGs
- Accessible components via `@headlessui/react`

## Environment Variables

Required in `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SENTRY_AUTH_TOKEN`

Special: `VITE_E2E=true` disables Sentry (set automatically by Playwright config)
