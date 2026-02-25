import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Strophe {
  type: "verse" | "chorus" | "bridge" | "section";
  content: Array<{ text: string; chords: string }> | string;
  repetition: boolean;
}

interface ProcessImageRequest {
  imageUrl: string;
}

interface ProcessImageResponse {
  title?: string;
  strophes: Strophe[];
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let fileName: string | null = null;
  let supabase: any = null;

  try {
    const { imageUrl }: ProcessImageRequest = await req.json();

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    // Extract filename for cleanup
    const urlParts = imageUrl.split("/");
    fileName = urlParts[urlParts.length - 1];

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Claude API key from environment
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      throw new Error("Claude API key not configured");
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    // Convert to base64 without stack overflow for large images
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binary);

    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Call Claude Vision API
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6-20250514",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  type: "text",
                  text: `You are a music transcription assistant. Extract song lyrics and chords from this image into structured JSON.

## Output format

Return ONLY a JSON array (no markdown, no explanation). Each element:
{
  "type": "chorus" | "verse" | "bridge",  // "R." or "Ref." = chorus, numbered = verse
  "content": [
    {"text": "lyric line", "chords": "Em B"},  // chords above this line; "" if none
    {"text": "another line", "chords": ""}
  ],
  "repetition": false  // true for 2nd+ occurrence of a repeated section
}

## Chord conversion (French → English)

Do → C, Ré → D, Mi → E, Fa → F, Sol → G, La → A, Si → B
Add suffix as-is: m (minor), 7, maj7, sus4, dim, aug, b (flat), # (sharp)
Examples: Mim → Em, Solm7 → Gm7, Fa#m → F#m, Sib → Bb, Lam → Am

## Rules

1. Chords above a lyric line belong to that line. Join multiple chords with spaces.
2. If a line has no chords above it, set "chords": "".
3. Each printed line of lyrics = one object in the content array.
4. Every time the chorus appears (including "R." markers), output it in full. First occurrence: repetition: false. All subsequent: repetition: true.
5. Return ONLY the JSON array.`,
                },
              ],
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content[0].text;

    // Parse the JSON response from Claude
    let strophes: Strophe[];
    try {
      // Normalize \r\n before parsing
      const cleanedText = responseText.replace(/\r\n/g, "\n");
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch =
        cleanedText.match(/```json\n([\s\S]*?)\n```/) ||
        cleanedText.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : cleanedText;
      strophes = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("Failed to parse Claude response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // Validate the response structure
    if (!Array.isArray(strophes)) {
      throw new Error("Invalid response structure from AI");
    }

    // Post-process: normalize French chords and clean up strings
    const frenchChordMap: [RegExp, string][] = [
      [/^Sol/, "G"],
      [/^Ré/, "D"],
      [/^La/, "A"],
      [/^Si/, "B"],
      [/^Do/, "C"],
      [/^Mi/, "E"],
      [/^Fa/, "F"],
    ];

    function normalizeFrenchChord(chord: string): string {
      for (const [pattern, replacement] of frenchChordMap) {
        if (pattern.test(chord)) {
          return chord.replace(pattern, replacement);
        }
      }
      return chord;
    }

    for (const strophe of strophes) {
      if (!Array.isArray(strophe.content)) continue;
      for (const line of strophe.content) {
        line.text = line.text?.replace(/[\r\n]/g, "").trim() ?? "";
        if (line.chords) {
          line.chords = line.chords
            .replace(/[\r\n]/g, "")
            .trim()
            .split(/\s+/)
            .map(normalizeFrenchChord)
            .join(" ");
        } else {
          line.chords = "";
        }
      }
    }

    const result: ProcessImageResponse = {
      title: undefined, // Title extraction would need a different prompt
      strophes: strophes,
      success: true,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Edge function error:", error);

    const errorResponse: ProcessImageResponse = {
      strophes: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    return new Response(JSON.stringify(errorResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 500,
    });
  } finally {
    // Clean up the image file - this runs whether success or failure
    if (fileName && supabase) {
      try {
        console.log(`Attempting to delete file: ${fileName}`);
        const { error: deleteError } = await supabase.storage
          .from("song-images")
          .remove([fileName]);

        if (deleteError) {
          console.warn("Failed to delete image file:", deleteError);
        } else {
          console.log(`Successfully deleted image file: ${fileName}`);
        }
      } catch (cleanupError) {
        console.warn("Error during image cleanup:", cleanupError);
      }
    }
  }
});
