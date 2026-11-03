# PLAN-07 — English songs and translations

Written 2 Nov 2026, against `main` @ `60f48b4`. Revised 3 Nov after design review.

## Goal

Add English songs to the repertoire. Some are translations of French songs (or the other way
round), some stand alone. The app is used in one language at a time, chosen in a single place.

Out of scope: bilingual slides, translating the UI, auto-detecting the language of OCR'd lyrics.

## Principles

1. **One switch.** The only language control in the app is "Langue des chants" in Préférences
   (🇫🇷 / 🇬🇧, French by default). No per-page toggles, no in-page filter chips, no language picker in the
   song editor.
2. **The switch moves the whole app.** Every song list follows it, and an open song is replaced
   live by its translation.
3. **One translation per song.** French ↔ English, never more.
4. **No explanatory captions** in the UI.

## Data model

- `songs.language text not null default 'fr'` (check `'fr' | 'en'`) and
  `songs.translation_group uuid` (null = no translation).
- Unique `(translation_group, language)` where the group is set: a group holds at most one song
  per language, so with two languages a song has at most one translation.
- `link_translations(a, b)`: refuses two songs in the same language and songs that already have
  a translation, then gives both a fresh group.
- `unlink_translation(song)`: clears the group on both songs.
- Each language version is its own row, so `setlist_items`, `song_tag`, `leader_position`,
  `slideshow_position` and `analytics` keep pointing at one specific version.

A song's language is set when it is created: new songs and refrains take the Préférences
language; a song created as a translation takes the other one.

## Where the switch applies

- Song list, Refrains, unified search, `SongPicker` and `SongPickerInline`, through
  `useSongsInSettingLanguage` / `useRefrainsInSettingLanguage`.
- Song page: when the open song is in the other language, it
  navigates (replace) to the translation. If there is none, a "Pas de version …" block above the
  lyrics offers "Lier une traduction" / "Créer le chant traduit".
- Veillée assistant: songs in the chosen language.

Not affected: setlist contents (a planned service never loses songs), Messe AI suggestions
(French liturgy, always French), refrains and ordinaires on the song page (no translation block).

## UI

- Préférences: "Répertoire" section, last in the panel, with a "Langue des chants" segmented
  control showing flags. No caption.
- Song editor: a "Traduction" block. With a translation: that song, linked, with an unlink
  button. Without: "Lier une traduction" (existing `SongPicker`, other language only, songs
  without a translation only) and "Créer le chant traduit" (prompts for a title, creates the
  song in the other language, links it, opens its editor). Both apply immediately, independent
  of the editor's Save.

## Tests

- SQL, on the local stack: link, same-language refusal, already-translated refusal, unlink
  clears both sides, unique index blocks a second song per language, anon can call.
- Vitest: `useSongTranslation`, `compactVeilleeSongs` by language.
- Playwright (`e2e/translations.spec.ts`): the setting moves an open song to its translation;
  a song without one shows link/create; the setting filters the list; link then unlink from the
  editor; create the translated song.

## Rollout

1. Apply the migration to prod through the Supabase MCP, rename the repo file to the version it
   picks, regenerate types.
2. Merge the PR.
3. Enter the English songs.
