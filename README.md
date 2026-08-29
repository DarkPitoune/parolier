# Parolier

## Running the stack locally

Tests and local development run against a Supabase stack on your own machine, not
against production.

**Docker must be running first.** Every command below shells out to it, and the
failure when it is down is not always obvious.

```sh
pnpm supabase:start   # boot Postgres, PostgREST, Auth, Realtime, Storage
pnpm db:reset         # re-apply the baseline migration, then re-seed fixtures
pnpm dev:local        # run the app against the local stack
pnpm supabase:stop    # shut it down
```

`pnpm dev:local` is `pnpm dev` with the local URL and anon key inlined. The local
anon key is a fixed value printed by `supabase start` and shared by every Supabase
installation — it is not a secret and is safe in version control.

Studio is at http://127.0.0.1:54323 once the stack is up.

### What the database contains

`supabase/migrations/` holds a single baseline migration dumped from production.
It exists because 10 of the 12 tables were originally created by hand in the
Supabase dashboard and had no migration at all, so replaying the older files
against an empty database could never reproduce the schema. Those older files are
kept for reference in `supabase/archive/pre-baseline-migrations/` and are
deliberately outside the directory the CLI replays.

`supabase/seed.sql` adds a small deterministic fixture set — songs (including one
with chords, one with a performance note, a refrain and an ordinaire part), tags,
texts, two setlists and an ordinaire. Every row has a fixed id so tests can name
what they are asserting against. Add to that file rather than creating rows from a
test.

### If a port is already taken

`supabase start` fails when another Supabase project holds ports 54321-54327. Stop
the other one with `supabase stop --project-id <name>`; its data is preserved in a
Docker volume.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json", "./tsconfig.app.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
