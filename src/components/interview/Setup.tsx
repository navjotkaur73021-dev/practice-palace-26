import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ROLES, LANGUAGES, type Role, type Language } from "@/lib/interviewData";
import { ArrowLeft, ArrowRight, Check, Languages, Hash } from "lucide-react";

type Props = {
  onBack: () => void;
  onStart: (role: Role, language: Language, count: number) => void;
};

const COUNTS = [3, 5, 7, 10];

export const Setup = ({ onBack, onStart }: Props) => {
  const [selectedId, setSelectedId] = useState<string>(ROLES[0].id);
  const [language, setLanguage] = useState<Language>("en");
  const [count, setCount] = useState<number>(5);
  const role = ROLES.find((r) => r.id === selectedId)!;

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
            Choose what you're interviewing for. Your AI coach will tailor the questions.
          </p>
        </div>

        {/* Language */}
        <section className="mt-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Languages className="h-3.5 w-3.5" />
            Interview language
          </div>
          <div className="mt-3 inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
            {LANGUAGES.map((l) => {
              const active = l.id === language;
              return (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-foreground text-background shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.native}
                  <span className="ml-2 text-xs opacity-60">({l.label})</span>
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
            {COUNTS.map((c) => {
              const active = c === count;
              return (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`rounded-full px-5 py-2 text-sm font-medium tabular-nums transition-all ${
                    active
                      ? "bg-foreground text-background shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Approx. {Math.round((count * 90) / 60)} min of practice + scoring time.
          </p>
        </section>

        <section className="mt-10">
          <div className="grid gap-3 sm:grid-cols-2">
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
                      <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                        AI-generated questions
                      </div>
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

        <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-8">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{role.title}</span> ·{" "}
            {LANGUAGES.find((l) => l.id === language)?.native} · {count} Qs · 90s each
          </div>
          <Button variant="hero" size="lg" onClick={() => onStart(role, language, count)}>
            Begin Interview
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  );
};
