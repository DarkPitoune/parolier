# Parolier bot

Telegram bot that lets trusted leaders add songs, build setlists and fix lyrics in plain French,
with a Mistral model doing the work through the bot's tools. Design and flows: `../PLAN-08-TELEGRAM-BOT.md`.

## Run locally

```sh
pnpm install
cp .env.example .env   # fill it in; point SUPABASE_* at the local stack to test safely
pnpm dev
```

`CATALOGUE_PATH` must point at a copy of the import page (`/srv/static/parolier-import/index.html`
on the NAS).

## Test

```sh
pnpm test        # unit tests
# with the local stack up (pnpm supabase:start at the repo root):
SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_KEY=<anon key> pnpm test
# also parse the real import page:
CATALOGUE_FIXTURE=/path/to/index.html pnpm test
```

## Deploy to the NAS

```sh
pnpm build
docker buildx build --platform linux/amd64 -t pitouneh/parolier-helpers:latest --push .
```

On the NAS, `/srv/docker/parolier-helpers/` holds `docker-compose.yml` (this folder's copy) and the
`.env`. It mounts `/srv/static/parolier-import` read-only for the catalogue.

## Give someone access

They send `/whoami` to the bot, you add `<id>:<name>` to `ALLOWED_USERS` and restart the
container. The name ends up in `song_revisions.source` as `telegram:<name>`.
