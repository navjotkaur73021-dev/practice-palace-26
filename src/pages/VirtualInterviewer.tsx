import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Code2,
  HeartPulse,
  LineChart,
  Megaphone,
  Palette,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";

/* ---------- Roles ---------- */

type RoleId = "software" | "data" | "marketing" | "design" | "sales" | "healthcare";

type Role = {
  id: RoleId;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  salaryHint: string;
  dressing: string[];
  behavior: string[];
  /** role-specific career round questions */
  career: string[];
};

const ROLES: Role[] = [
  {
    id: "software",
    title: "Software Engineer",
    blurb: "Backend, frontend, full-stack and platform roles.",
    icon: Code2,
    salaryHint: "Most candidates quote a CTC range and explain how they researched it.",
    dressing: [
      "Smart casual works at most product companies — clean shirt, dark jeans or chinos, closed shoes.",
      "For enterprise / consulting interviews lean formal: blazer, plain shirt, formal trousers.",
      "Virtual round: solid plain top, eye-level camera, soft front lighting, tidy background.",
    ],
    behavior: [
      "Think out loud during technical questions — process matters as much as the answer.",
      "If you don't know, say 'I'd approach it like this…' instead of guessing blindly.",
      "Have one good question ready about the team's tech stack or engineering culture.",
    ],
    career: [
      "Walk me through a project you're most proud of and your specific contribution.",
      "Tell me about a time you debugged a tricky production issue. How did you approach it?",
      "How do you decide between shipping fast and over-engineering for the long term?",
    ],
  },
  {
    id: "data",
    title: "Data Analyst / Scientist",
    blurb: "Analytics, BI, ML and data engineering roles.",
    icon: LineChart,
    salaryHint: "Be ready to justify your number with experience, tools, and impact metrics.",
    dressing: [
      "Business casual: collared shirt or blouse with formal trousers or a knee-length skirt.",
      "Avoid loud patterns — interviewers should remember your insights, not your outfit.",
      "Carry a notebook and pen — useful for sketching data flows on a whiteboard round.",
    ],
    behavior: [
      "Ground every answer in numbers — 'reduced churn by 12%' beats 'improved churn'.",
      "When asked a case question, restate the problem in your own words before answering.",
      "Show curiosity — ask what data sources or KPIs the team currently relies on.",
    ],
    career: [
      "Describe an analysis where your insight changed a business decision.",
      "How do you handle missing or messy data in a real project?",
      "Walk me through how you'd measure the success of a new product feature.",
    ],
  },
  {
    id: "marketing",
    title: "Marketing / Growth",
    blurb: "Brand, performance, content and growth roles.",
    icon: Megaphone,
    salaryHint: "Many marketing offers include variable / performance pay — clarify base vs total.",
    dressing: [
      "Lean polished and on-brand — well-fitted blazer, sharp colour accent allowed.",
      "Footwear: clean leather shoes or block heels, never sneakers for client-facing roles.",
      "Show personality through one accessory, not five.",
    ],
    behavior: [
      "Bring a one-page portfolio of campaigns with measurable outcomes.",
      "Speak the language of funnels: awareness → consideration → conversion → retention.",
      "Show storytelling skill — every campaign answer should have a clear arc.",
    ],
    career: [
      "Tell me about a campaign you led from idea to launch. What was the result?",
      "How do you decide where to invest a limited marketing budget?",
      "Describe a campaign that underperformed. What did you learn?",
    ],
  },
  {
    id: "design",
    title: "Product / UX Designer",
    blurb: "Product design, UX research and visual design roles.",
    icon: Palette,
    salaryHint: "Designers often negotiate on title, scope and equity alongside base pay.",
    dressing: [
      "Creative-smart: well-fitted neutral outfit with one considered design detail.",
      "Avoid clutter — your portfolio should do the talking, not your accessories.",
      "Bring a laptop or tablet ready to walk through 2–3 case studies.",
    ],
    behavior: [
      "Frame every case study as Problem → Process → Decision → Outcome.",
      "Talk about trade-offs you made and why — designers are hired for judgement.",
      "Invite critique gracefully; show how you incorporate feedback.",
    ],
    career: [
      "Walk me through a case study where research changed your design direction.",
      "Tell me about a time you disagreed with a PM or engineer. How did you resolve it?",
      "How do you balance user needs with business constraints?",
    ],
  },
  {
    id: "sales",
    title: "Sales / Business Development",
    blurb: "Inside sales, AE, BD and account management roles.",
    icon: Briefcase,
    salaryHint: "Always clarify base, OTE (on-target earnings), and commission structure.",
    dressing: [
      "Full formals: tailored suit or blazer in navy / charcoal, crisp shirt, polished shoes.",
      "Grooming is non-negotiable — neat hair, trimmed nails, subtle fragrance.",
      "First impression carries weight — dress one notch above the company's daily code.",
    ],
    behavior: [
      "Project warmth and confidence in equal measure — smile, firm handshake, eye contact.",
      "Numbers, numbers, numbers — quota %, deal size, win rate, ramp time.",
      "Treat the interview like a discovery call: ask, listen, then position yourself.",
    ],
    career: [
      "Describe your largest deal. How did you find, qualify and close it?",
      "Tell me about a deal you lost. What would you do differently?",
      "How do you build a pipeline from scratch in a new territory?",
    ],
  },
  {
    id: "healthcare",
    title: "Healthcare / Clinical",
    blurb: "Nursing, allied health, clinical and hospital roles.",
    icon: HeartPulse,
    salaryHint: "Discuss shift allowances, on-call pay and benefits alongside base salary.",
    dressing: [
      "Conservative formals — covered shoulders, knee-length, muted colours.",
      "Minimal jewellery and fragrance; tied-back hair; closed-toe shoes.",
      "Carry copies of certifications and licences in a neat folder.",
    ],
    behavior: [
      "Lead with empathy in every example — patient outcomes come first.",
      "Demonstrate calm under pressure with a specific clinical incident.",
      "Show respect for hierarchy and multidisciplinary teamwork.",
    ],
    career: [
      "Tell me about a difficult patient or family interaction and how you handled it.",
      "Describe a time you had to act quickly in a clinical emergency.",
      "How do you keep your clinical knowledge up to date?",
    ],
  },
];

