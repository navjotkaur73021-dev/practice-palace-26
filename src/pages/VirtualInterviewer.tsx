import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";

/* ---------- Interview script ---------- */

type Stage = {
  id: string;
  label: string;
  prompt: string;
  /** generate a smart follow-up using the candidate's answer (offline heuristic) */
  followUp: (answer: string) => string | null;
};

const SCRIPT: Stage[] = [
  {
    id: "intro",
    label: "Introduction",
    prompt:
      "Welcome! Let's begin. Please introduce yourself — your background, education, and a little about who you are.",
    followUp: (a) => {
      const words = wordCount(a);
      if (words < 25)
        return "Thanks. Could you expand a little — share one experience or project that shaped who you are professionally?";
      if (/team|group|club|volunteer/i.test(a))
        return "Nice — you mentioned working with others. What role do you naturally take in a team?";
      return "Great. What is one thing about you that wouldn't show up on a resume?";
    },
  },
  {
    id: "why-field",
    label: "Why this field",
    prompt:
      "Why did you choose this field? What drew you toward this kind of work?",
    followUp: (a) => {
      if (/passion|love|always/i.test(a))
        return "When you say it's a passion — can you point to a specific moment that confirmed this was the right path?";
      if (wordCount(a) < 20)
        return "Could you give a concrete example — a project, a person, or an experience that influenced you?";
      return "How do you see this field evolving in the next few years, and where do you want to fit in?";
    },
  },
  {
    id: "strengths",
    label: "Strengths",
    prompt:
      "What are your top strengths? Pick two or three and explain how they show up in your work.",
    followUp: (a) => {
      if (!/example|project|when|once|time/i.test(a))
        return "Can you give a specific situation where one of those strengths made a real difference?";
      return "And on the flip side — what's one weakness you're actively working on?";
    },
  },
  {
    id: "goals",
    label: "Career goals",
    prompt:
      "Where do you see yourself in the next 3 to 5 years? What are your career goals?",
    followUp: (a) => {
      if (/manager|lead|head|director/i.test(a))
        return "You mentioned a leadership track — what skills do you think you still need to develop to get there?";
      if (wordCount(a) < 20)
        return "Try to be more specific — what role, what kind of company, and what impact do you want to have made?";
      return "How does this role you're interviewing for fit into that longer-term picture?";
    },
  },
  {
    id: "salary",
    label: "Salary expectations",
    prompt:
      "Let's talk numbers. What are your salary expectations for this role, and how did you arrive at that figure?",
    followUp: (a) => {
      if (!/\d/.test(a))
        return "Could you share a specific range? Even a rough figure helps us understand your expectations.";
      if (/negotiable|flexible|open/i.test(a))
        return "Flexibility is good — but what would be your ideal number if everything else aligned?";
      return "And beyond salary — what other parts of an offer matter most to you (growth, learning, flexibility, equity)?";
    },
  },
];

/* ---------- Heuristic helpers ---------- */

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

const FILLERS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "sort of", "kind of"];

function fillerCount(s: string) {
  const lower = " " + s.toLowerCase() + " ";
  return FILLERS.reduce((n, f) => n + (lower.match(new RegExp(`\\b${f}\\b`, "g"))?.length ?? 0), 0);
}

const CONFIDENCE_NEG = /\b(maybe|i guess|i think|sort of|kind of|not sure|probably|hopefully|try to)\b/gi;
const CONFIDENCE_POS = /\b(i will|i can|i have|i led|i built|i delivered|i achieved|confident|certain)\b/gi;
const STRONG_VERBS = /\b(led|built|launched|designed|delivered|owned|drove|created|improved|reduced|grew|managed)\b/gi;

type Turn = { stageId: string; question: string; answer: string; isFollowUp: boolean };

type Feedback = {
  communication: number;
  confidence: number;
  clarity: number;
  overall: number;
  notes: string[];
  suggestions: string[];
  dressing: string[];
  behavior: string[];
};

