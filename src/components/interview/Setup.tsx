import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  ROLES,
  LANGUAGES,
  DIFFICULTIES,
  PERSONALITIES,
  type Role,
  type Language,
  type Difficulty,
  type QuestionFormat,
  type Personality,
} from "@/lib/interviewData";
import { loadSetupSettings, saveSetupSettings } from "@/lib/settingsStorage";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Languages,
  Hash,
  Gauge,
  ListChecks,
  SkipForward,
  Drama,
} from "lucide-react";

type Props = {
  onBack: () => void;
  onStart: (
    role: Role,
    language: Language,
    count: number,
    difficulty: Difficulty,
    format: QuestionFormat,
    autoSkip: boolean,
    personality: Personality,
  ) => void;
};

const COUNTS = [3, 5, 7, 10, 15];
const FORMATS: { id: QuestionFormat; label: string; hint: string }[] = [
  { id: "open", label: "Open-ended", hint: "Speak or type" },
  { id: "mcq", label: "MCQ only", hint: "Multiple choice" },
  { id: "mixed", label: "Mixed", hint: "Best of both" },
];

export const Setup = ({ onBack, onStart }: Props) => {
  const saved = loadSetupSettings();
  const initialId =
    saved.roleId && ROLES.some((r) => r.id === saved.roleId) ? saved.roleId : ROLES[0].id;
  const initialLang: Language =
    saved.language === "hi" || saved.language === "en" || saved.language === "pa"
      ? saved.language
      : "en";
  const initialCount = saved.count && COUNTS.includes(saved.count) ? saved.count : 5;
  const initialDifficulty: Difficulty =
    saved.difficulty === "easy" || saved.difficulty === "hard" ? saved.difficulty : "medium";
  const initialFormat: QuestionFormat =
    saved.format === "open" || saved.format === "mcq" ? saved.format : "mixed";
  const initialAutoSkip = saved.autoSkip ?? true;
  const initialPersonality: Personality =
    saved.personality === "friendly" || saved.personality === "strict"
      ? saved.personality
      : "neutral";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [language, setLanguage] = useState<Language>(initialLang);
  const [count, setCount] = useState<number>(initialCount);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [format, setFormat] = useState<QuestionFormat>(initialFormat);
  const [autoSkip, setAutoSkip] = useState<boolean>(initialAutoSkip);
  const [personality, setPersonality] = useState<Personality>(initialPersonality);
  const role = ROLES.find((r) => r.id === selectedId)!;

  useEffect(() => {
    saveSetupSettings({ roleId: selectedId, language, count, difficulty, format, autoSkip, personality });
  }, [selectedId, language, count, difficulty, format, autoSkip, personality]);

  const Pill = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-foreground text-background shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft /> Back
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl pb-20 pt-4">
        <div className="animate-fade-up">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Set up your session
          </span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
            Pick your <span className="text-accent italic">role.</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose your field, language, and difficulty. Your AI coach tailors everything.
          </p>
        </div>

        {/* Language */}
        <section className="mt-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            Interview language
          </div>
          <div className="mt-3 inline-flex flex-wrap rounded-full border border-border bg-card p-1 shadow-soft">
            {LANGUAGES.map((l) => (
              <Pill key={l.id} active={l.id === language} onClick={() => setLanguage(l.id)}>
                {l.native}
                <span className="ml-2 text-xs opacity-60">({l.label})</span>
              </Pill>
            ))}
          </div>
        </section>

        {/* Difficulty */}
        <section className="mt-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            Difficulty level
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {DIFFICULTIES.map((d) => {
              const active = d.id === difficulty;
              return (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-accent bg-card shadow-coral"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className="font-display text-base font-semibold">{d.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{d.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Personality */}
        <section className="mt-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Drama className="h-3.5 w-3.5" />
            Interviewer personality
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {PERSONALITIES.map((p) => {
              const active = p.id === personality;
              return (
                <button
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-accent bg-card shadow-coral"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className="font-display text-base font-semibold">
                    <span className="mr-1.5">{p.emoji}</span>
                    {p.label}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Format */}
        <section className="mt-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Question format
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {FORMATS.map((f) => {
              const active = f.id === format;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-accent bg-card shadow-coral"
                      : "border-border bg-card hover:border-foreground/20"
                  }`}
                >
                  <div className="font-display text-base font-semibold">{f.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{f.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Question count */}
        <section className="mt-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            How many questions
          </div>
          <div className="mt-3 inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
            {COUNTS.map((c) => (
              <Pill key={c} active={c === count} onClick={() => setCount(c)}>
                <span className="tabular-nums">{c}</span>
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Approx. {Math.round((count * 90) / 60)} min of practice + scoring time.
          </p>
        </section>

        {/* Auto-skip */}
        <section className="mt-8">
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <SkipForward className="h-5 w-5 text-accent" />
              <div>
                <div className="font-display text-base font-semibold">Auto-skip when timer ends</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Move to the next question automatically.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoSkip((v) => !v)}
              role="switch"
              aria-checked={autoSkip}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                autoSkip ? "bg-accent" : "bg-secondary"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-soft transition-transform ${
                  autoSkip ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </section>

        <section className="mt-10">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pick your role / field
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => {
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`group relative rounded-2xl border p-5 text-left transition-all ${
                    active
                      ? "border-accent bg-card shadow-coral"
                      : "border-border bg-card hover:border-foreground/20 hover:shadow-soft"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg font-semibold">{r.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{r.blurb}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "border border-border"
                      }`}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="sticky bottom-4 mt-12 rounded-3xl border border-border bg-card/90 p-4 shadow-lifted backdrop-blur-md md:flex md:items-center md:justify-between md:gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{role.title}</span> ·{" "}
            {LANGUAGES.find((l) => l.id === language)?.native} · {difficulty} · {format} · {count} Qs
          </div>
          <Button
            variant="hero"
            size="lg"
            className="mt-3 w-full md:mt-0 md:w-auto"
            onClick={() => onStart(role, language, count, difficulty, format, autoSkip)}
          >
            Begin Interview
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  );
};
