import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Flame,
  Sparkles,
  BarChart3,
  Activity,
  Trophy,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { loadSessions, type SavedSession } from "@/lib/sessionStorage";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

type Props = {
  onBack: () => void;
  onAdaptive: (weakTopics: string[]) => void;
};

type TopicAgg = { topic: string; avg: number; count: number; min: number };

const heatColor = (avg: number) => {
  if (avg >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (avg >= 65) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (avg >= 45) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
};

// Simple NLP-flavoured signal extracted from feedback text
const STRENGTH_WORDS = ["clear", "strong", "structured", "confident", "concise", "specific", "good", "well", "excellent"];
const WEAKNESS_WORDS = ["unclear", "vague", "rambling", "missing", "weak", "improve", "lack", "shallow", "generic", "filler"];

function nlpSignals(sessions: SavedSession[]) {
  let strengths = 0;
  let weaknesses = 0;
  const wordFreq = new Map<string, number>();
  for (const s of sessions) {
    for (const sc of s.scored) {
      if (!sc?.feedback) continue;
      const t = sc.feedback.toLowerCase();
      for (const w of STRENGTH_WORDS) if (t.includes(w)) strengths++;
      for (const w of WEAKNESS_WORDS) if (t.includes(w)) weaknesses++;
      for (const tok of t.split(/[^a-z]+/)) {
        if (tok.length < 5) continue;
        wordFreq.set(tok, (wordFreq.get(tok) ?? 0) + 1);
      }
    }
  }
  const topWords = [...wordFreq.entries()]
    .filter(([w]) => !["which", "their", "would", "could", "should", "answer", "question", "candidate"].includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, c]) => ({ word: w, count: c }));
  return { strengths, weaknesses, topWords };
}

