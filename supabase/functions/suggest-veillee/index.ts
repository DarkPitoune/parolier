import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SongSlot = "louange" | "esprit" | "adoration" | "marie";
type SlotKind = SongSlot | "silence";

const SONG_SLOTS: SongSlot[] = ["louange", "esprit", "adoration", "marie"];

interface VeilleeBrief {
  theme: string;
  durationMin: number;
  adoration: boolean;
  silences: "none" | "few" | "many";
  marie: boolean;
}

interface CompactVeilleeSong {
  id: number;
  title: string;
  tags: string[];
  usedAs: Partial<Record<SongSlot, number>>;
  excerpt: string;
}

interface SuggestRequest {
  mode?: "suggest";
  brief: VeilleeBrief;
  template: SlotKind[];
  songs: CompactVeilleeSong[];
}

interface DraftLine {
  key: string;
  slot: SlotKind;
  songId: number | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RefineRequest {
  mode: "refine";
  brief: VeilleeBrief;
  draft: DraftLine[];
  messages: ChatMessage[];
  songs: CompactVeilleeSong[];
}

interface SuggestedItem {
  slot: SongSlot;
  songId: number;
  reasoning: string;
  alternatives: number[];
}

const MAX_SONGS = 400;
const MAX_TEMPLATE = 40;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1000;

const SYSTEM_PROMPT = `Tu aides une communauté catholique à préparer une veillée de louange autour d'un thème.

La veillée suit toujours cet arc, dans cet ordre :
1. LOUANGE : chants joyeux qui rassemblent. Ouvre fort (chant très connu, entraînant), puis descends progressivement vers des louanges plus posées, pour préparer le passage à l'Esprit Saint.
2. ESPRIT SAINT : un seul chant, le pivot de la soirée. On invoque l'Esprit avant d'entrer dans l'adoration.
3. ADORATION : chants intimes, lents, tournés vers le Christ présent. Recueillement.
4. MARIE : un seul chant marial pour conclure.

Le nombre de chants par moment est imposé, tu dois le respecter exactement.

Pour chaque chant du répertoire, tu reçois ses tags et l'endroit où la communauté l'a déjà chanté lors de veillées passées ("joué en"). Ce sont des indices, pas des règles :
- l'usage passé compte plus que le tag quand ils divergent (un chant tagué Louange souvent joué en adoration convient à l'adoration) ;
- le thème peut justifier un choix inhabituel : dans ce cas, dis-le dans le raisonnement.

Choisis les chants dont les PAROLES (extraits) résonnent le mieux avec le thème. Un chant ne peut apparaître qu'une seule fois. Pour chaque chant choisi, propose 1 à 3 alternatives qui conviendraient au même moment.

Ordonne les chants de louange dans l'ordre où ils seront chantés. Pour les autres moments, l'ordre de ta liste est l'ordre de la veillée.

Réponds UNIQUEMENT en JSON :
{
  "summary": "1-2 phrases : comment la sélection sert le thème",
  "items": [
    { "slot": "louange" | "esprit" | "adoration" | "marie", "songId": <number>, "reasoning": "<1 phrase>", "alternatives": [<number>, ...] }
  ]
}`;

const REFINE_PROMPT = `Tu aides une communauté catholique à ajuster la setlist d'une veillée de louange déjà proposée.

L'arc de la veillée : LOUANGE (joyeuse, ouvre fort puis se pose) → un seul chant ESPRIT SAINT (le pivot) → ADORATION (intime, recueillie, avec d'éventuels silences) → un chant à MARIE pour conclure.

Tu reçois le thème, la setlist actuelle (chaque ligne a une clé entre crochets), le répertoire et la conversation. Réponds à la dernière demande de l'utilisateur en modifiant la setlist par des opérations :
- {"op": "replace", "key": "<clé>", "songId": <id>} : remplace le chant à cette clé
- {"op": "insert", "afterKey": "<clé>" | null, "slot": "louange" | "esprit" | "adoration" | "marie", "songId": <id>} : ajoute un chant après cette clé (null = au début)
- {"op": "remove", "key": "<clé>"} : retire un chant ou un silence
- {"op": "move", "key": "<clé>", "toIndex": <position à partir de 0>} : déplace un élément
- {"op": "addSilence", "afterKey": "<clé>" | null} : ajoute un silence

Règles :
- Les opérations s'appliquent dans l'ordre ; après un replace, la clé du nouveau chant devient "song-<id>".
- Un chant ne peut apparaître qu'une fois, et il n'y a qu'un seul chant à l'Esprit Saint.
- Les tags et l'usage passé ("joué en") sont des indices, pas des règles.
- Tu ne peux QUE choisir, ajouter, retirer ou déplacer des chants et des silences, avec les opérations ci-dessus. Tu ne peux pas modifier les paroles, raccourcir un refrain, changer une tonalité ou un arrangement : si on te le demande, dis-le simplement, sans proposer d'opération ni prétendre l'avoir fait.
- Ne fais que ce qui est demandé. Si la demande n'a pas de sens pour une veillée ou n'est pas claire, ne propose aucune opération et explique-le ou pose une question.
- La réponse ("reply") est courte (1-2 phrases), en français, et tutoie l'utilisateur.

Réponds UNIQUEMENT en JSON :
{ "reply": "<string>", "ops": [ ... ] }`;

function formatUsage(usedAs: CompactVeilleeSong["usedAs"]): string {
  const parts = SONG_SLOTS.filter((slot) => usedAs[slot]).map(
    (slot) => `${slot}×${usedAs[slot]}`,
  );
  return parts.length > 0 ? parts.join(", ") : "jamais";
}

function buildUserMessage(
  brief: VeilleeBrief,
  template: SlotKind[],
  songs: CompactVeilleeSong[],
): string {
  const countOf = (slot: SlotKind) => template.filter((s) => s === slot).length;
  const lines = [
    `Thème : ${brief.theme}`,
    `Durée : ${brief.durationMin} minutes`,
    "",
    "CHANTS À CHOISIR :",
    ...SONG_SLOTS.filter((slot) => countOf(slot) > 0).map(
      (slot) => `- ${slot} : ${countOf(slot)}`,
    ),
    "",
    `RÉPERTOIRE (${songs.length} chants) :`,
  ];
  return [...lines, ...formatRepertoire(songs)].join("\n");
}

function formatRepertoire(songs: CompactVeilleeSong[]): string[] {
  return songs.map((song) => {
    const tags = song.tags.length > 0 ? song.tags.join(", ") : "aucun";
    const excerpt = song.excerpt.replace(/\s+/g, " ").trim();
    return `[ID:${song.id}] ${song.title} | Tags: ${tags} | Joué en: ${formatUsage(song.usedAs)} | Extrait: ${excerpt}`;
  });
}

function buildRefineContext(
  brief: VeilleeBrief,
  draft: DraftLine[],
  songs: CompactVeilleeSong[],
): string {
  const titles = new Map(songs.map((s) => [s.id, s.title]));
  return [
    `Thème : ${brief.theme}`,
    `Durée : ${brief.durationMin} minutes`,
    "",
    "SETLIST ACTUELLE :",
    ...draft.map((line, index) =>
      line.songId === null
        ? `${index}. [${line.key}] silence`
        : `${index}. [${line.key}] ${line.slot} · ${titles.get(line.songId) ?? "?"} (ID:${line.songId})`
    ),
    "",
    `RÉPERTOIRE (${songs.length} chants) :`,
    ...formatRepertoire(songs),
  ].join("\n");
}

async function callMistral(apiKey: string, messages: unknown[]) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${error}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  try {
    return JSON.parse(text);
  } catch {
    console.error("Failed to parse Mistral response:", text);
    throw new Error("Failed to parse AI response");
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function refine(apiKey: string, request: RefineRequest) {
  const { brief, draft, messages, songs } = request;
  if (!brief?.theme || !Array.isArray(draft) || !Array.isArray(messages)) {
    throw new Error("brief, draft and messages are required");
  }
  if (!Array.isArray(songs) || songs.length > MAX_SONGS) {
    throw new Error("invalid songs");
  }
  if (draft.length > MAX_TEMPLATE * 2) {
    throw new Error("request too large");
  }
  const conversation = messages
    .slice(-MAX_MESSAGES)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
    }));
  while (conversation[0]?.role === "assistant") conversation.shift();
  if (conversation.at(-1)?.role !== "user") {
    throw new Error("the last message must come from the user");
  }

  const parsed = await callMistral(apiKey, [
    {
      role: "system",
      content: `${REFINE_PROMPT}\n\n${buildRefineContext(brief, draft, songs)}`,
    },
    ...conversation,
  ]);

  const knownIds = new Set(songs.map((s) => s.id));
  const ops = Array.isArray(parsed.ops)
    ? parsed.ops
        .filter((op: unknown) => typeof op === "object" && op !== null)
        .map((op: Record<string, unknown>) =>
          op.songId === undefined ? op : { ...op, songId: Number(op.songId) }
        )
        .filter(
          (op: Record<string, unknown>) =>
            op.songId === undefined || knownIds.has(op.songId as number),
        )
    : [];
  return {
    success: true,
    reply: typeof parsed.reply === "string" ? parsed.reply : "",
    ops,
  };
}

