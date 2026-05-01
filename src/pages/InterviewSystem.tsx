import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, RefreshCw, Trash2, Loader2, ArrowUpDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  id: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  date: number;
};

const QUESTIONS = [
  "Tell me about yourself and your career goals.",
  "Describe a challenging project and how you handled it.",
  "What is your greatest professional strength?",
  "Walk me through a time you resolved a conflict on a team.",
  "Why are you interested in this role?",
  "How do you prioritize tasks when everything feels urgent?",
  "Describe a failure and what you learned from it.",
  "Where do you see yourself in three years?",
];

const STORAGE_KEY = "interview-system.rows.v1";

const loadRows = (): Row[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRows = (rows: Row[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

const InterviewSystem = () => {
  const [question, setQuestion] = useState(QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    document.title = "AI Interview System — Practice & Score";
    setRows(loadRows());
  }, []);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => (sortAsc ? a.score - b.score : b.score - a.score));
  }, [rows, sortAsc]);

  const avg = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
  }, [rows]);

  const nextQuestion = () => {
    const others = QUESTIONS.filter((q) => q !== question);
    setQuestion(others[Math.floor(Math.random() * others.length)]);
    setAnswer("");
    setScore(null);
    setFeedback("");
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast.error("Please type an answer first.");
      return;
    }
    setLoading(true);
    setScore(null);
    setFeedback("");
    try {
      const { data, error } = await supabase.functions.invoke("score-answer", {
        body: { question, answer, language: "en", kind: "open" },
      });
      if (error) throw error;
      const sc = Number(data?.score ?? 0);
      const fb = String(data?.feedback ?? "");
      setScore(sc);
      setFeedback(fb);

      const row: Row = {
        id: crypto.randomUUID(),
        question,
        answer: answer.trim(),
        score: sc,
        feedback: fb,
        date: Date.now(),
      };
      const updated = [row, ...rows];
      setRows(updated);
      saveRows(updated);
      toast.success(`Scored ${sc}/100`);
    } catch (e) {
      console.error(e);
      toast.error("Could not score the answer. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const updated = rows.filter((r) => r.id !== id);
    setRows(updated);
    saveRows(updated);
  };

  const handleClearAll = () => {
    if (!rows.length) return;
    if (!confirm("Clear all interview records?")) return;
    setRows([]);
    saveRows([]);
  };

  const scoreColor = (s: number) =>
    s >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : s >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <span className="h-4 w-px bg-border" />
            <h1 className="font-display text-lg font-semibold">AI Interview System</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> records
            </span>
            <span>
              Avg <span className="font-semibold text-foreground tabular-nums">{avg}</span>/100
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Workbench */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Question + answer */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Question
            </div>
            <p className="font-display text-xl leading-snug">{question}</p>

            <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Your answer
            </label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type a structured answer (STAR works well)…"
              className="mt-2 min-h-[180px] resize-y"
              disabled={loading}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {answer.trim().split(/\s+/).filter(Boolean).length} words
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={nextQuestion} disabled={loading}>
                  <RefreshCw className="h-4 w-4" /> New question
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !answer.trim()} size="sm">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Scoring…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Score + feedback */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Evaluation
            </div>

            {score === null && !loading && (
              <div className="mt-8 flex h-48 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                Submit an answer to see your score and feedback.
              </div>
            )}

            {loading && (
              <div className="mt-8 flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Analyzing your answer…</span>
              </div>
            )}

            {score !== null && !loading && (
              <>
                <div className="mt-4 flex items-end gap-3">
                  <div className={`font-display text-6xl font-semibold tabular-nums ${scoreColor(score)}`}>
                    {score}
                  </div>
                  <div className="pb-2 text-sm text-muted-foreground">/ 100</div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-warm transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="mt-6">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Coach feedback
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{feedback}</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Records table */}
        <section className="mt-8 rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-base font-semibold">Interview records</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRows(loadRows())}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSortAsc((v) => !v)}>
                <ArrowUpDown className="h-4 w-4" /> Sort by score ({sortAsc ? "asc" : "desc"})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-rose-600 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Question</th>
                  <th className="px-6 py-3 font-medium">Answer</th>
                  <th className="px-6 py-3 font-medium text-right">Score</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No records yet — submit an answer to get started.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-3 text-xs tabular-nums text-muted-foreground">
                        {new Date(r.date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="max-w-[260px] truncate px-6 py-3" title={r.question}>
                        {r.question}
                      </td>
                      <td className="max-w-[320px] truncate px-6 py-3 text-muted-foreground" title={r.answer}>
                        {r.answer}
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold tabular-nums ${scoreColor(r.score)}`}>
                        {r.score}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(r.id)}
                          aria-label="Delete row"
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InterviewSystem;
