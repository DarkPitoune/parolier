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
- `pnpm extract-types` — Regenerate Supabase TypeScript types into `database-generated.types.ts`
- `pnpm migrate` — Run database migration script

## Architecture

**Stack:** React 18 / TypeScript (strict) / Vite / Tailwind CSS / Supabase / Jotai / MQTT

**Key directories:**
- `src/pages/` — Route-level components (List, SongPage, SongEditor, SetlistPage, PresenterPage, Bible, Messe, etc.)
- `src/components/` — Reusable UI (SongViewer, Slides/, SidePanel/, Contexts/)
- `src/hooks/` — Custom hooks (useSlideController, useIsMobile, useMqttConnectionStatus, useWakeLock)
- `src/utils/` — Supabase queries/mutations, MQTT pub/sub, chord transposition, connectivity checks

**State management:** Jotai atoms (in `components/Contexts/SettingsContext.tsx`) with `atomWithStorage` for persistence. Auth via React Context wrapping Supabase auth.

**Routing:** React Router v6 defined in `src/main.tsx`. Main routes: `/` (song list), `/songs/:songId`, `/setlists/:setlistId`, `/presenter/:setlistId/:stepNumber`, `/slides/:songId`, `/bible/:book/:chapter`, `/texts/:textId`.

**Real-time sync:** MQTT over WebSocket (`wss://192.168.8.1:9003`) for presenter mode. Topics: `parolier/strophe_change`, `parolier/logo_toggle`, `parolier/song_change`.

**Database:** Supabase (PostgreSQL). Types auto-generated in `database-generated.types.ts`, manually extended in `database.types.ts`. Query functions in `src/utils/supabase.ts`.

**Path alias:** `@/*` maps to `src/*`.

## Style Conventions

- Use flex/padding instead of margin for layout
- Reuse the Jubilate color palette (jubilateBlue, jubilateRed, jubilateGreen, etc.) defined in `tailwind.config.js`
- All UI must work in both dark mode and light mode
- Use Heroicons (`@heroicons/react`) instead of custom SVGs
- Accessible components via `@headlessui/react`

## Environment Variables

Required in `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SENTRY_AUTH_TOKEN`