/* ---------- Rounds & questions ---------- */

type RoundId = "intro" | "career" | "salary";

type Stage = {
  id: string;
  round: RoundId;
  prompt: string;
  followUp: (answer: string) => string | null;
};

function buildScript(role: Role): Stage[] {
  const intro: Stage[] = [
    {
      id: "intro-1",
      round: "intro",
      prompt: `Welcome — thanks for joining today. To get started, please introduce yourself: your background, education and a bit about who you are as a ${role.title.toLowerCase()}.`,
      followUp: (a) => {
        if (wordCount(a) < 25)
          return "Thanks. Could you expand a little — share one experience or project that shaped your journey?";
        if (/team|group|club|volunteer/i.test(a))
          return "You mentioned working with others. What role do you naturally take in a team?";
        return "Great. What's one thing about you that wouldn't show up on your resume?";
      },
    },
    {
      id: "intro-2",
      round: "intro",
      prompt: `Why did you choose to become a ${role.title.toLowerCase()}? What pulled you toward this field?`,
      followUp: (a) => {
        if (/passion|love|always/i.test(a))
          return "Can you point to a specific moment that confirmed this was the right path for you?";
        if (wordCount(a) < 20)
          return "Could you give a concrete example — a project, a person, or an experience that influenced you?";
        return null;
      },
    },
  ];

  const career: Stage[] = role.career.map((q, i) => ({
    id: `career-${i + 1}`,
    round: "career" as const,
    prompt: q,
    followUp: (a: string) => {
      if (wordCount(a) < 25)
        return "Could you go deeper — what was the situation, your specific action, and the measurable outcome?";
      if (!/example|project|when|once|time|client|customer|user/i.test(a))
        return "Can you ground that in a specific example from your experience?";
      return null;
    },
  }));

  const strengths: Stage = {
    id: "career-strengths",
    round: "career",
    prompt: "What are your top strengths, and what is one weakness you're actively working on?",
    followUp: (a) => {
      if (!/weak|improve|working on|developing/i.test(a))
        return "And the weakness side — what's one area you're consciously trying to improve?";
      return null;
    },
  };

  const goals: Stage = {
    id: "career-goals",
    round: "career",
    prompt: "Where do you see yourself in the next 3 to 5 years?",
    followUp: (a) => {
      if (/manager|lead|head|director/i.test(a))
        return "You mentioned a leadership track — what skills do you still need to get there?";
      if (wordCount(a) < 20)
        return "Try to be specific — what role, what kind of company, and what impact would you have made?";
      return null;
    },
  };

  const salary: Stage[] = [
    {
      id: "salary-1",
      round: "salary",
      prompt: `Let's talk numbers. What are your salary expectations for this ${role.title.toLowerCase()} role, and how did you arrive at that figure?`,
      followUp: (a) => {
        if (!/\d/.test(a))
          return "Could you share a specific range? Even a rough figure helps frame the conversation.";
        if (/negotiable|flexible|open/i.test(a))
          return "Flexibility is good — but what would be your ideal number if everything else aligned?";
        return null;
      },
    },
    {
      id: "salary-2",
      round: "salary",
      prompt:
        "Beyond base pay, what other parts of an offer matter most to you — growth, learning, flexibility, equity, benefits?",
      followUp: () => null,
    },
  ];

  return [...intro, ...career, strengths, goals, ...salary];
}

