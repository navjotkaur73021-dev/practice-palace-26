import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { LANGUAGES, type Language, type Role } from "@/lib/interviewData";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, ArrowRight, X, Clock, Loader2, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  role: Role;
  language: Language;
  count: number;
  onExit: () => void;
  onComplete: (questions: string[], answers: string[]) => void;
};

const QUESTION_SECONDS = 90;

export const Interview = ({ role, language, count, onExit, onComplete }: Props) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const speechLang = LANGUAGES.find((l) => l.id === language)?.speechLang ?? "en-US";
  const sr = useSpeechRecognition(speechLang);
  const advanceRef = useRef<() => void>(() => {});

  // Fetch AI questions on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingQuestions(true);
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          roleTitle: role.title,
          roleBlurb: role.blurb,
          language,
          count,
        },
      });
      if (cancelled) return;
      if (error || !data?.questions) {
        console.error("Question generation failed", error);
        toast.error(data?.error || "Couldn't generate questions. Please try again.");
        setLoadingQuestions(false);
        return;
      }
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ""));
      setLoadingQuestions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [role.id, language, count]);

  const question = questions[index];
  const total = questions.length;
  const progress = total ? (index / total) * 100 : 0;
  const timePct = (secondsLeft / QUESTION_SECONDS) * 100;
  const urgent = secondsLeft <= 15;

  // Mirror voice transcript into text
  useEffect(() => {
    if (sr.listening) setText(sr.transcript);
  }, [sr.transcript, sr.listening]);

  // Surface voice errors as toasts (one-shot)
  useEffect(() => {
    if (sr.error) toast.error(sr.error);
  }, [sr.error]);

  // Reset timer per question
  useEffect(() => {
    setSecondsLeft(QUESTION_SECONDS);
  }, [index]);

  // Tick (only once questions loaded)
  useEffect(() => {
    if (loadingQuestions || !total) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setTimeout(() => advanceRef.current(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [index, loadingQuestions, total]);

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

  const handleClear = () => {
    if (sr.listening) sr.stop();
    sr.reset("");
    setText("");
  };

  const handleNext = () => {
    if (sr.listening) sr.stop();
    const next = [...answers];
    next[index] = text.trim();
    setAnswers(next);

    if (index + 1 >= total) {
      onComplete(questions, next);
    } else {
      setIndex(index + 1);
      setText(next[index + 1] ?? "");
      sr.reset(next[index + 1] ?? "");
    }
  };
  advanceRef.current = handleNext;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-background">
        <header className="container flex items-center justify-between py-6">
          <Logo />
          <Button variant="ghost" size="sm" onClick={onExit}>
            <X /> Exit
          </Button>
        </header>
        <main className="container flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <h2 className="mt-6 font-display text-2xl font-semibold">
            Crafting your interview…
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your AI coach is preparing tailored questions for {role.title}.
          </p>
        </main>
      </div>
    );
  }

  if (!total) {
    return (
      <div className="min-h-screen bg-background">
        <header className="container flex items-center justify-between py-6">
          <Logo />
          <Button variant="ghost" size="sm" onClick={onExit}>
            <X /> Exit
          </Button>
        </header>
        <main className="container max-w-3xl py-24 text-center">
          <h2 className="font-display text-2xl font-semibold">Couldn't load questions.</h2>
          <p className="mt-2 text-muted-foreground">Please head back and try again.</p>
          <Button className="mt-6" variant="hero" onClick={onExit}>
            Back to setup
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X /> Exit
        </Button>
      </header>

      <div className="container">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>{role.title} · {LANGUAGES.find((l) => l.id === language)?.native}</span>
          <span className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 tabular-nums transition-colors ${urgent ? "text-destructive" : ""}`}>
              <Clock className="h-3.5 w-3.5" />
              {mm}:{ss}
            </span>
            <span>
              Question {index + 1} <span className="text-foreground/40">/ {total}</span>
            </span>
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-warm transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-secondary/60">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${urgent ? "bg-destructive" : "bg-foreground/40"}`}
            style={{ width: `${timePct}%` }}
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
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  sr.listening
                    ? "Listening… speak naturally"
                    : sr.supported
                    ? "Type your answer, or tap the mic to speak"
                    : "Type your answer (voice input not supported in this browser)"
                }
                rows={8}
                className={`w-full resize-none rounded-2xl border bg-card p-5 text-base leading-relaxed text-foreground shadow-soft outline-none transition-all placeholder:text-muted-foreground focus:shadow-coral ${
                  sr.listening ? "border-accent ring-2 ring-accent/20" : "border-border focus:border-accent"
                }`}
              />
              {sr.listening && (
                <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  Listening
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
              <div className="flex items-center gap-3">
                {!sr.supported && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Voice unsupported — use Chrome/Edge
                  </span>
                )}
                {text && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="container flex max-w-3xl items-center justify-between gap-4 py-4">
          <button
            onClick={handleMicToggle}
            disabled={!sr.supported}
            aria-label={sr.listening ? "Stop recording" : "Start voice answer"}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              sr.listening
                ? "bg-accent text-accent-foreground animate-pulse-mic shadow-coral"
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
