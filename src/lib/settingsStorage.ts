import type { Language } from "./interviewData";

export type SetupSettings = {
  roleId: string;
  language: Language;
  count: number;
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
