import { useState } from "react";
import { Landing } from "@/components/interview/Landing";
import { Setup } from "@/components/interview/Setup";
import { Interview } from "@/components/interview/Interview";
import { Results } from "@/components/interview/Results";
import { History } from "@/components/interview/History";
import type { Role, Language } from "@/lib/interviewData";

type Stage = "landing" | "setup" | "interview" | "results" | "history";

const Index = () => {
  const [stage, setStage] = useState<Stage>("landing");
  const [role, setRole] = useState<Role | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [count, setCount] = useState<number>(5);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  if (typeof document !== "undefined") {
    document.title = "Poise — AI Interview Practice that Builds Real Confidence";
    const meta =
      document.querySelector('meta[name="description"]') ??
      document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
    (meta as HTMLMetaElement).setAttribute(
      "content",
      "Practice tailored AI mock interviews in English or Hindi. Speak or type your answers and get real-time feedback. No sign-up required.",
    );
  }

  return (
    <>
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
      {stage === "history" && <History onBack={() => setStage("landing")} />}
    </>
  );
};

export default Index;
