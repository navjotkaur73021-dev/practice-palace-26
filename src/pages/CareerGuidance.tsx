import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Sparkles,
  Target,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

/* ---------------- Types ---------------- */

type Mode = "quick" | "standard" | "deep";
type Stage = "profile" | "interview" | "report";

type Profile = {
  fullName: string;
  age: string;
  school: string;
  college: string;
  stream: string;
  field: string;
  skills: string;
  hobbies: string;
  experience: "fresher" | "1-2" | "3-5" | "5+";
  mode: Mode;
};

type Turn = { q: string; a: string; tag: string };

/* ---------------- Static data ---------------- */

const STREAMS = [
  "Science (PCM)",
  "Science (PCB)",
  "Commerce",
  "Arts / Humanities",
  "Engineering",
  "Computer Applications",
  "Management (BBA/MBA)",
  "Medical",
  "Law",
  "Other",
];

const FIELDS = [
  "Software Engineering",
  "Data Science / AI",
  "Web Development",
  "Cyber Security",
  "Digital Marketing",
  "UI / UX Design",
  "Finance & Banking",
  "Civil Services",
  "Teaching",
  "Healthcare",
  "Mechanical / Core Engg",
  "Entrepreneurship",
];

const MODES: { id: Mode; label: string; desc: string; count: number }[] = [
  { id: "quick", label: "Quick", desc: "5 focused questions", count: 5 },
  { id: "standard", label: "Standard", desc: "8 balanced questions", count: 8 },
  { id: "deep", label: "Deep Dive", desc: "12 in-depth questions", count: 12 },
];

/* ---------------- Question generator (offline) ---------------- */

function buildQuestions(p: Profile): { q: string; tag: string }[] {
  const field = p.field || "your chosen field";
  const stream = p.stream || "your stream";
  const skill = (p.skills.split(",")[0] || "your strongest skill").trim();
  const hobby = (p.hobbies.split(",")[0] || "").trim();

  const intro = [
    { q: `Tell us about yourself, ${p.fullName || "candidate"}.`, tag: "Introduction" },
    { q: `Why did you choose ${stream} after school?`, tag: "Background" },
  ];

  const career = [
    { q: `Why are you interested in ${field}?`, tag: "Motivation" },
    { q: `What recent trend in ${field} excites you the most and why?`, tag: "Awareness" },
    { q: `Walk us through a project or coursework where you used ${skill}.`, tag: "Experience" },
    { q: `What is your biggest strength relevant to ${field}?`, tag: "Strengths" },
    { q: `Describe a weakness and how you are working on it.`, tag: "Self-awareness" },
    { q: `Where do you see yourself 5 years from now in ${field}?`, tag: "Goals" },
  ];

  const technical = [
    { q: `Explain a concept from ${stream} that applies to ${field}.`, tag: "Technical" },
    { q: `How would you stay updated with new tools and skills in ${field}?`, tag: "Learning" },
    { q: `Tell us about a time you solved a difficult problem.`, tag: "Problem solving" },
  ];

  const behavior = [
    { q: `Describe a time you worked in a team and faced disagreement.`, tag: "Teamwork" },
    { q: `How do you handle pressure and tight deadlines?`, tag: "Resilience" },
  ];

  const close = [
    hobby
      ? { q: `You mentioned ${hobby} as a hobby — what has it taught you?`, tag: "Personality" }
      : { q: `What do you do outside academics to grow as a person?`, tag: "Personality" },
    { q: `What are your salary or stipend expectations and why?`, tag: "Salary" },
    { q: `Do you have any questions for us?`, tag: "Closing" },
  ];

  const all = [...intro, ...career, ...technical, ...behavior, ...close];
  const count = MODES.find((m) => m.id === p.mode)?.count ?? 8;
  return all.slice(0, count);
}

/* ---------------- Scoring heuristics ---------------- */

const FILLERS = ["um", "uh", "like", "basically", "actually", "you know", "sort of"];
const STRONG = ["led", "built", "designed", "delivered", "improved", "achieved", "owned", "shipped", "managed", "created"];

