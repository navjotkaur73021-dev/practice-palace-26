import type { Difficulty, Language, QuestionFormat } from "./interviewData";

export type SetupSettings = {
  roleId: string;
  language: Language;
  count: number;
  difficulty: Difficulty;
  format: QuestionFormat;
  autoSkip: boolean;
};

const KEY = "poise:setup-settings";

export function loadSetupSettings(): Partial<SetupSettings> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSetupSettings(s: SetupSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/* ------- in-progress quiz persistence ------- */

export type InProgressQuiz = {
  roleId: string;
  roleTitle: string;
  roleBlurb: string;
  language: Language;
  difficulty: Difficulty;
  format: QuestionFormat;
  count: number;
  questions: QuizQuestion[];
  answers: string[];
  index: number;
  startedAt: number;
};

export type QuizQuestion =
  | { kind: "open"; text: string }
  | { kind: "mcq"; text: string; options: string[]; correctIndex: number };

const QUIZ_KEY = "poise:inprogress-quiz";

export function loadInProgressQuiz(): InProgressQuiz | null {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.questions)) return null;
    return parsed as InProgressQuiz;
  } catch {
    return null;
  }
}

export function saveInProgressQuiz(q: InProgressQuiz) {
  try {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function clearInProgressQuiz() {
  try {
    localStorage.removeItem(QUIZ_KEY);
  } catch {
    /* ignore */
  }
}
