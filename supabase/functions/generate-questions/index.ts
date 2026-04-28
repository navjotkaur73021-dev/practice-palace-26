// Generate role + language tailored interview questions via Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  pa: "Punjabi (Gurmukhi script)",
};

const DIFFICULTY_HINT: Record<string, string> = {
  easy: "Warm-up level — fundamentals, definitions, comfortable opening questions.",
  medium: "Realistic mid-level interview difficulty — practical scenarios and applied knowledge.",
  hard: "Senior / stretch difficulty — deeper trade-offs, edge cases, leadership and ambiguity.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      roleTitle,
      roleBlurb,
      language = "en",
      count = 5,
      difficulty = "medium",
      format = "mixed", // "open" | "mcq" | "mixed"
    } = await req.json();

    if (!roleTitle || typeof roleTitle !== "string") {
      return new Response(JSON.stringify({ error: "roleTitle required" }), {
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
    const diffHint = DIFFICULTY_HINT[difficulty] ?? DIFFICULTY_HINT.medium;

    const formatInstruction =
      format === "mcq"
        ? `Generate ALL questions as multiple-choice with exactly 4 plausible options. Mark the index of the correct answer (0-3).`
        : format === "open"
        ? `Generate ALL questions as open-ended interview questions (no multiple choice).`
        : `Generate a balanced mix: roughly half open-ended interview questions and half multiple-choice questions (4 options each, mark the correct index 0-3).`;

    const systemPrompt = `You are a senior interview coach generating realistic mock interview questions. Write ALL content in ${langLabel} (questions, options, everything). Difficulty: ${diffHint} ${formatInstruction} Open questions should be answerable in 60-120 seconds. MCQ options should be plausible and distinct.`;

    const userPrompt = `Role: ${roleTitle}\nFocus: ${roleBlurb ?? ""}\nDifficulty: ${difficulty}\nFormat: ${format}\nGenerate exactly ${count} questions in ${langLabel}.`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_questions",
                description: "Return the generated interview questions",
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      minItems: count,
                      maxItems: count,
                      items: {
                        type: "object",
                        properties: {
                          kind: { type: "string", enum: ["open", "mcq"] },
                          text: { type: "string" },
                          options: {
                            type: "array",
                            items: { type: "string" },
                            description: "Required when kind is mcq. Exactly 4 options.",
                          },
                          correctIndex: {
                            type: "number",
                            description: "Required when kind is mcq. Index 0-3.",
                          },
                        },
                        required: ["kind", "text"],
                      },
                    },
                  },
                  required: ["questions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_questions" },
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
    const raw: any[] = Array.isArray(args.questions) ? args.questions : [];

    // Normalize + validate
    const questions = raw
      .map((q) => {
        if (!q || typeof q.text !== "string") return null;
        if (q.kind === "mcq") {
          const opts = Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [];
          while (opts.length < 4) opts.push("—");
          const ci =
            typeof q.correctIndex === "number" &&
            q.correctIndex >= 0 &&
            q.correctIndex < 4
              ? q.correctIndex
              : 0;
          return { kind: "mcq", text: q.text, options: opts, correctIndex: ci };
        }
        return { kind: "open", text: q.text };
      })
      .filter(Boolean);

    if (questions.length === 0) {
      console.error("No questions parsed from AI response", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to parse questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
