# PLAN-08 — Telegram bot ("Claude, rajoute ce chant")

Written 3 Nov 2026, against `main` @ `6807b92`.

## Goal

Let a trusted leader (Théophile first) manage the repertoire by talking to a Telegram bot:

- « Claude, rajoute ce chant et débrouille-toi » — pasted lyrics, chords, or a photo of the
  score → a new song, tagged, with the right language, no duplicate.
- « Claude, fais-moi la setlist à partir de ce message » — a forwarded message → a setlist,
  each line matched to a song (or kept as a free text item), link back to the app.
- « Claude, y a une erreur dans X » — finds the song, fixes it, says what changed, can undo.

Out of scope: refrains and ordinaires creation, linking translations, sheet-music upload,
presenter / slide control, Messe and veillée assistants (they already exist in the app).

## Principles

1. **The tools hold the business rules, not the prompt.** Strophe shape, sanitising, note
   preservation, setlist ordering and duplicate detection are enforced in code. The prompt only
   explains intent.
2. **Every edit is undoable.** Before a song is changed, its previous state is kept.
3. **Only allowlisted Telegram users get a reply.** Everyone else is ignored.
4. **Non-critical.** If the NAS is down, the bot is down; the app is unaffected.

## Architecture

```
Telegram ──long polling──▶ bot (Docker on NAS) ──▶ Mistral API (chat completions + tools)
                              │    │                  ├─ web_search (Conversations API built-in)
                              │    │                  └─ OCR for PDFs
                              │    └──anon key────▶ Supabase (prod)
                              └──read-only mount──▶ /srv/static/parolier-import/index.html
```

- Long polling: no open port, no Caddy entry.
- Node 24 + TypeScript, [grammY](https://grammy.dev) for Telegram, `@mistralai/mistralai` (the
  tree-shakeable `MistralCore` + standalone functions), `@supabase/supabase-js`. The tool loop
  is the bot's own (`bot/src/agent.ts`).
- Model `mistral-large-latest` (reads images, calls tools), `MISTRAL_MODEL` overrides it. Web
  search runs on `mistral-medium-latest`, PDFs go through `mistral-ocr-latest`.
- `prompt_cache_key` per chat. The tag list is **not** in the system prompt (it changes); the
  model reads it through `list_tags`.

## Where songs come from

« Ajoute "Lumière dans nos vies" » goes through three sources, in this order. The first hit
wins:

1. **Parolier** (Supabase). If the song is already there, say so and link it. Nothing is
   written.
2. **Import catalogue**: the 1,468 songs embedded in the page behind
   `import.parolier.jubilate.fr` (`<script id="data">` JSON: `cid`, `cote`, `title`, `tags`,
   `carnet`, `main`, `hasChords`, `strophes`). The strophes are already in the Parolier
   `Strophe` shape, so an import copies them **in code**. The model never retypes them, which
   means no transcription errors and no output tokens spent on lyrics.
   - The bot reads the HTML from a read-only volume (same NAS), parses the JSON at boot and
     re-parses when the file's mtime changes. No basic-auth credentials needed.
   - The page's own "already pushed" map lives in Pierre's browser `localStorage`, so the bot
     can't see it. Duplicates are detected against Supabase instead (title + first line).
3. **The web**: `web_search` to find the lyrics or a score, `fetch_page` to read the page or PDF.
   The model builds the strophes and records the source URL in the reply. Web lyrics are less
   reliable, so this path ends with a **preview and « je l'ajoute ? »** instead of a direct
   write.
   - Most French liturgical songs are under copyright. the model may decline to copy full lyrics
     from a third-party site, or transcribe only part of them. The catalogue and Théophile's
     own photos of the community's scores don't have this problem. The bot says so plainly
     instead of inventing missing verses.

## Images, files and links

- **Screenshots and photos.** A Telegram photo (compressed) and an image sent as a file
  (uncompressed, better for small print) both become image blocks. Several images sent
  together (an album, same `media_group_id`) are collected for ~1.5 s and go to the model as
  one turn. A PDF sent as a file becomes a document block. Bot API download limit: 20 MB.
- **Links.** A URL in a message (a sheet-music page, a PDF, an image) is opened with the bot's
  own `fetch_page` tool, on the NAS: HTML becomes text, PDFs go through Mistral OCR, images are
  returned to the model. It **refuses private and loopback addresses** (192.168.x, 10.x, 127.x,
  ::1), checked when the connection is made, so a link can't make the bot call Home Assistant,
  Pi-hole or the other services on the NAS. It can't run JavaScript, so a site that only renders
  scores client-side gets a « je n'arrive pas à lire cette page, envoie-moi une capture ».
- **PDFs sent in the chat** go through Mistral OCR too; the model gets the text.

## Data model

