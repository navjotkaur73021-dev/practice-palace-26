import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Role } from "@/lib/interviewData";
import { Mic, MicOff, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  role: Role;
  onExit: () => void;
  onComplete: (answers: string[]) => void;
};

export const Interview = ({ role, onExit, onComplete }: Props) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => role.questions.map(() => ""));
  const [text, setText] = useState("");
  const sr = useSpeechRecognition();

  const question = role.questions[index];
  const total = role.questions.length;
  const progress = ((index) / total) * 100;

  // When speech transcript updates, mirror into text
  useEffect(() => {
    if (sr.listening) setText(sr.transcript);
  }, [sr.transcript, sr.listening]);

  const handleMicToggle = () => {
    if (!sr.supported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (sr.listening) {
      sr.stop();
    } else {
      sr.reset(text);
      sr.start();
    }
  };

  const handleNext = () => {
    if (sr.listening) sr.stop();
    const next = [...answers];
    next[index] = text.trim();
    setAnswers(next);

    if (index + 1 >= total) {
      onComplete(next);
    } else {
      setIndex(index + 1);
      setText(next[index + 1] ?? "");
      sr.reset(next[index + 1] ?? "");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X /> Exit
        </Button>
      </header>

      {/* Progress */}
      <div className="container">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>{role.title}</span>
          <span>
            Question {index + 1} <span className="text-foreground/40">/ {total}</span>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-warm transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="container max-w-3xl pb-32 pt-12">
        <div key={index} className="animate-fade-up">
          <span className="font-display text-7xl font-semibold leading-none text-accent/30">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-snug tracking-tight md:text-4xl text-balance">
            {question}
          </h1>

          <div className="mt-10">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={sr.listening ? "Listening… speak naturally" : "Type your answer, or tap the mic to speak"}
              rows={8}
              className="w-full resize-none rounded-2xl border border-border bg-card p-5 text-base leading-relaxed text-foreground shadow-soft outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:shadow-coral"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
              {sr.listening && (
                <span className="flex items-center gap-2 text-accent">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Recording
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="container flex max-w-3xl items-center justify-between gap-4 py-4">
          <button
            onClick={handleMicToggle}
            aria-label={sr.listening ? "Stop recording" : "Start voice answer"}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              sr.listening
                ? "bg-accent text-accent-foreground animate-pulse-mic"
                : "bg-secondary text-foreground hover:bg-foreground hover:text-background"
            }`}
          >
            {sr.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <Button variant="ink" size="lg" onClick={handleNext}>
            {index + 1 >= total ? "Finish" : "Next question"}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
};
