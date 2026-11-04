import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CompactSong {
  id: number;
  title: string;
  tags: string[];
  excerpt: string;
}

interface LiturgicalData {
  date: string;
  celebration: string;
  details: string[];
  temps_liturgique: string | null;
  couleur: string;
  lectures: Array<{
    type: string;
    titre: string | null;
    ref: string;
    contenu: string;
    refrain_psalmique?: string;
    verset_evangile?: string;
  }>;
}

interface SuggestRequest {
  liturgicalData: LiturgicalData;
  compactSongs: CompactSong[];
}

interface SongSuggestion {
  role: "entree" | "offertoire" | "communion" | "envoi";
  songId: number;
  songTitle: string;
  reasoning: string;
  alternatives: Array<{ songId: number; songTitle: string }>;
}

interface SuggestResponse {
  success: boolean;
  suggestions?: SongSuggestion[];
  liturgicalSummary?: string;
  error?: string;
}

const SYSTEM_PROMPT = `Tu es un expert en liturgie catholique romaine, specialise dans le choix de chants pour la messe.

Tu dois suggerer 4 chants parmi le repertoire fourni, un pour chaque moment :

1. CHANT D'ENTREE :
   - Ouvre la celebration, rassemble l'assemblee dans l'unite
   - Langage communautaire ("nous"), louange, joie
   - Rythme processional adapte a la marche
   - DOIT correspondre au temps liturgique du jour
   - Introduit au mystere celebre (fete, saison)

2. CHANT D'OFFERTOIRE :
   - Accompagne la presentation des dons
   - Commente la fete, le temps liturgique, ou l'Evangile du jour
   - Themes : offrande, Dieu source de tout don, la creation rassemblee dans le pain et le vin
   - Plus contemplatif, seuil vers le mystere eucharistique
   - Peut etre lie aux themes des lectures du jour

3. CHANT DE COMMUNION :
   - S'adresse au Christ ou evoque la communion eucharistique
   - Themes : humilite, emerveillement devant le don gratuit de Dieu,
     transformation ("nous devenons ce que nous recevons"), unite dans le Corps du Christ
   - Caractere recueilli, intime, processional
   - Idealement un chant bien connu de l'assemblee

4. CHANT D'ENVOI :
   - Dimension missionnaire : nous sommes envoyes dans le monde
   - Themes : mission, temoignage, bapteme, partage de la Bonne Nouvelle
   - Joyeux et energique
   - Tourne l'assemblee vers le monde

REGLES PAR TEMPS LITURGIQUE :
- Avent : attente, esperance, veille. Sobre et retenu. Eviter les chants trop festifs.
- Noel : joie de l'incarnation, lumiere, naissance du Sauveur
- Careme : penitence, conversion, sobriete. Eviter allegresse et alleluia.
- Semaine Sainte : intense, depouille, passion du Christ
- Paques : resurrection, joie pascale, victoire sur la mort, alleluia
- Pentecote : Esprit Saint, feu, dons de l'Esprit, mission
- Temps Ordinaire : plus flexible, adapte aux lectures du dimanche

CONTRAINTES STRICTES PAR TAG :
- Tag "Méditation" : INTERDIT en chant d'entree et chant d'envoi (sauf Semaine Sainte ou contexte tres solennel/penitentiel). Acceptable en offertoire ou communion. Peut apparaitre en alternative.
- Tag "Louange" : INTERDIT en communion et offertoire. Parfait pour l'entree ou l'envoi.
- Tag "Marie" : bon choix pour le chant d'envoi. Acceptable ailleurs si la fete le justifie (fetes mariales).

CRITERES DE SELECTION :
1. Le temps liturgique est le critere PRIORITAIRE
2. Respecter les contraintes par tag ci-dessus
3. Ensuite, la correspondance avec les themes des lectures du jour
4. Les tags des chants donnent des indices thematiques importants
5. Analyse les paroles (extrait) pour verifier la coherence
6. Chaque chant ne peut etre utilise qu'UNE SEULE FOIS
7. Si aucun chant ne correspond parfaitement, choisis le meilleur et explique le compromis
8. Propose 1-2 alternatives par moment

Reponds UNIQUEMENT en JSON :
{
  "liturgicalSummary": "resume bref du contexte liturgique du jour",
  "suggestions": [
    {
      "role": "entree",
      "songId": <number>,
      "songTitle": "<string>",
      "reasoning": "<1-2 phrases expliquant le choix>",
      "alternatives": [{"songId": <number>, "songTitle": "<string>"}]
    },
    { "role": "offertoire", ... },
    { "role": "communion", ... },
    { "role": "envoi", ... }
  ]
}`;

function buildUserMessage(data: LiturgicalData, songs: CompactSong[]): string {
  const lines: string[] = [
    `Date : ${data.date}`,
    `Jour liturgique : ${data.celebration}`,
  ];
  if (data.details.length > 0) {
    lines.push(`Celebration : ${data.details.join(" - ")}`);
  }
  if (data.temps_liturgique) {
    lines.push(`Temps liturgique : ${data.temps_liturgique}`);
  }
  lines.push(`Couleur liturgique : ${data.couleur}`, "", "LECTURES DU JOUR :");

  for (const lecture of data.lectures) {
    lines.push(`\n  ${lecture.titre ?? lecture.type} (${lecture.ref})`);
    lines.push(`  ${lecture.contenu}`);
    if (lecture.refrain_psalmique) {
      lines.push(`  Refrain psalmique : ${lecture.refrain_psalmique}`);
    }
    if (lecture.verset_evangile) {
      lines.push(`  Verset de l'Evangile : ${lecture.verset_evangile}`);
    }
  }

  lines.push("");
  lines.push(`REPERTOIRE DISPONIBLE (${songs.length} chants) :`);
  for (const song of songs) {
    const tags = song.tags.length > 0 ? song.tags.join(", ") : "aucun";
    lines.push(
      `[ID:${song.id}] ${song.title} | Tags: ${tags} | Extrait: ${song.excerpt}`
    );
  }

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { liturgicalData, compactSongs }: SuggestRequest = await req.json();

    if (!liturgicalData || !compactSongs) {
      throw new Error("liturgicalData and compactSongs are required");
    }

    const mistralApiKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralApiKey) {
      throw new Error("Mistral API key not configured");
    }

    const userMessage = buildUserMessage(liturgicalData, compactSongs);

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
          max_tokens: 2000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!mistralResponse.ok) {
      const error = await mistralResponse.text();
      throw new Error(`Mistral API error: ${error}`);
    }

    const mistralData = await mistralResponse.json();
    const responseText = mistralData.choices[0].message.content;

    let parsed: { liturgicalSummary: string; suggestions: SongSuggestion[] };
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Mistral response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    const result: SuggestResponse = {
      success: true,
      suggestions: parsed.suggestions,
      liturgicalSummary: parsed.liturgicalSummary,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge function error:", error);

    const errorResponse: SuggestResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