function score(turns: Turn[]) {
  const answers = turns.map((t) => t.a.trim()).filter(Boolean);
  if (!answers.length) return { comm: 0, conf: 0, clarity: 0, knowledge: 0, overall: 0 };

  const wordsArr = answers.map((a) => a.split(/\s+/).filter(Boolean).length);
  const avgWords = wordsArr.reduce((s, n) => s + n, 0) / wordsArr.length;

  const text = answers.join(" ").toLowerCase();
  const fillerHits = FILLERS.reduce((s, f) => s + (text.match(new RegExp(`\\b${f}\\b`, "g")) || []).length, 0);
  const strongHits = STRONG.reduce((s, k) => s + (text.match(new RegExp(`\\b${k}\\b`, "g")) || []).length, 0);

  const comm = clamp(40 + Math.min(40, avgWords * 1.2) + Math.min(20, strongHits * 3));
  const conf = clamp(60 + strongHits * 4 - fillerHits * 5);
  const clarity = clamp(50 + (avgWords > 25 && avgWords < 90 ? 30 : 10) + Math.min(20, strongHits * 2));
  const knowledge = clamp(45 + Math.min(35, answers.length * 4) + Math.min(20, strongHits * 2));
  const overall = Math.round((comm + conf + clarity + knowledge) / 4);

  return { comm, conf, clarity, knowledge, overall };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function readiness(s: ReturnType<typeof score>, p: Profile) {
  const skillBoost = p.skills.split(",").filter(Boolean).length * 2;
  const expBoost = p.experience === "fresher" ? 0 : p.experience === "1-2" ? 5 : p.experience === "3-5" ? 10 : 15;
  return clamp(s.overall + skillBoost + expBoost);
}

/* ---------------- Component ---------------- */

const DEFAULT_PROFILE: Profile = {
  fullName: "",
  age: "",
  school: "",
  college: "",
  stream: "",
  field: "",
  skills: "",
  hobbies: "",
  experience: "fresher",
  mode: "standard",
};

export default function CareerGuidance() {
  const [stage, setStage] = useState<Stage>("profile");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [questions, setQuestions] = useState<{ q: string; tag: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  useEffect(() => {
    document.title = "Career Guidance & AI Interview | Poise";
  }, []);

  const canStart =
    profile.fullName.trim() && profile.stream && profile.field && profile.skills.trim();

  const beginInterview = () => {
    const qs = buildQuestions(profile);
    setQuestions(qs);
    setIdx(0);
    setAnswer("");
    setTurns([]);
    setStage("interview");
  };

  const submitAnswer = () => {
    const cur = questions[idx];
    if (!cur) return;
    const next = [...turns, { q: cur.q, a: answer.trim(), tag: cur.tag }];
    setTurns(next);
    setAnswer("");
    if (idx + 1 >= questions.length) {
      setStage("report");
    } else {
      setIdx(idx + 1);
    }
  };

  const reset = () => {
    setStage("profile");
    setProfile(DEFAULT_PROFILE);
    setTurns([]);
    setQuestions([]);
    setIdx(0);
    setAnswer("");
  };

  const s = useMemo(() => score(turns), [turns]);
  const ready = useMemo(() => readiness(s, profile), [s, profile]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold tracking-tight">Career Guidance & AI Interview</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {stage === "profile" && (
          <ProfileForm
            profile={profile}
            setProfile={setProfile}
            canStart={!!canStart}
            onStart={beginInterview}
          />
        )}

        {stage === "interview" && questions[idx] && (
          <InterviewPanel
            idx={idx}
            total={questions.length}
            current={questions[idx]}
            answer={answer}
            setAnswer={setAnswer}
            onSubmit={submitAnswer}
            onExit={() => setStage("profile")}
          />
        )}

        {stage === "report" && (
          <Report
            profile={profile}
            turns={turns}
            scores={s}
            readiness={ready}
            onReset={reset}
            onRetry={beginInterview}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------- Profile Form ---------------- */

function ProfileForm({
  profile,
  setProfile,
  canStart,
  onStart,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  canStart: boolean;
  onStart: () => void;
}) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile({ ...profile, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tell us about you</h2>
        <p className="text-muted-foreground text-sm mt-1">
          We personalize your interview using your education, field, and skills. Nothing is sent to any server.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="h-4 w-4 text-primary" /> Personal & Education
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name *">
            <Input value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Aarav Sharma" />
          </Field>
          <Field label="Age">
            <Input value={profile.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 21" />
          </Field>
          <Field label="School">
            <Input value={profile.school} onChange={(e) => set("school", e.target.value)} placeholder="School name" />
          </Field>
          <Field label="College / University">
            <Input value={profile.college} onChange={(e) => set("college", e.target.value)} placeholder="College name" />
          </Field>
          <Field label="Stream *">
            <Select value={profile.stream} onValueChange={(v) => set("stream", v)}>
              <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
              <SelectContent>
                {STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Experience">
            <Select value={profile.experience} onValueChange={(v) => set("experience", v as Profile["experience"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fresher">Fresher</SelectItem>
                <SelectItem value="1-2">1–2 years</SelectItem>
                <SelectItem value="3-5">3–5 years</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Briefcase className="h-4 w-4 text-primary" /> Career Interests
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Interested field *">
            <Select value={profile.field} onValueChange={(v) => set("field", v)}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Skills * (comma separated)">
            <Input
              value={profile.skills}
              onChange={(e) => set("skills", e.target.value)}
              placeholder="e.g. Python, SQL, Communication"
            />
          </Field>
          <Field label="Hobbies (optional)">
            <Input
              value={profile.hobbies}
              onChange={(e) => set("hobbies", e.target.value)}
              placeholder="e.g. Reading, Cricket, Music"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" /> Interview Mode
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const active = profile.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => set("mode", m.id)}
                className={`text-left rounded-lg border p-4 transition ${
                  active ? "border-primary bg-primary/5" : "hover:border-foreground/30"
                }`}
              >
                <div className="font-medium">{m.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" disabled={!canStart} onClick={onStart}>
          Start Interview <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ---------------- Interview Panel ---------------- */

function InterviewPanel({
  idx,
  total,
  current,
  answer,
  setAnswer,
  onSubmit,
  onExit,
}: {
  idx: number;
  total: number;
  current: { q: string; tag: string };
  answer: string;
  setAnswer: (s: string) => void;
  onSubmit: () => void;
  onExit: () => void;
}) {
  const pct = ((idx) / total) * 100;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Question {idx + 1} of {total}</div>
          <Progress value={pct} className="h-2 w-64 mt-2" />
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </div>

      <Card className="p-6 space-y-4">
        <Badge variant="secondary">{current.tag}</Badge>
        <h3 className="text-xl font-medium leading-snug">{current.q}</h3>
        <Textarea
          rows={6}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here. Aim for 3–6 sentences with concrete examples."
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {answer.trim().split(/\s+/).filter(Boolean).length} words
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAnswer(""); onSubmit(); }}>Skip</Button>
            <Button onClick={onSubmit} disabled={!answer.trim()}>
              {idx + 1 === total ? "Finish" : "Next"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Report ---------------- */

function Report({
  profile,
  turns,
  scores,
  readiness,
  onReset,
  onRetry,
}: {
  profile: Profile;
  turns: Turn[];
  scores: ReturnType<typeof score>;
  readiness: number;
  onReset: () => void;
  onRetry: () => void;
}) {
  const tips = {
    dressing: [
      "Choose well-fitted formals in neutral colors (navy, grey, white).",
      "Polished shoes, minimal accessories, neat hair and trimmed nails.",
      "Iron your clothes the night before — small details signal seriousness.",
    ],
    communication: [
      "Use the STAR method: Situation, Task, Action, Result.",
      "Pause before answering. Short pauses sound confident, not nervous.",
      "Match the interviewer's pace and avoid filler words like 'um', 'like'.",
    ],
    confidence: [
      "Sit upright, maintain eye contact, and smile naturally.",
      "Ground answers in real examples from study, projects, or hobbies.",
      "End answers with conviction — don't trail off into uncertainty.",
    ],
  };

  const verdict =
    readiness >= 80 ? { label: "Interview Ready", tone: "text-emerald-600" } :
    readiness >= 60 ? { label: "Almost Ready", tone: "text-amber-600" } :
    { label: "Needs Practice", tone: "text-rose-600" };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Career Readiness Score</div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="text-5xl font-semibold">{readiness}</div>
              <div className={`text-sm font-medium ${verdict.tone}`}>{verdict.label}</div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {profile.fullName || "Candidate"} · {profile.field} · {profile.stream}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4 mr-2" /> Retry Interview
            </Button>
            <Button onClick={onReset}>New Profile</Button>
          </div>
        </div>
        <Progress value={readiness} className="h-3 mt-4" />
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard label="Communication" value={scores.comm} />
        <ScoreCard label="Confidence" value={scores.conf} />
        <ScoreCard label="Clarity" value={scores.clarity} />
        <ScoreCard label="Knowledge" value={scores.knowledge} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <TipCard title="Dressing Tips" items={tips.dressing} />
        <TipCard title="Communication Tips" items={tips.communication} />
        <TipCard title="Confidence Tips" items={tips.confidence} />
      </div>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Transcript</h3>
        <div className="space-y-4">
          {turns.map((t, i) => (
            <div key={i} className="border-l-2 border-primary/40 pl-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{t.tag}</Badge>
                <span>Q{i + 1}</span>
              </div>
              <div className="font-medium mt-1">{t.q}</div>
              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                {t.a || <em>(skipped)</em>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      <Progress value={value} className="h-1.5 mt-3" />
    </Card>
  );
}

function TipCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <h4 className="font-medium mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
