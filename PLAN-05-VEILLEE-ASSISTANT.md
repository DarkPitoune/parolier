# PLAN-05 — Veillée assistant (guided chat → draft setlist)

Written 7 Oct 2026, against `main` @ `b6470ed`.

## Goal

A leader describes a veillée de louange (theme, length, adoration or not, silences) through a
short guided chat. The assistant builds a draft setlist that follows the arc the community
already uses, explains each pick, lets the leader refine it in plain language, and saves it as an
ordinary setlist.

## What the data says (measured on prod, 37 setlists)

- Masses (7) and song pools ("Adoration fkn", "Pape", "Aprem Evang") are out of scope.
- Every non-mass set follows the same arc, often truncated:
  **Louange ×5–10 → exactly one Esprit Saint → Adoration ×1–5 → one Marie.**
  Full examples: Toulon 11/07, Le nouveau gnou, Dieu agit 03/06. Around 14 others stop after
  the Esprit Saint song or skip one block.
- Louange opens loud ("Que ma bouche", "Tu es bon", "Acclamons le roi") and its last songs are
  calmer ("Qu'il me soit fait", "Si je n'ai pas l'amour").
- Text items between songs carry speaker cues ("Papa — chauffe les gens").
- Tags drive the slots, with known mismatches: "Yahwe", "Viens, ne tarde plus adore" and
  "Notre Père (Glorious)" are tagged Louange but used in adoration.

## Design principles

1. **Code owns the structure, the model owns the choices.** The arc and the slot sizes are
   computed deterministically from the brief. The model fills the slots and orders the louange
   block. Every returned id is validated.
2. **Tags are hints, not walls.** Any song may fill any slot. The model sees each song's tags
   **and** how it has actually been used in past veillées, so a Louange-tagged song played in
   adoration ("Yahwe") is a natural pick there. Validation checks existence and duplicates, never
   tag-vs-slot.
3. **The edge function is stateless and gets its data from the client.** The client sends the
   repertoire and the conversation, as `suggest-mass-songs` does today. This keeps the function
   independent of tenants and schemas (PLAN-02: one schema per tenant).
4. **The draft lives in the browser until "Créer la setlist".** No new table, no partial rows.
   Writing goes through the normal setlist mutations, so PLAN-02's editor gating applies for free.
5. **A silence is a text item** (`setlist_items.text = "Silence"`). No schema change, and it
   already renders in `SetlistPage` and the presenter.

---

## Phase 0 — Decisions (resolved 7 Oct 2026)

| # | Question | Decision |
|---|---|---|
| Q1 | Provider | Mistral (`mistral-small-latest`), same as `suggest-mass-songs` |
| Q2 | Mismatched tags | No retagging. The slots stay flexible: tags plus past usage are hints (principle 2) |
| Q3 | Entry point | "Préparer une veillée" button on `/setlists` |
| Q4 | Generated speaker texts | Left out |

The `compactSongs` CD filter bug (`"CD1"` vs the real `"CD 1"`) was fixed separately. The mass
suggester now really excludes CD songs. The veillée **needs** CD songs (they're the band's core),
so it uses its own compaction.

---

## Phase 1 — Brief → template → one-shot draft (6–9 h)

Shippable alone: guided questions, then a draft, then save. No free-text refinement yet.

### 1.1 `src/utils/veillee.ts` (new): pure logic, no I/O

- `type VeilleeBrief = { theme: string; durationMin: 30 | 45 | 60 | 90; adoration: boolean;
  silences: "none" | "few" | "many"; marie: boolean }`
- `type SlotKind = "louange" | "esprit" | "adoration" | "marie" | "silence"`
- `buildTemplate(brief): SlotKind[]` sizes the blocks from the duration. Constants:
  ~4 min per song, ~2 min per silence. Esprit Saint is always exactly 1, Marie is 0 or 1.
  Adoration is 0 when `adoration=false`. Silences go **between adoration songs** only: none,
  one in the middle, or one after each.
- `estimateDuration(draft): number` uses the same constants and is shown as "≈ 55 min".
- `compactVeilleeSongs(allSongs)` keeps `type === "song"` and **keeps CD songs**. The excerpt is
  the chorus plus the first verse, capped at ~400 characters. That's longer than the mass
  version's 200 because theme matching depends on lyrics.