function analyze(turns: Turn[]): Feedback {
  const allText = turns.map((t) => t.answer).join(" ");
  const totalWords = wordCount(allText);
  const avgWords = totalWords / Math.max(turns.length, 1);
  const fillers = fillerCount(allText);
  const negHedges = (allText.match(CONFIDENCE_NEG) ?? []).length;
  const posClaims = (allText.match(CONFIDENCE_POS) ?? []).length;
  const strongVerbs = (allText.match(STRONG_VERBS) ?? []).length;
  const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentence = sentences.length ? totalWords / sentences.length : 0;

  // Communication: based on length per answer + variety
  let communication = 50;
  if (avgWords >= 35) communication += 25;
  else if (avgWords >= 20) communication += 15;
  else if (avgWords < 10) communication -= 15;
  if (avgSentence > 8 && avgSentence < 28) communication += 10;
  if (fillers > turns.length * 2) communication -= 10;
  communication = clamp(communication, 0, 100);

  // Confidence
  let confidence = 55 + posClaims * 4 + strongVerbs * 3 - negHedges * 4 - fillers * 2;
  confidence = clamp(confidence, 0, 100);

  // Clarity: penalise very long sentences and very short answers
  let clarity = 60;
  if (avgSentence > 30) clarity -= 15;
  if (avgSentence < 5) clarity -= 10;
  if (avgWords < 10) clarity -= 10;
  if (strongVerbs >= 3) clarity += 10;
  clarity = clamp(clarity, 0, 100);

  const overall = Math.round((communication + confidence + clarity) / 3);

  const notes: string[] = [];
  notes.push(`You spoke roughly ${totalWords} words across ${turns.length} answers (avg ${Math.round(avgWords)} words / answer).`);
  if (fillers > 0) notes.push(`Detected ~${fillers} filler word${fillers === 1 ? "" : "s"} (e.g. "um", "like", "basically").`);
  if (negHedges > posClaims) notes.push("You hedged more than you claimed ownership — try replacing 'I think' with 'I will' or 'I have'.");
  if (strongVerbs >= 3) notes.push(`Good use of strong action verbs (${strongVerbs} detected).`);
  if (avgSentence > 28) notes.push("Some sentences ran long — break complex ideas into shorter, punchier statements.");

  const suggestions: string[] = [];
  if (avgWords < 20) suggestions.push("Aim for 30–60 second answers — use the STAR format (Situation, Task, Action, Result).");
  if (negHedges > 2) suggestions.push("Replace tentative phrases like 'maybe' or 'I guess' with definite ones to project authority.");
  if (fillers > 3) suggestions.push("Pause briefly instead of using filler words — silence reads as confidence.");
  if (strongVerbs < 2) suggestions.push("Quantify achievements where possible (e.g. 'improved X by 30%') and lead with action verbs.");
  if (suggestions.length === 0) suggestions.push("Solid baseline — refine by tightening openings and closing each answer with a clear takeaway.");

  const dressing: string[] = [
    "Choose neutral, well-fitted formals (navy, charcoal, or deep grey). Avoid bright patterns.",
    "Polished closed-toe shoes; minimal jewellery; neat hair and trimmed nails.",
    "If virtual: solid plain top, soft front-facing light, camera at eye level, plain background.",
  ];

  const behavior: string[] = [
    "Arrive (or log in) 5–10 minutes early. Greet with a calm smile and firm handshake.",
    "Maintain steady eye contact ~70% of the time; nod to show active listening.",
    "Sit upright, shoulders relaxed, hands visible. Avoid crossing arms or fidgeting.",
    "Pause for a beat before answering — it shows thoughtfulness, not hesitation.",
    "Close the interview by thanking the panel and asking one thoughtful question about the team or role.",
  ];

  return { communication, confidence, clarity, overall, notes, suggestions, dressing, behavior };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/* ---------- Page ---------- */

const VirtualInterviewer = () => {
  const [phase, setPhase] = useState<"intro" | "interview" | "results">("intro");
  const [stageIdx, setStageIdx] = useState(0);
  const [askingFollowUp, setAskingFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stage = SCRIPT[stageIdx];
  const currentQuestion = askingFollowUp && followUpText ? followUpText : stage?.prompt ?? "";
  const progress = ((stageIdx + (askingFollowUp ? 0.5 : 0)) / SCRIPT.length) * 100;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, currentQuestion, phase]);

  const start = () => {
    setPhase("interview");
    setStageIdx(0);
    setAskingFollowUp(false);
    setFollowUpText(null);
    setDraft("");
    setTurns([]);
  };

  const submitAnswer = () => {
    const answer = draft.trim();
    if (!answer || !stage) return;
    const turn: Turn = {
      stageId: stage.id,
      question: currentQuestion,
      answer,
      isFollowUp: askingFollowUp,
    };
    const nextTurns = [...turns, turn];
    setTurns(nextTurns);
    setDraft("");

    if (!askingFollowUp) {
      const fu = stage.followUp(answer);
      if (fu) {
        setAskingFollowUp(true);
        setFollowUpText(fu);
        return;
      }
    }
    // advance to next stage
    setAskingFollowUp(false);
    setFollowUpText(null);
    if (stageIdx + 1 >= SCRIPT.length) {
      setPhase("results");
    } else {
      setStageIdx(stageIdx + 1);
    }
  };

  const skip = () => {
    if (!stage) return;
    const turn: Turn = {
      stageId: stage.id,
      question: currentQuestion,
      answer: "(skipped)",
      isFollowUp: askingFollowUp,
    };
    setTurns([...turns, turn]);
    setDraft("");
    setAskingFollowUp(false);
    setFollowUpText(null);
    if (stageIdx + 1 >= SCRIPT.length) setPhase("results");
    else setStageIdx(stageIdx + 1);
  };

  const restart = () => {
    setPhase("intro");
    setStageIdx(0);
    setAskingFollowUp(false);
    setFollowUpText(null);
    setDraft("");
    setTurns([]);
  };

  const feedback = useMemo(() => (phase === "results" ? analyze(turns) : null), [phase, turns]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            <h1 className="font-display text-lg font-semibold tracking-tight">Virtual Interviewer</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container max-w-3xl py-10">
        {phase === "intro" && (
          <section className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" /> Offline · No API
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
              A scripted, end-to-end mock interview.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your AI interviewer will guide you through five stages — introduction, motivation,
              strengths, career goals and salary — with smart follow-ups based on what you say.
              At the end, you'll get feedback on communication, confidence and behaviour.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
              {SCRIPT.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary font-display text-xs font-semibold text-foreground">
                    {i + 1}
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
            <Button variant="ink" size="lg" className="mt-8" onClick={start}>
              Start interview <ArrowRight />
            </Button>
          </section>
        )}

        {phase === "interview" && stage && (
          <section className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>
                  Stage {stageIdx + 1} / {SCRIPT.length} · {stage.label}
                </span>
                <span>{askingFollowUp ? "Follow-up" : "Main question"}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-warm transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div ref={scrollRef} className="max-h-[42vh] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="space-y-4">
                {turns.map((t, i) => (
                  <div key={i} className="space-y-3">
                    <Bubble who="bot">{t.question}</Bubble>
                    <Bubble who="user">{t.answer}</Bubble>
                  </div>
                ))}
                <Bubble who="bot" pulse>
                  {currentQuestion}
                </Bubble>
              </div>
            </div>

            <div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Answer as you would in a real interview…"
                rows={5}
                className="resize-none rounded-2xl border-border bg-card p-4 text-base shadow-soft"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount(draft)} words</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={skip}>
                    Skip
                  </Button>
                  <Button variant="ink" size="sm" onClick={submitAnswer} disabled={!draft.trim()}>
                    Send <ArrowRight />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === "results" && feedback && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <CheckCircle2 className="h-3 w-3" /> Interview complete
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                Your interview report
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <ScoreCard label="Overall" value={feedback.overall} highlight />
                <ScoreCard label="Communication" value={feedback.communication} />
                <ScoreCard label="Confidence" value={feedback.confidence} />
                <ScoreCard label="Clarity" value={feedback.clarity} />
              </div>
            </div>

            <Panel title="Observations">
              <ul className="space-y-2 text-sm text-foreground/90">
                {feedback.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">•</span>
                    {n}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Suggestions to improve">
              <ul className="space-y-2 text-sm text-foreground/90">
                {feedback.suggestions.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">→</span>
                    {n}
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
              <Panel title="Dressing tips">
                <ul className="space-y-2 text-sm text-foreground/90">
                  {feedback.dressing.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">•</span>
                      {n}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Interview behaviour">
                <ul className="space-y-2 text-sm text-foreground/90">
                  {feedback.behavior.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">•</span>
                      {n}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Transcript">
              <div className="space-y-4">
                {turns.map((t, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {SCRIPT.find((s) => s.id === t.stageId)?.label}
                      {t.isFollowUp ? " · follow-up" : ""}
                    </div>
                    <Bubble who="bot">{t.question}</Bubble>
                    <Bubble who="user">{t.answer}</Bubble>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="flex justify-center">
              <Button variant="ink" size="lg" onClick={restart}>
                <RotateCcw /> Run again
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

/* ---------- Small UI atoms ---------- */

const Bubble = ({
  who,
  children,
  pulse,
}: {
  who: "bot" | "user";
  children: React.ReactNode;
  pulse?: boolean;
}) => (
  <div className={`flex gap-3 ${who === "user" ? "flex-row-reverse" : ""}`}>
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        who === "bot" ? "bg-accent/10 text-accent" : "bg-secondary text-foreground"
      }`}
    >
      {who === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        who === "bot"
          ? `bg-secondary text-foreground ${pulse ? "ring-2 ring-accent/30" : ""}`
          : "bg-foreground text-background"
      }`}
    >
      {children}
    </div>
  </div>
);

const ScoreCard = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-2xl border p-4 ${
      highlight ? "border-accent bg-accent/5" : "border-border bg-secondary/40"
    }`}
  >
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1 font-display text-3xl font-semibold tabular-nums">
      {value}
      <span className="text-base text-muted-foreground">/100</span>
    </div>
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
    <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
    <div className="mt-4">{children}</div>
  </div>
);

export default VirtualInterviewer;
