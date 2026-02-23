# Parolier (Jubilate Book)

A Progressive Web App for managing and displaying church hymns, songs, texts, and presentations. Built for worship teams, Parolier features a presenter mode with real-time synchronization, music chord transposition, Bible/liturgy viewing, and full offline support.

## Features

- **Song management** — Browse, search, create and edit hymns and songs with chord annotations
- **Chord transposition** — Transpose song chords to any key on the fly
- **Presenter mode** — Control slides projected on a screen, synchronized in real-time via MQTT
- **Leader/Follower sync** — A worship leader can guide followers to the current song using Supabase Realtime
- **Setlists** — Organize songs into setlists for services and events
- **Bible & liturgy** — View Bible passages and liturgical texts
- **Offline support** — Full PWA with service worker for use without internet
- **Dark mode** — Supports both light and dark themes

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL) |
| Data fetching | TanStack Query |
| State management | Jotai (with `atomWithStorage` for persistence) |
| Routing | React Router v6 |
| Real-time sync | MQTT over WebSocket (presenter) + Supabase Realtime (leader/follower) |
| UI components | Headless UI + Heroicons |
| Search | Fuse.js (fuzzy search) |
| Monitoring | Sentry |
| Testing | Vitest + Testing Library (unit) / Playwright (e2e) |
| Linting & Formatting | Biome |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) project

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/DarkPitoune/parolier.git
   cd parolier
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file at the project root with your Supabase credentials:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SENTRY_AUTH_TOKEN=your-sentry-token
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | TypeScript check + production build |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run unit/integration tests (watch mode) |
| `pnpm test:run` | Run tests once |
| `pnpm test:e2e` | Build and run Playwright e2e tests |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm extract-types` | Regenerate Supabase TypeScript types |

## Project Structure

```
src/
├── pages/          # Route-level components (List, SongPage, SongEditor, SetlistPage, PresenterPage, etc.)
├── components/     # Reusable UI (SongViewer, Slides, SidePanel, Contexts)
├── hooks/          # Custom hooks (useSlideController, useIsMobile, useWakeLock, etc.)
│   └── queries/    # TanStack Query hooks wrapping Supabase calls
├── utils/          # Supabase queries/mutations, MQTT, chord transposition, connectivity
├── test/           # Test setup
└── main.tsx        # App entry point and route definitions
```
