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
  brief: VeilleeBrief;
  template: SlotKind[];
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
  for (const song of songs) {
    const tags = song.tags.length > 0 ? song.tags.join(", ") : "aucun";
    const excerpt = song.excerpt.replace(/\s+/g, " ").trim();
    lines.push(
      `[ID:${song.id}] ${song.title} | Tags: ${tags} | Joué en: ${formatUsage(song.usedAs)} | Extrait: ${excerpt}`,
    );
  }
  return lines.join("\n");
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
    const { brief, template, songs }: SuggestRequest = await req.json();

    if (!brief?.theme || !Array.isArray(template) || !Array.isArray(songs)) {
      throw new Error("brief, template and songs are required");
    }
    if (songs.length > MAX_SONGS || template.length > MAX_TEMPLATE) {
      throw new Error("request too large");
    }

    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralApiKey) {
      throw new Error("Mistral API key not configured");
    }

    const mistralResponse = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralApiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          max_tokens: 3000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildUserMessage(brief, template, songs),
            },
          ],
        }),
      },
    );

    if (!mistralResponse.ok) {
      const error = await mistralResponse.text();
      throw new Error(`Mistral API error: ${error}`);
    }

    const mistralData = await mistralResponse.json();
    const responseText = mistralData.choices[0].message.content;

    let parsed: { summary?: unknown; items?: unknown };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Mistral response:", responseText);
      throw new Error("Failed to parse AI response");
    }

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

    return new Response(
      JSON.stringify({
        success: true,
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        items,
        warnings,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Edge function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