- `usageHints(allSetlistItems, allSetlists)` derives past usage from non-mass setlists (skip
  names starting with "Messe" and sets containing `type !== "song"` items). In each set, the
  first Esprit Saint-tagged song is the pivot: songs before it count as `louange`, the pivot as
  `esprit`, songs after it as `adoration`, and a final Marie-tagged song as `marie`. Sets without
  a pivot carry no positional signal and are ignored. Returns
  `Map<songId, Partial<Record<SlotKind, number>>>`. The input comes from a light dedicated query,
  `setlistHistoryQuery` (ids, positions and setlist names, no song bodies), through
  `useSetlistHistory`.
- Each compact song carries `tags` and `usedAs` (e.g. `{ louange: 1, adoration: 3 }`).

`src/utils/veillee.test.ts` covers template sizes per duration and flags, silence placement,
the duration estimate, and `usageHints` (pivot detection, masses skipped, no pivot,
"Yahwe"-style Louange-tagged song counted as adoration).

### 1.2 `supabase/functions/suggest-veillee/index.ts` (new)

Same skeleton as `suggest-mass-songs` (CORS, Mistral, `response_format: json_object`,
`max_tokens` capped).

- Input: `{ brief, template: SlotKind[], songs: CompactVeilleeSong[] }`. That's the whole
  repertoire, one line per song: `[ID] title | tags | déjà joué en: adoration×3 | extrait`.
- Prompt: the arc and its intent (louange opens loud and ends calmer, the Esprit Saint song is
  the pivot, adoration is intimate, Marie closes). Match the theme on lyrics. No song twice.
  Tags and past usage say where a song usually fits. Past usage outweighs the tag when they
  disagree, and the theme may justify going against both, which the reasoning must then say.
  Return one item per non-silence slot, in order.
- Output: `{ summary, items: [{ slot, songId, reasoning, alternatives: songId[] }] }`.
- **Server-side validation:** every `songId` must exist in the repertoire sent and none may
  repeat. Invalid entries are dropped and reported in `warnings`, never passed through.
  Silences are re-inserted by the client from the template, not by the model.

### 1.3 `src/hooks/useVeilleeSuggestion.ts` (new)

`useMutation` wrapping `supabase.functions.invoke("suggest-veillee")`. It does not copy the
`useState` pattern of `useMasseSuggestions`. It returns a `VeilleeDraft`:
`{ summary, items: DraftItem[] }`, where
`DraftItem = { key, slot, songId | null, text | null, reasoning?, alternatives? }`.

### 1.4 `src/pages/VeilleeAssistant.tsx` (new) + route `/veillees/new` in `src/routes.tsx`

- **Chat column:** the assistant asks the five brief questions one at a time, as bubbles. Theme
  is free text, the others are chips. Answered questions stay visible and can be tapped to
  change the answer.
- **Draft panel** (below the chat on mobile, beside it on desktop): ordered items with a slot
  badge, title, one-line reasoning and "≈ N min" at the top. Each item can be swapped from its
  alternatives (no new AI call), removed, or moved up and down. Changing an answer once a draft
  exists offers "Refaire avec ces réponses". The draft is not patched locally.
- **"Régénérer"** re-runs with the same brief. **"Créer la setlist"** saves, see 1.5.
- Built with Headless UI and Heroicons, the Jubilate palette for slot badges, flex and padding,
  dark and light modes.

### 1.5 `src/utils/supabase.ts`: `newVeilleeSetlistMutation(name, items)`

Creates the setlist (default name `Veillée — <theme> — <date>`) and bulk-inserts its items with
positions in a single `insert([...])` call, not one request per item as in
`newMesseSetlistMutation`. On success: invalidate `queryKeys.setlists.list()` and navigate to
`/setlists/:id/edit`.

### 1.6 Entry point

`src/pages/Setlists.tsx` gets a "Préparer une veillée" button (Q3), linking to `/veillees/new`.

