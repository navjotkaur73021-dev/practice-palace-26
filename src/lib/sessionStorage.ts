import type { Language, Role } from "./interviewData";

export type SavedScored = {
  score: number;
  feedback: string;
  improved: string;
} | null;

export type SavedSession = {
  id: string;
  createdAt: number;
  roleId: string;
  roleTitle: string;
  language: Language;
  questions: string[];
  answers: string[];
  scored: SavedScored[];
  overall: number;
};

const KEY = "poise.sessions.v1";
const MAX = 25;

export function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(s: Omit<SavedSession, "id" | "createdAt">): SavedSession {
  const session: SavedSession = {
    ...s,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const all = [session, ...loadSessions()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(all));
  return session;
}

export function updateSession(id: string, patch: Partial<SavedSession>) {
  const all = loadSessions().map((s) => (s.id === id ? { ...s, ...patch } : s));
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteSession(id: string) {
  const all = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearSessions() {
  localStorage.removeItem(KEY);
}

export function exportSessionMarkdown(s: SavedSession, role: Pick<Role, "title">): string {
  const date = new Date(s.createdAt).toLocaleString();
  const lines: string[] = [];
  lines.push(`# Poise Interview Session`);
  lines.push("");
  lines.push(`- **Role:** ${role.title}`);
  lines.push(`- **Language:** ${s.language === "hi" ? "Hindi" : "English"}`);
  lines.push(`- **Date:** ${date}`);
  lines.push(`- **Overall score:** ${s.overall}/100`);
  lines.push("");
  s.questions.forEach((q, i) => {
    const sc = s.scored[i];
    lines.push(`## Question ${i + 1}`);
    lines.push("");
    lines.push(`**${q}**`);
    lines.push("");
    lines.push(`**Your answer:**`);
    lines.push("");
    lines.push(s.answers[i]?.trim() ? s.answers[i] : "_(no answer)_");
    lines.push("");
    if (sc) {
      lines.push(`**Score:** ${sc.score}/100`);
      lines.push("");
      lines.push(`**Coach feedback:** ${sc.feedback}`);
      lines.push("");
      if (sc.improved) {
        lines.push(`**Stronger answer:**`);
        lines.push("");
        lines.push(sc.improved);
        lines.push("");
      }
    } else {
      lines.push(`_Not scored._`);
      lines.push("");
    }
  });
  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
