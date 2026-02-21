# Slide State Machine

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> idle

    %% Global transitions (from any state)
    idle --> song : LOAD_SONG
    idle --> text : LOAD_TEXT
    idle --> logo : TOGGLE_LOGO

    song --> song : LOAD_SONG\n(resets stropheIndex)
    song --> text : LOAD_TEXT
    song --> logo : TOGGLE_LOGO\n(preserves song data)
    song --> idle : GO_IDLE
    song --> song : NEXT_STROPHE\nPREV_STROPHE\nGOTO_STROPHE

    logo --> song : LOAD_SONG
    logo --> text : LOAD_TEXT
    logo --> song : TOGGLE_LOGO\n[songId != null]\n(restores position)
    logo --> idle : TOGGLE_LOGO\n[songId == null]
    logo --> idle : GO_IDLE

    text --> song : LOAD_SONG
    text --> text : LOAD_TEXT
    text --> logo : TOGGLE_LOGO
    text --> idle : GO_IDLE
```

## Sync Layer

```mermaid
flowchart LR
    subgraph Presenter["Presenter Window"]
        PR[useReducer\nrole = presenter]
    end

    subgraph Display["Display Window"]
        DR[useReducer\nrole = display]
    end

    PR -- "localStorage write\n(every dispatch)" --> LS[(localStorage)]
    LS -- "StorageEvent\n(cross-tab)" --> DR

    PR -- "MQTT publish\n(skip on SYNC)" --> MQTT{{MQTT broker\nparolier/slide_state}}
    MQTT -- "subscription\n→ dispatch SYNC" --> DR
```

## Transition Table

| From \ Event   | LOAD_SONG       | LOAD_TEXT      | NEXT_STROPHE      | PREV_STROPHE       | GOTO_STROPHE      | TOGGLE_LOGO              | GO_IDLE   | SYNC      |
|----------------|-----------------|----------------|-------------------|--------------------|-------------------|--------------------------|-----------|-----------|
| **idle**       | → song          | → text         | no-op             | no-op              | no-op             | → logo (no song)         | no-op     | → any     |
| **song**       | → song (reset)  | → text         | stropheIndex + 1  | stropheIndex - 1   | jump to index     | → logo (preserves song)  | → idle    | → any     |
| **logo**       | → song          | → text         | no-op             | no-op              | no-op             | → song* or → idle**      | → idle    | → any     |
| **text**       | → song          | → text         | no-op             | no-op              | no-op             | → logo (no song)         | → idle    | → any     |

\* TOGGLE_LOGO from `logo` → `song` when `songId !== null` (restores previous position)
\** TOGGLE_LOGO from `logo` → `idle` when `songId === null` (no song to restore)

## State Details

### `idle`
- Initial state, nothing displayed
- Shows the cross/logo on screen

### `song`
- A song is loaded and displayed
- Fields: `songId`, `stropheIndex`, `strophes[]`, `setlistContext?`
- NEXT/PREV/GOTO_STROPHE navigate within the strophes array (clamped to bounds)
- LOAD_SONG always resets `stropheIndex` to 0 (even if same song)

### `logo`
- Cross/logo is displayed over the current content
- Fields: `songId?`, `stropheIndex`, `strophes[]`, `setlistContext?`
- Preserves the underlying song data so toggling back restores exact position
- If entered from `idle` or `text`, `songId` is `null`

### `text`
- A non-song setlist item (reading, prayer, etc.) — shows the cross
- Fields: `textTitle`, `setlistContext`
- No strophe navigation — arrow keys trigger setlist step navigation instead

## Sync Details

- **localStorage**: every dispatch serializes a `SyncPayload` — syncs tabs in the same browser
- **MQTT** (`parolier/slide_state`): presenter publishes, display subscribes — syncs across devices
- **`strophes[]` is NOT serialized** — each window fetches its own song data from Supabase
- **SYNC events don't re-publish** — prevents infinite echo loops