**Done when:** a 60-min brief with adoration and few silences produces a valid arc
(louange… → 1 Esprit Saint → adoration with silences → 1 Marie) using only real ids, and saves
as a setlist that plays in the presenter.

---

## Phase 2 — Free-text refinement (6–10 h)

Builds on phase 1. After the draft exists, the chat input becomes free: "plus calme avant
l'Esprit Saint", "remplace Yahwe", "moins de chants du CD", "ajoute un silence après le 2ᵉ chant
d'adoration".

### 2.1 Draft operations: `src/utils/veilleeDraft.ts` (new)

A pure reducer, `applyOps(draft, ops)`, with
`Op = replace{key, songId} | insert{afterKey, slot, songId} | remove{key} | move{key, toIndex}
| addSilence{afterKey} | removeSilence{key}`.
Each op is validated: the song exists and isn't already in the draft. The tag is not checked
against the slot. An op that fails is
skipped and reported. It must never throw.
`veilleeDraft.test.ts` covers each op, every invalid case, and that the Esprit Saint song stays
exactly one.

The manual controls from 1.4 (swap, remove, move) are re-expressed as these ops, so there is one
code path.

### 2.2 Edge function: add a `refine` mode

- Input: `{ mode: "refine", brief, draft, messages, songs }`. The whole conversation is
  sent each turn, which keeps the server stateless.
- The model calls tools: the six ops above plus `reply(text)`. Mistral function calling. The
  function returns `{ ops, reply }`. The client applies the ops through `applyOps`, which
  validates them a second time.
- Caps: max 20 turns per session (client-side), `max_tokens` capped, and only the last N
  messages are sent once a conversation gets long.

### 2.3 UI

- A text input under the chat once the draft exists. Assistant replies appear as bubbles.
- Items an op just changed are highlighted briefly.
- "Annuler" undoes the last turn. Keep a stack of drafts, since the reducer is pure.

**Done when:** the five example requests above each produce the expected change, and a
nonsense request ("mets du rock") gets a reply with no ops.

---

## Phase 3 — Tests and hardening (2–4 h)

- Unit tests: `veillee.test.ts`, `veilleeDraft.test.ts`, plus validation of the edge function's
  response parsing, extracted into a pure helper the hook imports.
- E2E `e2e/veillee-assistant.spec.ts`: stub `**/functions/v1/suggest-veillee` with
  `page.route` and a fixed response that references seeded ids from `e2e/fixtures.ts`. Walk the
  questions, check the draft, save, and verify the setlist page. Seeded songs need the four tags.
  Add to `supabase/seed.sql` if they're missing.
- Edge function errors (Mistral down, malformed JSON) become a toast plus "Réessayer". The
  answered brief is kept.

---

## Out of scope (v1)

- Per-song durations or tempo/energy metadata (estimates only).
- Generated speaker texts (Q4, decided out).
- Persisting conversations or caching suggestions.

## Multi-tenant compatibility (PLAN-02)

- Stateless function, repertoire supplied by the client: no schema coupling.
- Saving uses normal setlist writes, which become editor-only under D11. Hide "Préparer une
  veillée" behind `isEditor` once that exists.
- The function is open to anyone with the anon key, like the other two. Cap tokens now. Editor
  verification arrives with PLAN-02 §4.2, alongside `process-image-to-lyrics`.

## Files touched

| File | Phase |
|---|---|
| `src/utils/veillee.ts` + test | 1 |
| `supabase/functions/suggest-veillee/index.ts` | 1, 2 |
| `src/hooks/useVeilleeSuggestion.ts` | 1, 2 |
| `src/pages/VeilleeAssistant.tsx`, `src/pages/index.ts` | 1, 2 |
| `src/routes.tsx` | 1 |
| `src/utils/supabase.ts` (`newVeilleeSetlistMutation`) | 1 |
| `src/pages/Setlists.tsx` (entry button) | 1 |
| `src/utils/veilleeDraft.ts` + test | 2 |
| `e2e/veillee-assistant.spec.ts`, maybe `supabase/seed.sql`, `e2e/fixtures.ts` | 3 |

Deploying the edge function: CLI deploy returns 403, so deploy through the Supabase MCP and
check that `MISTRAL_API_KEY` is set on the project.
