import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { type Role, type Language, type Difficulty } from "@/lib/interviewData";
import { type QuizQuestion } from "@/lib/settingsStorage";
import { supabase } from "@/integrations/supabase/client";
import {
  RotateCcw,
  Home,
  TrendingUp,
  BarChart3,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
  FileText,
  Star,
  Lightbulb,
  Check,
  X as XIcon,
  Target,
  Flame,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveSession,
  updateSession,
  exportSessionMarkdown,
  downloadFile,
  type SavedScored,
  type SkillScores,
} from "@/lib/sessionStorage";

type Props = {
  role: Role;
  language: Language;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  answers: string[];
  onRestart: () => void;
  onHome: () => void;
  onAdaptiveRevision?: (weakTopics: string[]) => void;
};

const StarRating = ({ score, size = 4 }: { score: number; size?: number }) => {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-${size} w-${size} ${
            i <= stars ? "fill-accent text-accent" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
};

const SkillBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular-nums font-semibold">{value}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-gradient-warm transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export const Results = ({
  role,
  language,
  difficulty,
  questions,
  answers,
  onRestart,
  onHome,
  onAdaptiveRevision,
}: Props) => {
  const [scored, setScored] = useState<SavedScored[]>(() => questions.map(() => null));
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Record<number, boolean>>({});
  const sessionIdRef = useRef<string | null>(null);

  const scoreOne = useCallback(
    async (i: number): Promise<SavedScored> => {
      const q = questions[i];
      const body: Record<string, unknown> = {
        roleTitle: role.title,
        question: q.text,
        answer: answers[i] ?? "",
        language,
        kind: q.kind,
      };
      if (q.kind === "mcq") {
        body.options = q.options;
        body.correctIndex = q.correctIndex;
      }
      const { data, error } = await supabase.functions.invoke("score-answer", { body });
      if (error || !data || typeof data.score !== "number") {
        console.error("Scoring failed for Q" + (i + 1), error, data);
        return null;
      }
      return data as SavedScored;
    },
    [role.title, questions, answers, language],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.all(questions.map((_, i) => scoreOne(i)));
      if (cancelled) return;
      setScored(results);
      setLoading(false);

      const valid = results.filter((s): s is NonNullable<SavedScored> => !!s);
      const overall = valid.length
        ? Math.round(valid.reduce((s, x) => s + x.score, 0) / valid.length)
        : 0;
      const session = saveSession({
        roleId: role.id,
        roleTitle: role.title,
        language,
        difficulty,
        questions: questions.map((q) => q.text),
        answers,
        scored: results,
        overall,
      });
      sessionIdRef.current = session.id;

      if (results.some((r) => r === null)) {
        toast.error("Some answers couldn't be scored. Use Retry on those cards.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async (i: number) => {
    setRetrying((r) => ({ ...r, [i]: true }));
    const result = await scoreOne(i);
    setRetrying((r) => ({ ...r, [i]: false }));
    if (!result) {
      toast.error(`Couldn't score Q${i + 1}. Try again in a moment.`);
      return;
    }
    setScored((prev) => {
      const next = [...prev];
      next[i] = result;
      if (sessionIdRef.current) {
        const valid = next.filter((s): s is NonNullable<SavedScored> => !!s);
        const overall = valid.length
          ? Math.round(valid.reduce((s, x) => s + x.score, 0) / valid.length)
          : 0;
        updateSession(sessionIdRef.current, { scored: next, overall });
      }
      return next;
    });
    toast.success(`Q${i + 1} scored.`);
  };

  const valid = scored.filter((s): s is NonNullable<SavedScored> => !!s);
  const overall = valid.length
    ? Math.round(valid.reduce((s, x) => s + x.score, 0) / valid.length)
    : 0;
  const overallStars = Math.round((overall / 100) * 5);
  const best = valid.length ? Math.max(...valid.map((s) => s.score)) : 0;
  const weakest = valid.length ? Math.min(...valid.map((s) => s.score)) : 0;

  // Aggregate skill scores
  const skillAvg: SkillScores = {
    clarity: 0,
    depth: 0,
    structure: 0,
    confidence: 0,
  };
  const skillCount = valid.filter((s) => s.skills).length;
  if (skillCount > 0) {
    valid.forEach((s) => {
      if (s.skills) {
        skillAvg.clarity += s.skills.clarity;
        skillAvg.depth += s.skills.depth;
        skillAvg.structure += s.skills.structure;
        skillAvg.confidence += s.skills.confidence;
      }
    });
    skillAvg.clarity = Math.round(skillAvg.clarity / skillCount);
    skillAvg.depth = Math.round(skillAvg.depth / skillCount);
    skillAvg.structure = Math.round(skillAvg.structure / skillCount);
    skillAvg.confidence = Math.round(skillAvg.confidence / skillCount);
  }

  // Personalized tips: collect unique tips from low-scoring answers, then top up
  const personalizedTips = (() => {
    const lowFirst = [...valid].sort((a, b) => a.score - b.score);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of lowFirst) {
      if (v.tip && !seen.has(v.tip)) {
        seen.add(v.tip);
        out.push(v.tip);
      }
      if (out.length >= 4) break;
    }
    return out;
  })();

  // ====== Weak Topic Detection Engine ======
  // Aggregate scores by topic. Prefer scored.topic, fall back to question.topic, else "General".
  type TopicAgg = { topic: string; total: number; count: number; avg: number; qIndices: number[] };
  const topicMap = new Map<string, TopicAgg>();
  scored.forEach((s, i) => {
    const q = questions[i];
    const topic =
      (s?.topic && s.topic.trim()) ||
      ((q && "topic" in q && q.topic) ? (q as { topic?: string }).topic! : "General");
    const score = s?.score ?? 0;
    const key = topic.trim();
    const cur = topicMap.get(key) ?? { topic: key, total: 0, count: 0, avg: 0, qIndices: [] };
    cur.total += score;
    cur.count += 1;
    cur.qIndices.push(i);
    topicMap.set(key, cur);
  });
  const topics: TopicAgg[] = Array.from(topicMap.values()).map((t) => ({
    ...t,
    avg: t.count ? Math.round(t.total / t.count) : 0,
  }));
  const sortedTopicsByScore = [...topics].sort((a, b) => a.avg - b.avg);
  const weakTopics = sortedTopicsByScore.filter((t) => t.avg < 70).slice(0, 5);
  const strongTopics = [...topics].sort((a, b) => b.avg - a.avg).slice(0, 3);

  const heatColor = (v: number) => {
    // 0 -> destructive, 50 -> muted, 100 -> accent
    if (v >= 80) return "bg-accent text-accent-foreground";
    if (v >= 65) return "bg-accent/60 text-accent-foreground";
    if (v >= 50) return "bg-accent/30 text-foreground";
    if (v >= 30) return "bg-destructive/40 text-foreground";
    return "bg-destructive/70 text-destructive-foreground";
  };

  // Interview readiness: weighted blend of overall score, skill consistency, completion.
  const completionRate =
    questions.length > 0
      ? Math.round(
          (answers.filter((a) => a && a.toString().trim().length > 0).length /
            questions.length) *
            100,
        )
      : 0;
  const skillBlend =
    skillCount > 0
      ? Math.round(
          (skillAvg.clarity + skillAvg.depth + skillAvg.structure + skillAvg.confidence) / 4,
        )
      : overall;
  const readiness = Math.max(
    0,
    Math.min(100, Math.round(overall * 0.55 + skillBlend * 0.3 + completionRate * 0.15)),
  );
  const readinessBand =
    readiness >= 80
      ? { label: "Interview-ready", tone: "text-accent" }
      : readiness >= 60
      ? { label: "Almost there", tone: "text-foreground" }
      : { label: "Needs more practice", tone: "text-muted-foreground" };

  const verdict =
    overall >= 80
      ? { label: "Interview-ready" }
      : overall >= 60
      ? { label: "Almost there" }
      : { label: "Keep practicing" };

  const exportSession = (format: "md" | "json") => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const base = `poise-${role.id}-${stamp}`;
    if (format === "md") {
      const md = exportSessionMarkdown(
        {
          id: sessionIdRef.current ?? "current",
          createdAt: Date.now(),
          roleId: role.id,
          roleTitle: role.title,
          language,
          difficulty,
          questions: questions.map((q) => q.text),
          answers,
          scored,
          overall,
        },
        role,
      );
      downloadFile(`${base}.md`, md, "text/markdown");
    } else {
      const json = JSON.stringify(
        {
          role: { id: role.id, title: role.title },
          language,
          difficulty,
          overall,
          questions,
          answers,
          scored,
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      );
      downloadFile(`${base}.json`, json, "application/json");
    }
    toast.success(`Exported as ${format.toUpperCase()}.`);
  };

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
            Your results · {role.title} · {difficulty}
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

          <div className="mt-4 flex justify-center" aria-label={`${overallStars} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${
                  i <= overallStars ? "fill-accent text-accent" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={onRestart}>
              <RotateCcw /> Retry interview
            </Button>
            <Button variant="outline" size="lg" onClick={() => exportSession("md")}>
              <FileText /> Export Markdown
            </Button>
            <Button variant="outline" size="lg" onClick={() => exportSession("json")}>
              <Download /> Export JSON
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

        {/* Interview Readiness Score */}
        <section className="mt-12 overflow-hidden rounded-3xl border border-accent/20 bg-gradient-warm p-6 shadow-coral md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                  <circle cx="60" cy="60" r="50" stroke="hsl(var(--background) / 0.3)" strokeWidth="10" fill="none" />
                  <circle
                    cx="60" cy="60" r="50"
                    stroke="hsl(var(--background))"
                    strokeWidth="10" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(readiness / 100) * 314.16} 314.16`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center text-background">
                  <div className="font-display text-2xl font-semibold tabular-nums leading-none">{readiness}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider opacity-80">/ 100</div>
                </div>
              </div>
            </div>
            <div className="text-background">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-80">
                <Target className="h-3.5 w-3.5" />
                Interview readiness
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">
                {readinessBand.label}
              </h2>
              <p className="mt-1 text-sm opacity-90">
                Composite of answer quality ({overall}), skill depth ({skillBlend}), and completion ({completionRate}%).
              </p>
            </div>
          </div>
        </section>

        {/* Skill breakdown */}
        {skillCount > 0 && (
          <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              <h2 className="font-display text-xl font-semibold">Skill breakdown</h2>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <SkillBar label="Clarity" value={skillAvg.clarity} />
              <SkillBar label="Depth" value={skillAvg.depth} />
              <SkillBar label="Structure" value={skillAvg.structure} />
              <SkillBar label="Confidence" value={skillAvg.confidence} />
            </div>
          </section>
        )}

        {/* Personalized tips */}
        {personalizedTips.length > 0 && (
          <section className="mt-12 rounded-3xl border border-accent/20 bg-accent/5 p-6 shadow-soft md:p-8">
            <div className="flex items-center gap-2 text-accent">
              <Lightbulb className="h-5 w-5" />
              <h2 className="font-display text-xl font-semibold">Personalized tips</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick wins from the answers that need the most polish.
            </p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {personalizedTips.map((tip, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-card p-4">
                  <span className="font-display text-2xl font-semibold leading-none text-accent/50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

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
              const isRetrying = retrying[i];
              const isMCQ = q.kind === "mcq";
              const selectedIdx = isMCQ && answer !== "" ? Number(answer) : -1;
              const correct = isMCQ && selectedIdx === q.correctIndex;

              return (
                <article
                  key={i}
                  className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Question {i + 1}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isMCQ ? "MCQ" : "Open"}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
                        {q.text}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl font-semibold tabular-nums">
                        {s?.score ?? "—"}
                        <span className="text-base text-muted-foreground">/100</span>
                      </div>
                      {s && (
                        <div className="mt-1 flex justify-end">
                          <StarRating score={s.score} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-warm transition-all duration-700"
                      style={{ width: `${s?.score ?? 0}%` }}
                    />
                  </div>

                  {isMCQ ? (
                    <ul className="mt-5 space-y-2">
                      {q.options.map((opt, oi) => {
                        const isCorrect = oi === q.correctIndex;
                        const isPicked = oi === selectedIdx;
                        return (
                          <li
                            key={oi}
                            className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                              isCorrect
                                ? "border-accent/40 bg-accent/5"
                                : isPicked
                                ? "border-destructive/40 bg-destructive/5"
                                : "border-border"
                            }`}
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <Check className="h-4 w-4 text-accent" />}
                            {isPicked && !isCorrect && (
                              <XIcon className="h-4 w-4 text-destructive" />
                            )}
                          </li>
                        );
                      })}
                      {selectedIdx === -1 && (
                        <p className="mt-1 text-xs text-muted-foreground">No option selected.</p>
                      )}
                    </ul>
                  ) : (
                    answer && (
                      <blockquote className="mt-5 border-l-2 border-accent pl-4 text-sm italic text-muted-foreground">
                        "{answer.length > 280 ? answer.slice(0, 280) + "…" : answer}"
                      </blockquote>
                    )
                  )}

                  {s ? (
                    <>
                      <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-accent">Coach feedback</div>
                        <p className="mt-1 text-foreground">{s.feedback}</p>
                      </div>

                      {s.skills && (
                        <div className="mt-3 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
                          <SkillBar label="Clarity" value={s.skills.clarity} />
                          <SkillBar label="Depth" value={s.skills.depth} />
                          <SkillBar label="Structure" value={s.skills.structure} />
                          <SkillBar label="Confidence" value={s.skills.confidence} />
                        </div>
                      )}

                      {s.tip && (
                        <div className="mt-3 flex gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
                          <Lightbulb className="h-5 w-5 shrink-0 text-accent" />
                          <p className="text-sm text-foreground">
                            <span className="font-semibold">Tip · </span>
                            {s.tip}
                          </p>
                        </div>
                      )}

                      {s.improved && !isMCQ && (
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
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4">
                      <div className="text-sm text-muted-foreground">
                        Couldn't score this answer.
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(i)}
                        disabled={isRetrying}
                      >
                        {isRetrying ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrying…
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" /> Retry scoring
                          </>
                        )}
                      </Button>
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
