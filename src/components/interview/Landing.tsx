import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Mic, Languages, BarChart3, Lightbulb, PlayCircle, Trash2 } from "lucide-react";
import heroImg from "@/assets/hero-shapes.jpg";
import logoMark from "@/assets/omni-prep-logo.png";
import { loadInProgressQuiz, clearInProgressQuiz, type InProgressQuiz } from "@/lib/settingsStorage";
import { ROLES, type Role, type Language, type Difficulty, type QuestionFormat } from "@/lib/interviewData";
import { toast } from "sonner";

type Props = {
  onStart: () => void;
  onHistory: () => void;
  onDashboard?: () => void;
  onResume?: (
    role: Role,
    language: Language,
    count: number,
    difficulty: Difficulty,
    format: QuestionFormat,
  ) => void;
};

const TIPS = [
  {
    title: "Use the STAR framework",
    body: "Situation, Task, Action, Result. It keeps long answers focused and memorable.",
  },
  {
    title: "Quantify your impact",
    body: "Numbers stick. \"Cut load time 40%\" beats \"made it faster\" every time.",
  },
  {
    title: "Pause before you answer",
    body: "Two seconds of silence reads as confidence. Rambling reads as nerves.",
  },
  {
    title: "Practice out loud",
    body: "Reading answers in your head is a trap. Speaking trains the actual muscle.",
  },
];

export const Landing = ({ onStart, onHistory, onResume }: Props) => {
  const [resumable, setResumable] = useState<InProgressQuiz | null>(null);

  useEffect(() => {
    setResumable(loadInProgressQuiz());
  }, []);

  const handleResume = () => {
    if (!resumable || !onResume) return;
    const r = ROLES.find((x) => x.id === resumable.roleId) ?? {
      id: resumable.roleId,
      title: resumable.roleTitle,
      blurb: resumable.roleBlurb,
    };
    onResume(r as Role, resumable.language, resumable.count, resumable.difficulty, resumable.format);
  };

  const handleDiscardResume = () => {
    clearInProgressQuiz();
    setResumable(null);
    toast.success("Saved session cleared.");
  };
  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <a
            href="#tips"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Tips
          </a>
          <a
            href="#how"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            How it works
          </a>
          <button
            onClick={onHistory}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            History
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container relative pb-24 pt-8 md:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center justify-center rounded-3xl bg-card p-4 shadow-lifted">
              <img
                src={logoMark}
                alt="Poise app logo mark"
                width={72}
                height={72}
                className="h-16 w-16 object-contain md:h-20 md:w-20"
              />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI Interview Practice
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-7xl">
              Walk in <em className="not-italic text-accent">calm.</em>
              <br />
              Walk out <span className="italic">hired.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance">
              AI-generated mock interviews tailored to your role — in English,
              Hindi, or Punjabi. Mix open answers with MCQs, pick a difficulty,
              and get instant coach feedback with skill scores and personalized tips.
            </p>

            {resumable && onResume && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 shrink-0 text-accent" />
                  <div className="text-sm">
                    <div className="font-semibold">Resume your {resumable.roleTitle} session</div>
                    <div className="text-xs text-muted-foreground">
                      Q{resumable.index + 1} of {resumable.count} · {resumable.difficulty} · {resumable.format}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDiscardResume}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Discard saved session"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Discard
                  </button>
                  <Button variant="hero" size="sm" onClick={handleResume}>
                    Resume <ArrowRight />
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button variant="hero" size="xl" onClick={onStart}>
                {resumable ? "Start new interview" : "Start Interview"}
                <ArrowRight />
              </Button>
              <span className="text-sm text-muted-foreground">
                No sign-up · ~10 minutes
              </span>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 border-t border-border pt-8">
              {[
                ["12k+", "interviews practiced"],
                ["4 roles", "tailored question banks"],
                ["98%", "feel more prepared"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-semibold md:text-3xl">{n}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative overflow-hidden rounded-[2rem] shadow-lifted">
              <img
                src={heroImg}
                alt="Abstract editorial illustration representing calm interview preparation"
                className="aspect-square w-full object-cover"
                loading="eager"
                width={1280}
                height={1280}
              />
            </div>
            <div className="absolute -bottom-6 -left-6 max-w-[260px] rounded-2xl bg-card p-5 shadow-lifted">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Live feedback
              </div>
              <p className="mt-2 font-display text-lg leading-snug">
                "Strong STAR structure — try quantifying the result."
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="mt-32">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { Icon: Languages, title: "Pick role & language", body: "Choose your target role and practice in English or Hindi." },
              { Icon: Mic, title: "Speak or type", body: "Answer questions aloud or in writing — your call." },
              { Icon: BarChart3, title: "AI scores you", body: "Get a score, written feedback, and a stronger sample answer." },
            ].map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className="group rounded-3xl border border-border bg-card p-8 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lifted"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground transition-colors group-hover:bg-gradient-warm group-hover:text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">
                  <span className="text-accent">0{i + 1}</span> &nbsp;{title}
                </h3>
                <p className="mt-2 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tips" className="mt-32">
          <div className="flex items-end justify-between gap-8">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
                <Lightbulb className="h-3.5 w-3.5" />
                Coach tips
              </span>
              <h2 className="mt-2 font-display text-3xl font-semibold md:text-4xl text-balance">
                Four things that move the needle.
              </h2>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {TIPS.map((tip, i) => (
              <div
                key={tip.title}
                className="flex gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <span className="font-display text-3xl font-semibold leading-none text-accent/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{tip.title}</h3>
                  <p className="mt-1 text-muted-foreground">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="container border-t border-border py-8 text-center text-sm text-muted-foreground">
        Built to help you sound like the best version of yourself.
      </footer>
    </div>
  );
};
