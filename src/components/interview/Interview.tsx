import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  LANGUAGES,
  type Language,
  type Role,
  type Difficulty,
  type QuestionFormat,
  type Personality,
} from "@/lib/interviewData";
import {
  type QuizQuestion,
  saveInProgressQuiz,
  loadInProgressQuiz,
  clearInProgressQuiz,
} from "@/lib/settingsStorage";
import { supabase } from "@/integrations/supabase/client";
import {
  Mic,
  MicOff,
  ArrowRight,
  X,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
  Sparkles,
  SkipForward,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  role: Role;
  language: Language;
  count: number;
  difficulty: Difficulty;
  format: QuestionFormat;
  autoSkip: boolean;
  personality: Personality;
  onExit: () => void;
  onComplete: (questions: QuizQuestion[], answers: string[]) => void;
};

const QUESTION_SECONDS = 90;

export const Interview = ({
  role,
  language,
  count,
  difficulty,
  format,
  autoSkip,
  personality,
  onExit,
  onComplete,
}: Props) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [suggesting, setSuggesting] = useState(false);
  const [hinting, setHinting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const speechLang = LANGUAGES.find((l) => l.id === language)?.speechLang ?? "en-US";
  const sr = useSpeechRecognition(speechLang);
  const advanceRef = useRef<() => void>(() => {});

  // Try resume in-progress quiz, otherwise fetch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = loadInProgressQuiz();
      if (
        existing &&
        existing.roleId === role.id &&
        existing.language === language &&
        existing.difficulty === difficulty &&
        existing.format === format &&
        existing.count === count &&
        existing.questions.length === count
      ) {
        setQuestions(existing.questions);
        setAnswers(existing.answers);
        setIndex(existing.index);
        setText(existing.answers[existing.index] ?? "");
        setLoadingQuestions(false);
        setResumed(true);
        toast.success("Resumed your previous session.");
        return;
      }

      setLoadingQuestions(true);
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          roleTitle: role.title,
          roleBlurb: role.blurb,
          language,
          count,
          difficulty,
          format,
          personality,
        },
      });
      if (cancelled) return;
      if (error || !data?.questions) {
        console.error("Question generation failed", error);
        toast.error(data?.error || "Couldn't generate questions. Please try again.");
        setLoadingQuestions(false);
        return;
      }
      const qs: QuizQuestion[] = data.questions;
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setLoadingQuestions(false);
      saveInProgressQuiz({
        roleId: role.id,
        roleTitle: role.title,
        roleBlurb: role.blurb,
        language,
        difficulty,
        format,
        personality,
        count,
        questions: qs,
        answers: qs.map(() => ""),
        index: 0,
        startedAt: Date.now(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [role.id, role.title, role.blurb, language, count, difficulty, format, personality]);

  const question = questions[index];
  const total = questions.length;
  const progress = total ? (index / total) * 100 : 0;
  const timePct = (secondsLeft / QUESTION_SECONDS) * 100;
  const urgent = secondsLeft <= 15;
  const isMCQ = question?.kind === "mcq";

  // Mirror voice transcript
  useEffect(() => {
    if (sr.listening) setText(sr.transcript);
  }, [sr.transcript, sr.listening]);

  useEffect(() => {
    if (sr.error) toast.error(sr.error);
  }, [sr.error]);

  // Reset timer + hint per question
  useEffect(() => {
    setSecondsLeft(QUESTION_SECONDS);
    setHint(null);
  }, [index]);

  // Tick
  useEffect(() => {
    if (loadingQuestions || !total) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (autoSkip) {
            setTimeout(() => advanceRef.current(), 0);
          } else {
            toast("Time's up — you can keep typing or move on.", { icon: "⏰" });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [index, loadingQuestions, total, autoSkip]);

  // Persist progress on every change
  useEffect(() => {
    if (loadingQuestions || !total) return;
    saveInProgressQuiz({
      roleId: role.id,
      roleTitle: role.title,
      roleBlurb: role.blurb,
      language,
      difficulty,
      format,
      personality,
      count,
      questions,
      answers,
      index,
      startedAt: Date.now(),
    });
  }, [
    answers,
    index,
    questions,
    loadingQuestions,
    total,
    role.id,
    role.title,
    role.blurb,
    language,
    difficulty,
    format,
    count,
  ]);

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

  const handleSuggest = async () => {
    if (!question) return;
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke("suggest-answer", {
      body: {
        roleTitle: role.title,
        question: question.text,
        language,
        draft: text,
      },
    });
    setSuggesting(false);
    if (error || !data?.suggestion) {
      toast.error(data?.error || "Couldn't fetch a suggestion.");
      return;
    }
    setText(data.suggestion);
    sr.reset(data.suggestion);
    toast.success("Sample answer inserted — edit it to make it yours.");
  };

  const handleHint = async () => {
    if (!question) return;
    setHinting(true);
    const { data, error } = await supabase.functions.invoke("hint-answer", {
      body: {
        roleTitle: role.title,
        question: question.text,
        language,
        draft: text,
      },
    });
    setHinting(false);
    if (error || !data?.hint) {
      toast.error(data?.error || "Couldn't fetch a hint.");
      return;
    }
    setHint(data.hint);
  };

  const persistAnswer = (val: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleNext = () => {
    if (sr.listening) sr.stop();
    const next = [...answers];
    next[index] = isMCQ ? text : text.trim();
    setAnswers(next);

    if (index + 1 >= total) {
      clearInProgressQuiz();
      onComplete(questions, next);
    } else {
      setIndex(index + 1);
      setText(next[index + 1] ?? "");
      sr.reset(next[index + 1] ?? "");
    }
  };
  advanceRef.current = handleNext;

  const handleSkip = () => {
    persistAnswer("");
    if (sr.listening) sr.stop();
    if (index + 1 >= total) {
      clearInProgressQuiz();
      onComplete(questions, answers.map((a, i) => (i === index ? "" : a)));
    } else {
      setIndex(index + 1);
      setText(answers[index + 1] ?? "");
      sr.reset(answers[index + 1] ?? "");
    }
  };

  const handleExit = () => {
    // Keep progress saved so user can resume.
    onExit();
  };

  const handleQuitAndDiscard = () => {
    clearInProgressQuiz();
    onExit();
  };

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
            Your AI coach is preparing tailored {difficulty} questions for {role.title}.
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
        <div className="flex items-center gap-2">
          {resumed && (
            <span className="hidden rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent sm:inline">
              Resumed
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleExit} title="Exit (progress saved)">
            <X /> Save & Exit
          </Button>
          <Button variant="ghost" size="sm" onClick={handleQuitAndDiscard} className="hidden sm:inline-flex">
            Discard
          </Button>
        </div>
      </header>

      <div className="container">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="truncate">
            {role.title} · {LANGUAGES.find((l) => l.id === language)?.native} · {difficulty}
          </span>
          <span className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 tabular-nums transition-colors ${urgent ? "text-destructive" : ""}`}>
              <Clock className="h-3.5 w-3.5" />
              {mm}:{ss}
            </span>
            <span>
              Q {index + 1} <span className="text-foreground/40">/ {total}</span>
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
          <div className="flex items-center gap-3">
            <span className="font-display text-7xl font-semibold leading-none text-accent/30">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isMCQ ? "Multiple choice" : "Open answer"}
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-snug tracking-tight md:text-4xl text-balance">
            {question.text}
          </h1>

          {isMCQ ? (
            <div className="mt-8 space-y-3">
              {question.options.map((opt, i) => {
                const selected = text === String(i);
                return (
                  <button
                    key={i}
                    onClick={() => setText(String(i))}
                    className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent/5 shadow-coral"
                        : "border-border bg-card hover:border-foreground/20 hover:shadow-soft"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold transition-colors ${
                        selected
                          ? "bg-accent text-accent-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-base leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>
          ) : (
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={suggesting}
                    className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
                  >
                    {suggesting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Suggest answer
                  </button>
                  {!sr.supported && (
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Voice unsupported
                    </span>
                  )}
                  {text && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex items-center gap-1 transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md">
        <div className="container flex max-w-3xl items-center justify-between gap-3 py-4">
          {!isMCQ ? (
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
          ) : (
            <div className="h-14 w-14" />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="lg" onClick={handleSkip}>
              <SkipForward /> Skip
            </Button>
            <Button variant="ink" size="lg" onClick={handleNext}>
              {index + 1 >= total ? "Finish" : "Next"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