export const Dashboard = ({ onBack, onAdaptive }: Props) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;
    const total = sessions.length;
    const avgOverall = Math.round(sessions.reduce((a, s) => a + (s.overall ?? 0), 0) / total);
    const allScores = sessions.flatMap((s) => s.scored.filter(Boolean).map((sc) => sc!.score));
    const totalQuestions = allScores.length;
    const best = Math.max(...sessions.map((s) => s.overall ?? 0));
    const recent = sessions.slice(0, 5);
    const older = sessions.slice(5, 10);
    const recentAvg = recent.length ? recent.reduce((a, s) => a + s.overall, 0) / recent.length : 0;
    const olderAvg = older.length ? older.reduce((a, s) => a + s.overall, 0) / older.length : recentAvg;
    const trend = Math.round(recentAvg - olderAvg);

    // skills aggregate
    const skills = { clarity: 0, depth: 0, structure: 0, confidence: 0 };
    let skillN = 0;
    for (const s of sessions) {
      for (const sc of s.scored) {
        if (sc?.skills) {
          skills.clarity += sc.skills.clarity;
          skills.depth += sc.skills.depth;
          skills.structure += sc.skills.structure;
          skills.confidence += sc.skills.confidence;
          skillN++;
        }
      }
    }
    const avgSkills = skillN
      ? {
          clarity: Math.round(skills.clarity / skillN),
          depth: Math.round(skills.depth / skillN),
          structure: Math.round(skills.structure / skillN),
          confidence: Math.round(skills.confidence / skillN),
        }
      : { clarity: 0, depth: 0, structure: 0, confidence: 0 };

    // topic aggregation
    const topicMap = new Map<string, { sum: number; n: number; min: number }>();
    for (const s of sessions) {
      for (const sc of s.scored) {
        if (!sc?.topic) continue;
        const cur = topicMap.get(sc.topic) ?? { sum: 0, n: 0, min: 100 };
        cur.sum += sc.score;
        cur.n += 1;
        cur.min = Math.min(cur.min, sc.score);
        topicMap.set(sc.topic, cur);
      }
    }
    const topics: TopicAgg[] = [...topicMap.entries()]
      .map(([topic, v]) => ({ topic, avg: Math.round(v.sum / v.n), count: v.n, min: v.min }))
      .sort((a, b) => a.avg - b.avg);

    const weak = topics.filter((t) => t.avg < 65).slice(0, 6);
    const strong = [...topics].sort((a, b) => b.avg - a.avg).slice(0, 5);

    // readiness score (composite)
    const skillBlend =
      (avgSkills.clarity + avgSkills.depth + avgSkills.structure + avgSkills.confidence) / 4;
    const completion = Math.min(1, totalQuestions / 30); // saturates at 30 answered
    const readiness = Math.round(avgOverall * 0.55 + skillBlend * 0.3 + completion * 100 * 0.15);

    // timeline (oldest -> newest)
    const timeline = [...sessions]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((s, i) => ({
        idx: i + 1,
        date: new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: s.overall,
        role: s.roleTitle,
      }));

    return {
      total,
      totalQuestions,
      avgOverall,
      best,
      trend,
      avgSkills,
      topics,
      weak,
      strong,
      readiness,
      timeline,
    };
  }, [sessions]);

  const nlp = useMemo(() => nlpSignals(sessions), [sessions]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-cream">
        <header className="container flex items-center justify-between py-6">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="container pb-24">
          <Button variant="ghost" onClick={onBack} className="mb-6 -ml-3">
            <ArrowLeft /> Back
          </Button>
          <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 font-display text-3xl font-semibold">No data yet</h1>
            <p className="mt-2 text-muted-foreground">
              Complete an interview to unlock your performance dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const radarData = [
    { skill: "Clarity", value: stats.avgSkills.clarity },
    { skill: "Depth", value: stats.avgSkills.depth },
    { skill: "Structure", value: stats.avgSkills.structure },
    { skill: "Confidence", value: stats.avgSkills.confidence },
  ];

  const topicChartData = stats.topics.slice(0, 10).map((t) => ({
    topic: t.topic.length > 14 ? t.topic.slice(0, 13) + "…" : t.topic,
    avg: t.avg,
  }));

  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="container pb-24">
        <Button variant="ghost" onClick={onBack} className="mb-6 -ml-3">
          <ArrowLeft /> Back
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
              <Activity className="h-3.5 w-3.5" /> Performance Dashboard
            </span>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Your interview analytics
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Trends, weak-area detection, and AI-driven recommendations from {stats.total}{" "}
              {stats.total === 1 ? "session" : "sessions"} · {stats.totalQuestions} answers analyzed.
            </p>
          </div>
          {stats.weak.length > 0 && (
            <Button
              variant="hero"
              onClick={() => onAdaptive(stats.weak.map((w) => w.topic))}
              className="shrink-0"
            >
              <Brain /> Adaptive Interview
            </Button>
          )}
        </div>

        {/* KPI cards */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI
            icon={Trophy}
            label="Readiness Score"
            value={`${stats.readiness}`}
            suffix="/100"
            tone="accent"
          />
          <KPI
            icon={BarChart3}
            label="Avg Overall"
            value={`${stats.avgOverall}`}
            suffix="/100"
          />
          <KPI
            icon={stats.trend >= 0 ? TrendingUp : TrendingDown}
            label="Recent trend"
            value={`${stats.trend > 0 ? "+" : ""}${stats.trend}`}
            suffix=" pts"
            tone={stats.trend >= 0 ? "good" : "bad"}
          />
          <KPI icon={Flame} label="Personal best" value={`${stats.best}`} suffix="/100" />
        </section>

        {/* Trend + Radar */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Score over time" icon={TrendingUp}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.timeline} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--accent))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Skill profile" icon={Target}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Topic bar + Heatmap */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Performance by topic" icon={BarChart3}>
            {topicChartData.length === 0 ? (
              <Empty text="No topic data yet." />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData} margin={{ top: 10, right: 16, left: -10, bottom: 30 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="topic"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="avg" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Topic heatmap" icon={Flame}>
            {stats.topics.length === 0 ? (
              <Empty text="Start scoring answers to populate the heatmap." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topics.map((t) => (
                  <span
                    key={t.topic}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${heatColor(t.avg)}`}
                    title={`${t.count} questions · low ${t.min}`}
                  >
                    {t.topic} · {t.avg}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Weak / Strong + NLP */}
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card title="Weak areas" icon={AlertTriangle} accent="bad">
            {stats.weak.length === 0 ? (
              <Empty text="No weak topics detected — great work." />
            ) : (
              <ul className="space-y-3">
                {stats.weak.map((w) => (
                  <li key={w.topic} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{w.topic}</div>
                      <div className="text-xs text-muted-foreground">{w.count} attempts · low {w.min}</div>
                    </div>
                    <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 tabular-nums">
                      {w.avg}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Strong areas" icon={Trophy} accent="good">
            {stats.strong.length === 0 ? (
              <Empty text="Keep practicing to identify strengths." />
            ) : (
              <ul className="space-y-3">
                {stats.strong.map((s) => (
                  <li key={s.topic} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.topic}</div>
                      <div className="text-xs text-muted-foreground">{s.count} attempts</div>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {s.avg}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="NLP feedback signals" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Strength cues" value={nlp.strengths} tone="good" />
              <Stat label="Weakness cues" value={nlp.weaknesses} tone="bad" />
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Frequent feedback themes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nlp.topWords.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Not enough data.</span>
                ) : (
                  nlp.topWords.map((w) => (
                    <span
                      key={w.word}
                      className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-xs"
                      style={{ fontSize: `${10 + Math.min(6, w.count)}px` }}
                    >
                      {w.word}
                    </span>
                  ))
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Adaptive callout */}
        {stats.weak.length > 0 && (
          <section className="mt-8 rounded-3xl border border-accent/30 bg-gradient-warm/10 p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-accent/15 p-3 text-accent">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold">Adaptive Interview System</h3>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    We'll generate a focused round on{" "}
                    <span className="font-medium text-foreground">
                      {stats.weak.slice(0, 3).map((w) => w.topic).join(", ")}
                    </span>
                    {stats.weak.length > 3 ? ` and ${stats.weak.length - 3} more` : ""} — calibrated to your weakest areas.
                  </p>
                </div>
              </div>
              <Button variant="hero" onClick={() => onAdaptive(stats.weak.map((w) => w.topic))}>
                <Brain /> Start adaptive round
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const Card = ({
  title,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  accent?: "good" | "bad";
}) => (
  <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
    <div className="mb-4 flex items-center gap-2">
      <Icon
        className={`h-4 w-4 ${
          accent === "good" ? "text-emerald-500" : accent === "bad" ? "text-rose-500" : "text-accent"
        }`}
      />
      <h2 className="font-display text-lg font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

const KPI = ({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
  tone?: "accent" | "good" | "bad";
}) => (
  <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <Icon
        className={`h-4 w-4 ${
          tone === "good" ? "text-emerald-500" : tone === "bad" ? "text-rose-500" : "text-accent"
        }`}
      />
    </div>
    <div className="mt-3 font-display text-3xl font-semibold tabular-nums">
      {value}
      {suffix && <span className="text-base font-normal text-muted-foreground">{suffix}</span>}
    </div>
  </div>
);

const Stat = ({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" }) => (
  <div
    className={`rounded-xl border p-3 ${
      tone === "good"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : "border-rose-500/30 bg-rose-500/10"
    }`}
  >
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
    {text}
  </div>
);