New migration `supabase/migrations/<ts>_song_revisions.sql`:

- `song_revisions(id bigint identity, song_id bigint references songs on delete cascade,
  title text, strophes jsonb[], language text, created_at timestamptz default now(),
  source text)` — RLS on, **no policies**: only the trigger writes it and only the
  `undo_song_edit` RPC reads it.
- `before update on songs` trigger, `security definer`, `set search_path = ''`: inserts the
  **old** row when `title`, `strophes` or `language` change. Fires for app edits too, so
  in-app mistakes become recoverable as a side effect.
- `source` comes from an `x-edit-source` request header (PostgREST exposes headers as the
  `request.headers` setting). The bot sends `telegram:<name>`; app edits leave it null.

Applied to prod via the Supabase MCP (rename the repo file to the version it picks), then
`pnpm extract-types`.

## Tools

All in `bot/src/tools/`, each a `betaZodTool` with `strict: true`. Every tool returns compact
JSON; write tools also return the app URL.

| Tool | Kind | Behaviour |
|---|---|---|
| `search_songs(query, language?)` | read | Accent/case-insensitive (`normalize`) match on title **and** lyric text. Returns id, title, language, type, tags, first line. Max 10. |
| `get_song(id)` | read | Title, language, tags, strophes **with indices**, URL. |
| `list_tags()` | read | id + name. |
| `get_setlist(id)` / `recent_setlists()` | read | Items in `sortSetlistItems` order, name, tags. |
| `create_song(title, language, strophes, tag_ids, allow_duplicate?)` | write | Validates strophes (zod, same union as `Strophe`), runs `sanitizeStrophes`. Refuses when `search_songs` finds a close title/first-line match unless `allow_duplicate: true`, returning the candidates. |
| `edit_song(id, title?, strophe_edits?, tag_ids?)` | write | `strophe_edits`: `{index, strophe}` replace, `{index, delete}`, `{after, strophe}` insert. Read-modify-write on fresh data, notes kept through `preserveFreshNotes`. Returns a before/after of the touched strophes. |
| `search_catalogue(query)` | read | Same matching over the import catalogue. Returns cid, cote, title, tags, carnet, hasChords, first line, and `in_parolier` (song id when a Supabase match exists). Max 10. |
| `get_catalogue_song(cid)` | read | Full catalogue entry with strophes, for previews. |
| `import_from_catalogue(cid, tag_ids, title?, language?)` | write | Copies the catalogue strophes as-is (sanitized), language `fr` by default, through the same duplicate check as `create_song`. |
| `web_search(query)` | read | A Mistral Conversations call with the built-in `web_search` tool. Returns a summary and the source URLs. |
| `fetch_page(url)` | read | Pages, PDFs (OCR) and images, private-address guard, size limits. |
| `undo_song_edit(id)` | write | Restores the latest `song_revisions` row (which itself creates a new revision, so undo is undoable). |
| `create_setlist(name, tags, items)` | write | `items`: `{song_id}` or `{text}`. Inserts setlist + items with dense positions 0..n-1. |
| `append_to_setlist(id, items)` | write | Appends after the current last position. |

No delete tool for songs or setlists.

**Writes go through without asking.** "Débrouille-toi" means autonomy. The reply always states
what was written plus the link, and edits are undoable. (Open question 1.)

### Code reuse

The bot imports the pure helpers from the app instead of copying them:
`src/utils/normalize.ts`, `sanitizeNbsp.ts`, `stropheNotes.ts`, `setlistOrder.ts`, and the
types in `src/assets/types.d.ts` / `database.types.ts`. esbuild resolves the `@/` alias at bundle
time. None of these touch `import.meta.env`; `src/utils/supabase.ts` does, so the bot has its own
small query layer.

## Conversation

- `bot/src/telegram.ts`
  - Allowlist by numeric Telegram user id (`ALLOWED_USERS`). Others: silence.
  - DM: every message is for the bot. Group: only when the message mentions the bot, starts with
    « Claude » or « Parolier », or replies to the bot.
  - Photos, image files, albums and PDFs: see "Images, files and links". Forwarded messages:
    text plus the original sender's name as context.
  - "typing…" action while the runner works; replies split at Telegram's 4096-char limit; plain
    text with app links.
  - `/new` clears the chat's history. `/whoami` replies with the caller's id (for onboarding;
    works for anyone, reveals nothing).
- `bot/src/history.ts` — per-chat message list in memory, append-only, cleared after 2 h idle
  or `/new`. Lost on restart, which is acceptable.
- `bot/src/agent.ts` — builds the request (model, effort, fallbacks, caching, tools), runs the
  tool runner, sets `app.edit_source` for writes, returns the final text.
- `bot/src/prompt.ts` — the system prompt: who the users are, the repertoire vocabulary
  (louange, adoration, Marie…), how to split pasted lyrics into strophes and chords lines,
  « check for duplicates, then act, then report with the link », reply in French.

