import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Splash } from "@/components/interview/Splash";
import logoImg from "@/assets/omni-prep-logo.png";
import type { Role, Language, Difficulty, QuestionFormat, Personality } from "@/lib/interviewData";
import type { QuizQuestion } from "@/lib/settingsStorage";

const Landing = lazy(() =>
  import("@/components/interview/Landing").then((m) => ({ default: m.Landing })),
);
const Setup = lazy(() =>
  import("@/components/interview/Setup").then((m) => ({ default: m.Setup })),
);
const Interview = lazy(() =>
  import("@/components/interview/Interview").then((m) => ({ default: m.Interview })),
);
const Results = lazy(() =>
  import("@/components/interview/Results").then((m) => ({ default: m.Results })),
);
const HistoryView = lazy(() =>
  import("@/components/interview/History").then((m) => ({ default: m.History })),
);
const CareerChat = lazy(() =>
  import("@/components/interview/CareerChat").then((m) => ({ default: m.CareerChat })),
);

type Stage = "splash" | "landing" | "setup" | "interview" | "results" | "history";

const RESUMABLE: Stage[] = ["landing", "setup", "history"];
const STAGE_KEY = "poise:last-stage";

const readLastStage = (): Stage | null => {
  try {
    const v = localStorage.getItem(STAGE_KEY) as Stage | null;
    return v && RESUMABLE.includes(v) ? v : null;
  } catch {
    return null;
  }
};

const Index = () => {
  const [stage, setStage] = useState<Stage>("splash");
  const [role, setRole] = useState<Role | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [format, setFormat] = useState<QuestionFormat>("mixed");
  const [autoSkip, setAutoSkip] = useState<boolean>(true);
  const [personality, setPersonality] = useState<Personality>("neutral");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const resumeRef = useRef<Stage>("landing");

  useEffect(() => {
    document.title = "Poise — AI Interview Practice in English, Hindi & Punjabi";
    const meta =
      document.querySelector('meta[name="description"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "description" }),
      );
    (meta as HTMLMetaElement).setAttribute(
      "content",
      "Practice tailored AI mock interviews in English, Hindi or Punjabi. MCQ + open answers, difficulty levels, voice input, instant feedback. No sign-up required.",
    );
  }, []);

  useEffect(() => {
    resumeRef.current = readLastStage() ?? "landing";

    const img = new Image();
    img.src = logoImg;
    img.decode?.().catch(() => {});

    void import("@/components/interview/Landing");
    void import("@/components/interview/Setup");
    void import("@/components/interview/Interview");

    const idle = (cb: () => void) => {
      const w = window as Window & {
        requestIdleCallback?: (cb: IdleRequestCallback) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        return w.requestIdleCallback(() => cb());
      }
      return window.setTimeout(cb, 600);
    };
    const handle = idle(() => {
      void import("@/components/interview/Results");
      void import("@/components/interview/History");
    });
    return () => {
      const w = window as Window & { cancelIdleCallback?: (h: number) => void };
      if (typeof w.cancelIdleCallback === "function") {
        w.cancelIdleCallback(handle as number);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, []);

  useEffect(() => {
    if (stage === "splash") return;
    try {
      if (RESUMABLE.includes(stage)) {
        localStorage.setItem(STAGE_KEY, stage);
      }
    } catch {}
  }, [stage]);

  return (
    <>
      {stage === "splash" && <Splash onDone={() => setStage(resumeRef.current)} />}
      <Suspense fallback={null}>
        {stage === "landing" && (
          <Landing
            onStart={() => setStage("setup")}
            onHistory={() => setStage("history")}
            onResume={(r, lang, c, d, f) => {
              setRole(r);
              setLanguage(lang);
              setCount(c);
              setDifficulty(d);
              setFormat(f);
              setAutoSkip(true);
              setQuestions([]);
              setAnswers([]);
              setStage("interview");
            }}
          />
        )}
        {stage === "setup" && (
          <Setup
            onBack={() => setStage("landing")}
            onStart={(r, lang, c, d, f, a) => {
              setRole(r);
              setLanguage(lang);
              setCount(c);
              setDifficulty(d);
              setFormat(f);
              setAutoSkip(a);
              setQuestions([]);
              setAnswers([]);
              setStage("interview");
            }}
          />
        )}
        {stage === "interview" && role && (
          <Interview
            role={role}
            language={language}
            count={count}
            difficulty={difficulty}
            format={format}
            autoSkip={autoSkip}
            onExit={() => setStage("setup")}
            onComplete={(qs, a) => {
              setQuestions(qs);
              setAnswers(a);
              setStage("results");
            }}
          />
        )}
        {stage === "results" && role && (
          <Results
            role={role}
            language={language}
            difficulty={difficulty}
            questions={questions}
            answers={answers}
            onRestart={() => setStage("interview")}
            onHome={() => setStage("landing")}
          />
        )}
        {stage === "history" && <HistoryView onBack={() => setStage("landing")} />}
      </Suspense>
    </>
  );
};

export default Index;
