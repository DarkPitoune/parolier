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
          model: "claude-haiku-4-5-20251001",
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
                  text: `Extract the song lyrics and chords from this image. Return ONLY a JSON array with this exact structure, no explanation before or after:
[
  {
    "type": "chorus",
    "content": [
      {"text": "Par amour ô Jésus", "chords": "Em B"},
      {"text": "Tu Te donnes tout entier", "chords": ""}
    ],
    "repetition": false
  },
  {
    "type": "verse",
    "content": [
      {"text": "Fais nous devenir Seigneur des Hommes", "chords": "Em B"}
    ],
    "repetition": false
  },
  {
    "type": "chorus",
    "content": [
      {"text": "Par amour ô Jésus", "chords": "Em B"},
      {"text": "Tu Te donnes tout entier", "chords": ""}
    ],
    "repetition": true
  }
]
Important rules:
1. LEFT COLUMN contains chords (Mim Si = Em B, Sol Ré = G D, Lam = Am, Do = C, Ré = D, Mi = E, Fa = F, Si = B)
2. RIGHT COLUMN contains lyrics
3. Convert French chord names to English: Mim→Em, Rem→Dm, Lam→Am, Solm→Gm, Do→C, Ré→D, Mi→E, Fa→F, Sol→G, La→A, Si→B
4. Identify sections: "R." = chorus (refrain), numbers like "1." = verse
5. Each line of lyrics is a separate object in the content array
6. Match chords to their corresponding lyrics line by line
7. CRITICAL: Every time you see "R." or the chorus repeated in the image, output the FULL chorus section again. The FIRST occurrence has repetition: false. EVERY subsequent occurrence has repetition: true.
8. Do NOT just output the chorus once - repeat it in full every time it appears in the song structure
9. IMPORTANT: Return ONLY the JSON array, nothing else. No markdown code blocks, no explanation.`,
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
      // Extract JSON from the response (Claude might wrap it in markdown)
      const jsonMatch =
        responseText.match(/```json\n([\s\S]*?)\n```/) ||
        responseText.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      strophes = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("Failed to parse Claude response:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // Validate the response structure
    if (!Array.isArray(strophes)) {
      throw new Error("Invalid response structure from AI");
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