function validateItems(raw: unknown, knownIds: Set<number>) {
  const items: SuggestedItem[] = [];
  const warnings: string[] = [];
  const used = new Set<number>();
  if (!Array.isArray(raw)) return { items, warnings: ["items manquants"] };

  for (const entry of raw) {
    const songId = Number(entry?.songId);
    const slot = entry?.slot;
    if (!SONG_SLOTS.includes(slot)) {
      warnings.push(`moment inconnu: ${slot}`);
      continue;
    }
    if (!knownIds.has(songId)) {
      warnings.push(`chant inconnu: ${entry?.songId}`);
      continue;
    }
    if (used.has(songId)) {
      warnings.push(`chant en double: ${songId}`);
      continue;
    }
    used.add(songId);
    const alternatives = Array.isArray(entry.alternatives)
      ? entry.alternatives.map(Number).filter((id: number) => knownIds.has(id))
      : [];
    items.push({
      slot,
      songId,
      reasoning: typeof entry.reasoning === "string" ? entry.reasoning : "",
      alternatives,
    });
  }
  return { items, warnings };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralApiKey) {
      throw new Error("Mistral API key not configured");
    }

    const request: SuggestRequest | RefineRequest = await req.json();
    if (request.mode === "refine") {
      return jsonResponse(await refine(mistralApiKey, request));
    }

    const { brief, template, songs } = request;
    if (!brief?.theme || !Array.isArray(template) || !Array.isArray(songs)) {
      throw new Error("brief, template and songs are required");
    }
    if (songs.length > MAX_SONGS || template.length > MAX_TEMPLATE) {
      throw new Error("request too large");
    }

    const parsed = await callMistral(mistralApiKey, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(brief, template, songs) },
    ]);

    const { items, warnings } = validateItems(
      parsed.items,
      new Set(songs.map((s) => s.id)),
    );

    if (warnings.length > 0) {
      console.warn("Dropped suggestions:", warnings);
    }
    if (items.length === 0) {
      throw new Error("Aucun chant valide dans la réponse");
    }

    return jsonResponse({
      success: true,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      items,
      warnings,
    });
  } catch (error) {
    console.error("Edge function error:", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
