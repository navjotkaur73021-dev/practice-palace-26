// Score a single interview answer + return improved professional response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roleTitle, question, answer, language = "en" } = await req.json();

    if (!question) {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langLabel = LANG_LABEL[language] ?? "English";

    const systemPrompt = `You are an expert interview coach. Evaluate an interview answer fairly and constructively. Always reply in ${langLabel}. Give a 0-100 score, a short critique (2-3 sentences) noting strengths and weaknesses, and an "improved" version that shows what a strong professional answer would sound like (concise, structured, ideally STAR format, 60-120 words).`;

    const userPrompt = `Role: ${roleTitle ?? "general"}\nQuestion: ${question}\nCandidate answer: ${answer?.trim() ? answer : "(no answer provided)"}`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_evaluation",
                description: "Return the structured evaluation",
                parameters: {
                  type: "object",
                  properties: {
                    score: { type: "number", minimum: 0, maximum: 100 },
                    feedback: { type: "string", description: "2-3 sentence critique" },
                    improved: { type: "string", description: "Improved professional answer" },
                  },
                  required: ["score", "feedback", "improved"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_evaluation" },
          },
        }),
      },
    );

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached, please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    const result = {
      score: Math.max(0, Math.min(100, Math.round(Number(args.score) || 0))),
      feedback: String(args.feedback ?? ""),
      improved: String(args.improved ?? ""),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-answer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
