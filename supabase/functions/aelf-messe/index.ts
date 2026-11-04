const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { date } = await req.json().catch(() => ({}));
  if (typeof date !== "string" || !ISO_DATE.test(date)) {
    return json({ error: "date (YYYY-MM-DD) is required" }, 400);
  }

  try {
    const upstream = await fetch(
      `https://api.aelf.org/v1/messes/${date}/france`,
    );
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("AELF fetch failed:", error);
    return json({ error: "AELF unreachable" }, 502);
  }
});
