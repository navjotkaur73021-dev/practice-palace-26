import { useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/lib/interviewData";
import { ArrowLeft, ArrowRight, Upload, Check, FileText } from "lucide-react";

type Props = {
  onBack: () => void;
  onStart: (role: Role, resumeName: string | null) => void;
};

export const Setup = ({ onBack, onStart }: Props) => {
  const [selectedId, setSelectedId] = useState<string>(ROLES[0].id);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
            Let's tailor your <span className="text-accent italic">session.</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Pick a role and (optionally) drop in your resume.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Choose your role</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  <div className="flex items-start justify-between">
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

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">
            Upload your resume <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </h2>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-left transition-all hover:border-accent hover:bg-secondary/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-foreground">
              {resumeName ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {resumeName ?? "Drop or click to upload"}
              </div>
              <div className="text-sm text-muted-foreground">
                {resumeName ? "Tap to replace" : "PDF, DOCX, or TXT — we'll personalize questions"}
              </div>
            </div>
          </button>
        </section>

        <div className="mt-12 flex items-center justify-between border-t border-border pt-8">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{role.title}</span> · {role.questions.length} questions
          </div>
          <Button variant="hero" size="lg" onClick={() => onStart(role, resumeName)}>
            Begin Interview
            <ArrowRight />
          </Button>
        </div>
      </main>
    </div>
  );
};
