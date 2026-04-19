import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/lib/interviewData";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type Props = {
  onBack: () => void;
  onStart: (role: Role) => void;
};

export const Setup = ({ onBack, onStart }: Props) => {
  const [selectedId, setSelectedId] = useState<string>(ROLES[0].id);
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
            Step 1 of 1
          </span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
            Pick your <span className="text-accent italic">role.</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose what you're interviewing for. We'll tailor the questions.
          </p>
        </div>

        <section className="mt-12">
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
                        {r.questions.length} questions
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
            <span className="font-medium text-foreground">{role.title}</span> · 90s per question
          </div>
          <Button variant="hero" size="lg" onClick={() => onStart(role)}>
            Begin Interview
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  );
};
