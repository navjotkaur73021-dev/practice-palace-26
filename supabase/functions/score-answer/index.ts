// Score a single interview answer + return improved professional response
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      roleTitle,
      question,
      answer,
      language = "en",
      kind = "open",
      options,
      correctIndex,
    } = await req.json();

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

    // For MCQ: deterministic score + brief explanation
    const mcqContext =
      kind === "mcq"
        ? `\n\nThis was a MULTIPLE CHOICE question. Options were:\n${(options ?? [])
            .map((o: string, i: number) => `  ${i}) ${o}`)
            .join("\n")}\nCorrect index: ${correctIndex}\nCandidate selected index: ${answer}`
        : "";

    const systemPrompt = `You are an expert interview coach. Evaluate the candidate's response fairly and constructively. ALWAYS reply in ${langLabel}.

Return:
- score (0-100)
- feedback (2-3 sentences)
- improved (a strong 60-120 word model answer in STAR or structured format)
- skills: rate four dimensions 0-100: clarity, depth, structure, confidence
- tip: ONE short, personalized actionable tip (max 18 words)
- topic: ONE concise topic/skill tag (1-3 words, English, Title Case) categorizing what this question tests (e.g. "System Design", "SQL Joins", "Behavioral", "Data Structures", "Leadership", "Banking Awareness"). Use consistent canonical names.
${kind === "mcq" ? "For MCQ: score 100 if selected index matches correct index, else 0-30. Briefly explain why the correct option is right." : ""}`;

    const userPrompt = `Role: ${roleTitle ?? "general"}\nQuestion: ${question}${mcqContext}\n${
      kind === "mcq"
        ? ""
        : `Candidate answer: ${answer?.toString().trim() ? answer : "(no answer provided)"}`
    }`;

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
                name: "return_evaluation",
                description: "Return the structured evaluation",
                parameters: {
                  type: "object",
                  properties: {
                    score: { type: "number", minimum: 0, maximum: 100 },
                    feedback: { type: "string" },
                    improved: { type: "string" },
                    skills: {
                      type: "object",
                      properties: {
                        clarity: { type: "number", minimum: 0, maximum: 100 },
                        depth: { type: "number", minimum: 0, maximum: 100 },
                        structure: { type: "number", minimum: 0, maximum: 100 },
                        confidence: { type: "number", minimum: 0, maximum: 100 },
                      },
                      required: ["clarity", "depth", "structure", "confidence"],
                      additionalProperties: false,
                    },
                    tip: { type: "string" },
                    topic: { type: "string", description: "Concise 1-3 word topic tag in English Title Case" },
                  },
                  required: ["score", "feedback", "improved", "skills", "tip", "topic"],
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

    const skills = args.skills ?? {};
    const result = {
      score: Math.max(0, Math.min(100, Math.round(Number(args.score) || 0))),
      feedback: String(args.feedback ?? ""),
      improved: String(args.improved ?? ""),
      skills: {
        clarity: Math.round(Number(skills.clarity) || 0),
        depth: Math.round(Number(skills.depth) || 0),
        structure: Math.round(Number(skills.structure) || 0),
        confidence: Math.round(Number(skills.confidence) || 0),
      },
      tip: String(args.tip ?? ""),
      topic: String(args.topic ?? "General").trim().slice(0, 40) || "General",
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
