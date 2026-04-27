import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Splash } from "@/components/interview/Splash";
import logoImg from "@/assets/omni-prep-logo.png";
import type { Role, Language } from "@/lib/interviewData";

// Lazy-loaded route chunks so we can preload them during the splash screen.
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

type Stage = "splash" | "landing" | "setup" | "interview" | "results" | "history";

// Stages that are safe to resume on reload (not mid-interview / mid-results).
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
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const resumeRef = useRef<Stage>("landing");

  // SEO
  useEffect(() => {
    document.title = "Poise — AI Interview Practice in English & Hindi";
    const meta =
      document.querySelector('meta[name="description"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "description" }),
      );
    (meta as HTMLMetaElement).setAttribute(
      "content",
      "Practice tailored AI mock interviews in English or Hindi. Speak or type your answers and get real-time feedback. No sign-up required.",
    );
  }, []);

  // Preload assets + chunk during splash; remember last resumable stage.
  useEffect(() => {
    resumeRef.current = readLastStage() ?? "landing";

    // Warm the image cache for the logo (used on every screen). decode()
    // ensures the bitmap is ready before first paint of subsequent screens.
    const img = new Image();
    img.src = logoImg;
    img.decode?.().catch(() => {
      /* ignore — fallback to lazy decode */
    });

    // Eagerly fetch the chunks the user is most likely to hit next.
    void import("@/components/interview/Landing");
    void import("@/components/interview/Setup");
    void import("@/components/interview/Interview");

    // Lower-priority chunks — fetch when the browser is idle so they don't
    // compete with the critical splash → landing transition.
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

  // Persist resumable stage transitions.
  useEffect(() => {
    if (stage === "splash") return;
    try {
      if (RESUMABLE.includes(stage)) {
        localStorage.setItem(STAGE_KEY, stage);
      }
    } catch {
      /* ignore */
    }
  }, [stage]);

  return (
    <>
      {stage === "splash" && <Splash onDone={() => setStage(resumeRef.current)} />}
      <Suspense fallback={null}>
        {stage === "landing" && (
          <Landing
            onStart={() => setStage("setup")}
            onHistory={() => setStage("history")}
          />
        )}
        {stage === "setup" && (
          <Setup
            onBack={() => setStage("landing")}
            onStart={(r, lang, c) => {
              setRole(r);
              setLanguage(lang);
              setCount(c);
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
