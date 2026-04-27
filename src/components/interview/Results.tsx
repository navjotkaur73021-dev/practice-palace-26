import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { type Role, type Language } from "@/lib/interviewData";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw, Home, TrendingUp, BarChart3, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = {
  role: Role;
  language: Language;
  questions: string[];
  answers: string[];
  onRestart: () => void;
  onHome: () => void;
};

type Scored = {
  score: number;
  feedback: string;
  improved: string;
};

export const Results = ({ role, language, questions, answers, onRestart, onHome }: Props) => {
  const [scored, setScored] = useState<(Scored | null)[]>(() => questions.map(() => null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results: (Scored | null)[] = await Promise.all(
        questions.map(async (q, i) => {
          const { data, error } = await supabase.functions.invoke("score-answer", {
            body: {
              roleTitle: role.title,
              question: q,
              answer: answers[i] ?? "",
              language,
            },
          });
          if (error || !data || typeof data.score !== "number") {
            console.error("Scoring failed for Q" + (i + 1), error, data);
            return null;
          }
          return data as Scored;
        }),
      );
      if (cancelled) return;
      setScored(results);
      setLoading(false);
      if (results.some((r) => r === null)) {
        toast.error("Some answers couldn't be scored. Showing what we have.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questions, answers, role.title, language]);

  const valid = scored.filter((s): s is Scored => !!s);
  const overall = valid.length
    ? Math.round(valid.reduce((s, x) => s + x.score, 0) / valid.length)
    : 0;
  const best = valid.length ? Math.max(...valid.map((s) => s.score)) : 0;
  const weakest = valid.length ? Math.min(...valid.map((s) => s.score)) : 0;

  const verdict =
    overall >= 80 ? { label: "Interview-ready" }
    : overall >= 60 ? { label: "Almost there" }
    : { label: "Keep practicing" };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <header className="container flex items-center justify-between py-6">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="container flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <h2 className="mt-6 font-display text-2xl font-semibold">
            Reviewing your answers…
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your AI coach is grading each response and writing personalized feedback.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onHome}>
            <Home /> Home
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl pb-24 pt-4">
        <div className="animate-fade-up text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your results · {role.title}
          </span>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight md:text-6xl text-balance">
            {verdict.label}<span className="text-accent">.</span>
          </h1>

          <div className="relative mx-auto mt-10 flex h-56 w-56 items-center justify-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="52" stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="hsl(var(--accent))"
                strokeWidth="8" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(overall / 100) * 326.7} 326.7`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="text-center">
              <div className="font-display text-6xl font-semibold tabular-nums">{overall}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">overall score</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={onRestart}>
              <RotateCcw /> Retry interview
            </Button>
            <Button variant="outline" size="lg" onClick={onHome}>
              Try a different role
            </Button>
          </div>
        </div>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Best answer", value: best, hint: `Q${scored.findIndex((s) => s?.score === best) + 1}` },
            { label: "Needs work", value: weakest, hint: `Q${scored.findIndex((s) => s?.score === weakest) + 1}` },
            { label: "Questions", value: questions.length, hint: "completed" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tabular-nums">{s.value}</span>
                <span className="text-sm text-muted-foreground">{s.hint}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-semibold">Score by question</h2>
          </div>
          <div className="mt-8 flex h-48 items-end gap-3 sm:gap-5">
            {scored.map((s, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div className="text-xs font-medium tabular-nums text-muted-foreground transition-colors group-hover:text-accent">
                  {s?.score ?? "—"}
                </div>
                <div className="relative w-full flex-1 overflow-hidden rounded-t-xl bg-secondary">
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-warm transition-all duration-1000 ease-out"
                    style={{ height: `${s?.score ?? 0}%` }}
                  />
                </div>
                <div className="font-display text-xs text-muted-foreground">Q{i + 1}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold">Question-by-question</h2>
          </div>

          <div className="mt-6 space-y-4">
            {questions.map((q, i) => {
              const s = scored[i];
              const answer = answers[i] ?? "";
              return (
                <article
                  key={i}
                  className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Question {i + 1}
                      </span>
                      <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
                        {q}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl font-semibold tabular-nums">
                        {s?.score ?? "—"}
                        <span className="text-base text-muted-foreground">/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-warm transition-all duration-700"
                      style={{ width: `${s?.score ?? 0}%` }}
                    />
                  </div>

                  {answer && (
                    <blockquote className="mt-5 border-l-2 border-accent pl-4 text-sm italic text-muted-foreground">
                      "{answer.length > 280 ? answer.slice(0, 280) + "…" : answer}"
                    </blockquote>
                  )}

                  {s ? (
                    <>
                      <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-accent">Coach feedback</div>
                        <p className="mt-1 text-foreground">{s.feedback}</p>
                      </div>
                      {s.improved && (
                        <div className="mt-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                            <Sparkles className="h-3.5 w-3.5" />
                            Stronger answer
                          </div>
                          <p className="mt-1 text-foreground leading-relaxed">{s.improved}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                      Couldn't score this answer.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
