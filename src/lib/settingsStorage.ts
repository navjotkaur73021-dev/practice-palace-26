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
  v: number; // schema version — bump to invalidate stale caches
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
  updatedAt: number;
};

export type QuizQuestion =
  | { kind: "open"; text: string }
  | { kind: "mcq"; text: string; options: string[]; correctIndex: number };

const QUIZ_KEY = "poise:inprogress-quiz";
const QUIZ_SCHEMA_VERSION = 2;
// Auto-expire abandoned sessions after 24h so we never resume something stale.
const QUIZ_TTL_MS = 24 * 60 * 60 * 1000;

export function loadInProgressQuiz(): InProgressQuiz | null {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      parsed.v !== QUIZ_SCHEMA_VERSION ||
      !Array.isArray(parsed.questions)
    ) {
      // Old/incompatible cache — purge so the user starts fresh.
      localStorage.removeItem(QUIZ_KEY);
      return null;
    }
    const ts = typeof parsed.updatedAt === "number" ? parsed.updatedAt : parsed.startedAt;
    if (typeof ts !== "number" || Date.now() - ts > QUIZ_TTL_MS) {
      localStorage.removeItem(QUIZ_KEY);
      return null;
    }
    return parsed as InProgressQuiz;
  } catch {
    try {
      localStorage.removeItem(QUIZ_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function saveInProgressQuiz(q: Omit<InProgressQuiz, "v" | "updatedAt">) {
  try {
    const payload: InProgressQuiz = {
      ...q,
      v: QUIZ_SCHEMA_VERSION,
      updatedAt: Date.now(),
    };
    localStorage.setItem(QUIZ_KEY, JSON.stringify(payload));
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

export function hasResumableQuiz(): boolean {
  return loadInProgressQuiz() !== null;
}