const ROUND_META: Record<RoundId, { label: string; tagline: string }> = {
  intro: { label: "Introduction Round", tagline: "Get to know you" },
  career: { label: "Career Questions Round", tagline: "Experience, strengths and goals" },
  salary: { label: "Salary / Package Discussion", tagline: "Expectations and priorities" },
};

/* ---------- Heuristics ---------- */

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
const STRONG_VERBS = /\b(led|built|launched|designed|delivered|owned|drove|created|improved|reduced|grew|managed|analysed|analyzed|shipped)\b/gi;

type Turn = { stageId: string; round: RoundId; question: string; answer: string; isFollowUp: boolean };

type Feedback = {
  communication: number;
  confidence: number;
  clarity: number;
  overall: number;
  byRound: Record<RoundId, { words: number; turns: number }>;
  notes: string[];
  suggestions: string[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function analyze(turns: Turn[]): Feedback {
  const real = turns.filter((t) => t.answer && t.answer !== "(skipped)");
  const allText = real.map((t) => t.answer).join(" ");
  const totalWords = wordCount(allText);
  const avgWords = totalWords / Math.max(real.length, 1);
  const fillers = fillerCount(allText);
  const negHedges = (allText.match(CONFIDENCE_NEG) ?? []).length;
  const posClaims = (allText.match(CONFIDENCE_POS) ?? []).length;
  const strongVerbs = (allText.match(STRONG_VERBS) ?? []).length;
  const sentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentence = sentences.length ? totalWords / sentences.length : 0;

  let communication = 50;
  if (avgWords >= 35) communication += 25;
  else if (avgWords >= 20) communication += 15;
  else if (avgWords < 10) communication -= 15;
  if (avgSentence > 8 && avgSentence < 28) communication += 10;
  if (fillers > real.length * 2) communication -= 10;
  communication = clamp(communication, 0, 100);

  let confidence = 55 + posClaims * 4 + strongVerbs * 3 - negHedges * 4 - fillers * 2;
  confidence = clamp(confidence, 0, 100);

  let clarity = 60;
  if (avgSentence > 30) clarity -= 15;
  if (avgSentence < 5) clarity -= 10;
  if (avgWords < 10) clarity -= 10;
  if (strongVerbs >= 3) clarity += 10;
  clarity = clamp(clarity, 0, 100);

  const overall = Math.round((communication + confidence + clarity) / 3);

  const byRound: Feedback["byRound"] = {
    intro: { words: 0, turns: 0 },
    career: { words: 0, turns: 0 },
    salary: { words: 0, turns: 0 },
  };
  for (const t of real) {
    byRound[t.round].words += wordCount(t.answer);
    byRound[t.round].turns += 1;
  }

  const notes: string[] = [];
  notes.push(`You spoke ~${totalWords} words across ${real.length} answers (avg ${Math.round(avgWords)} words / answer).`);
  if (fillers > 0) notes.push(`Detected ~${fillers} filler word${fillers === 1 ? "" : "s"} (e.g. "um", "like").`);
  if (negHedges > posClaims)
    notes.push("You hedged more than you owned — replace 'I think' with 'I will' or 'I have'.");
  if (strongVerbs >= 3) notes.push(`Good use of action verbs (${strongVerbs} detected).`);
  if (avgSentence > 28) notes.push("Some sentences ran long — break complex ideas into shorter statements.");
  if (turns.some((t) => t.answer === "(skipped)"))
    notes.push("You skipped at least one question — in a real interview, attempt every answer.");

  const suggestions: string[] = [];
  if (avgWords < 20) suggestions.push("Aim for 30–60 second answers — use the STAR format (Situation, Task, Action, Result).");
  if (negHedges > 2) suggestions.push("Swap tentative phrases ('maybe', 'I guess') for definite ones to project authority.");
  if (fillers > 3) suggestions.push("Pause briefly instead of using fillers — silence reads as confidence.");
  if (strongVerbs < 2) suggestions.push("Quantify achievements (e.g. 'improved X by 30%') and lead with action verbs.");
  if (suggestions.length === 0)
    suggestions.push("Solid baseline — refine by tightening openings and closing each answer with a clear takeaway.");

  return { communication, confidence, clarity, overall, byRound, notes, suggestions };
}

/* ---------- Page ---------- */

type Phase = "role" | "countdown" | "interview" | "results";

const VirtualInterviewer = () => {
  const [phase, setPhase] = useState<Phase>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [stageIdx, setStageIdx] = useState(0);
  const [askingFollowUp, setAskingFollowUp] = useState(false);
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const script = useMemo(() => (role ? buildScript(role) : []), [role]);
  const stage = script[stageIdx];
  const currentQuestion = askingFollowUp && followUpText ? followUpText : stage?.prompt ?? "";
  const progress = script.length ? ((stageIdx + (askingFollowUp ? 0.5 : 0)) / script.length) * 100 : 0;

  // Auto-start countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("interview");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, currentQuestion, phase]);

  const pickRole = (r: Role) => {
    setRole(r);
    setStageIdx(0);
    setAskingFollowUp(false);
    setFollowUpText(null);
    setDraft("");
    setTurns([]);
    setCountdown(5);
    setPhase("countdown");
  };

  const submitAnswer = () => {
    const answer = draft.trim();
    if (!answer || !stage) return;
    const turn: Turn = {
      stageId: stage.id,
      round: stage.round,
      question: currentQuestion,
      answer,
      isFollowUp: askingFollowUp,
    };
    setTurns((prev) => [...prev, turn]);
    setDraft("");

    if (!askingFollowUp) {
      const fu = stage.followUp(answer);
      if (fu) {
        setAskingFollowUp(true);
        setFollowUpText(fu);
        return;
      }
    }
    advance();
  };

  const skip = () => {
    if (!stage) return;
    const turn: Turn = {
      stageId: stage.id,
      round: stage.round,
      question: currentQuestion,
      answer: "(skipped)",
      isFollowUp: askingFollowUp,
    };
    setTurns((prev) => [...prev, turn]);
    setDraft("");
    advance();
  };

  const advance = () => {
    setAskingFollowUp(false);
    setFollowUpText(null);
    if (stageIdx + 1 >= script.length) setPhase("results");
    else setStageIdx(stageIdx + 1);
  };

  const restart = () => {
    setPhase("role");
    setRole(null);
    setStageIdx(0);
    setAskingFollowUp(false);
    setFollowUpText(null);
    setDraft("");
    setTurns([]);
    setCountdown(5);
  };

  const feedback = useMemo(() => (phase === "results" ? analyze(turns) : null), [phase, turns]);
  const currentRound = stage?.round;

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
        {phase === "role" && (
          <section>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" /> Offline · No API
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
              Choose your role to begin.
            </h2>
            <p className="mt-2 text-muted-foreground">
              The interviewer adapts its questions, tone, and feedback to the role you pick.
              Three rounds: introduction, career questions, and salary discussion.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => pickRole(r)}
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-coral"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-display text-base font-semibold">{r.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{r.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {phase === "countdown" && role && (
          <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Interview starting · {role.title}
            </span>
            <div className="mt-6 font-display text-[8rem] font-semibold leading-none text-accent tabular-nums">
              {countdown || "Go"}
            </div>
            <p className="mt-4 max-w-md text-muted-foreground">
              Take a breath. Sit upright, smile, and look into the camera. Your interviewer will
              ask the first question automatically.
            </p>
            <Button variant="ghost" size="sm" className="mt-6" onClick={() => setPhase("interview")}>
              Skip countdown <ArrowRight />
            </Button>
          </section>
        )}

        {phase === "interview" && stage && role && (
          <section className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>
                  {ROUND_META[stage.round].label} · {role.title}
                </span>
                <span>
                  Q {stageIdx + 1} / {script.length}
                  {askingFollowUp ? " · follow-up" : ""}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-warm transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex gap-2 text-[11px]">
                {(["intro", "career", "salary"] as RoundId[]).map((r) => (
                  <span
                    key={r}
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      r === currentRound
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {ROUND_META[r].label}
                  </span>
                ))}
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

        {phase === "results" && feedback && role && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <CheckCircle2 className="h-3 w-3" /> Final Interview Report
              </span>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
                {role.title} — your performance
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <ScoreCard label="Overall" value={feedback.overall} highlight />
                <ScoreCard label="Communication" value={feedback.communication} />
                <ScoreCard label="Confidence" value={feedback.confidence} />
                <ScoreCard label="Clarity" value={feedback.clarity} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {(["intro", "career", "salary"] as RoundId[]).map((r) => (
                  <div key={r} className="rounded-2xl border border-border bg-secondary/40 p-4">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {ROUND_META[r].label}
                    </div>
                    <div className="mt-1 font-display text-xl font-semibold">
                      {feedback.byRound[r].turns} answers
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {feedback.byRound[r].words} words total
                    </div>
                  </div>
                ))}
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

            <Panel title="Salary discussion notes">
              <p className="text-sm text-foreground/90">{role.salaryHint}</p>
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
              <Panel title={`Dressing tips · ${role.title}`}>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {role.dressing.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">•</span>
                      {n}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title={`Behaviour tips · ${role.title}`}>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {role.behavior.map((n, i) => (
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
                      {ROUND_META[t.round].label}
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
                <RotateCcw /> Run a new interview
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

/* ---------- Atoms ---------- */

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