## Spend controls

- Spending limit on the Mistral workspace that owns the bot's key.
- `max_tokens` per request, a cap on tool-runner iterations per message, and a per-user daily
  message cap (in memory) — "Limite du jour atteinte" past it.
- `web_search` costs an extra model call per search, and the catalogue is always tried first.
- Usage (`input`, `output`, requests, tool calls) logged per message so the real cost is
  visible.

## Files

```
bot/
  package.json          # grammy, @mistralai/mistralai, @supabase/supabase-js, zod, esbuild, vitest
  tsconfig.json
  build.mjs             # esbuild bundle, alias @ → ../src
  Dockerfile            # node:22-alpine, copies dist/bot.js only
  .env.example          # TELEGRAM_BOT_TOKEN, MISTRAL_API_KEY, SUPABASE_URL,
                        # SUPABASE_KEY (anon), ALLOWED_USERS, APP_URL
  src/
    main.ts
    telegram.ts
    agent.ts
    prompt.ts
    history.ts
    supabase.ts         # service-key client + queries
    tools/
      songs.ts
      setlists.ts
      tags.ts
      catalogue.ts      # load + parse the import page, mtime reload, search
      media.ts          # Telegram file download, page fetching + private-IP guard
      validate.ts       # zod Strophe schema, duplicate matching, strophe_edits application
    tools/*.test.ts
supabase/migrations/<ts>_song_revisions.sql
database-generated.types.ts   # regenerated
```

`bot/` is a standalone package (own `pnpm install`), outside the Vite build, so the Vercel
deploy doesn't change. Root `vitest.config.ts` only includes `src/**`; the bot runs its own.

## Phases

### Phase 0 — accounts (you, ~15 min)
1. BotFather → bot + token. Group privacy **off**: with it on, Telegram only delivers
   @mentions, replies and commands, so « Claude, … » messages would never arrive. The bot
   drops unaddressed messages itself, before the model or history.
2. Mistral API key (La Plateforme), with a spending limit.
3. Supabase key: the app's anon key. The bot can do exactly what the app can; the one thing
   the app can't, reading `song_revisions`, goes through the `undo_song_edit(p_song_id)` RPC
   (security definer, applied to prod as `20261104094930`).

### Phase 1 — revisions
1. Migration + trigger, tested on the local stack (`pnpm db:reset`): edit a song in the app,
   check a revision row appears with the old content.
2. Apply to prod via MCP, regenerate types, `pnpm build`.

### Phase 2 — tools
1. `bot/` scaffold, esbuild alias, query layer.
2. Read tools, then write tools.
3. Catalogue loader, catalogue tools, `fetch_page`, `web_search`.
4. Unit tests: strophe validation, `strophe_edits` application, note preservation on edit,
   duplicate detection, dense setlist positions, undo picking the latest revision, catalogue
   parsing against a copy of the real page, `in_parolier` matching, private-IP refusal
   (including a hostname that resolves to 192.168.x).

### Phase 3 — agent + Telegram
1. Agent loop; check the request JSON against the API's field names (`mistral.wire.test.ts`).
2. Telegram handler, allowlist, photos, history, `/new`, `/whoami`, caps.
3. Run locally against the **local** Supabase stack with your own Telegram account: the three
   scenarios end to end, including a photo and an undo.

### Phase 4 — NAS
1. `docker buildx --platform linux/amd64`, push `pitouneh/parolier-helpers`.
2. `/srv/docker/parolier-helpers/docker-compose.yml`, `restart: unless-stopped`, env file on the
   NAS only, `/srv/static/parolier-import` mounted read-only.
3. Point at prod, test in a DM from your account.

### Phase 5 — Théophile
1. He sends `/whoami`, you add his id to `ALLOWED_USERS`, restart.
2. Short "how to talk to it" message for him (three example phrases + « annule » + `/new`).

## Decisions

1. Writes go through without confirmation, except songs found on the web (preview +
   « je l'ajoute ? »).
2. DMs and groups; in a group the bot answers when called « Claude… » or « Parolier… », @mentioned or replied to,
   and stays silent for people who aren't allowlisted.
3. Mistral, not Claude: `mistral-large-latest` (`MISTRAL_MODEL` overrides it).
4. Single community for now.
5. No `songs.catalogue_cid` column: « already imported » is title / first-line matching.
6. Tags: the fixed Parolier list only, never created by the bot.

## Status

- Done: `song_revisions` migration (applied to prod 4 Nov 2026 as `20261104091959`), the bot in
  `bot/` with tests against the local stack, Docker image.
- To do: BotFather token, Mistral API key in `bot/.env`, first run
  in a DM, NAS deploy, onboard Théophile.
