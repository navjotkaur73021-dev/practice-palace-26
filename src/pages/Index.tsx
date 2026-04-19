import { useState } from "react";
import { Landing } from "@/components/interview/Landing";
import { Setup } from "@/components/interview/Setup";
import { Interview } from "@/components/interview/Interview";
import { Results } from "@/components/interview/Results";
import type { Role } from "@/lib/interviewData";

type Stage = "landing" | "setup" | "interview" | "results";

const Index = () => {
  const [stage, setStage] = useState<Stage>("landing");
  const [role, setRole] = useState<Role | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);

  // Set page metadata once
  if (typeof document !== "undefined") {
    document.title = "Poise — AI Interview Practice that Builds Real Confidence";
    const meta = document.querySelector('meta[name="description"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
    (meta as HTMLMetaElement).setAttribute("content", "Practice tailored mock interviews by role, answer with voice or text, and get instant AI feedback. No sign-up required.");
  }

  return (
    <>
      {stage === "landing" && <Landing onStart={() => setStage("setup")} />}
      {stage === "setup" && (
        <Setup
          onBack={() => setStage("landing")}
          onStart={(r) => {
            setRole(r);
            setAnswers([]);
            setStage("interview");
          }}
        />
      )}
      {stage === "interview" && role && (
        <Interview
          role={role}
          onExit={() => setStage("setup")}
          onComplete={(a) => {
            setAnswers(a);
            setStage("results");
          }}
        />
      )}
      {stage === "results" && role && (
        <Results
          role={role}
          answers={answers}
          onRestart={() => setStage("interview")}
          onHome={() => setStage("landing")}
        />
      )}
    </>
  );
};

export default Index;
