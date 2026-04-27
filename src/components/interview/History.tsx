import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trash2,
  Download,
  FileText,
  History as HistoryIcon,
  Sparkles,
} from "lucide-react";
import {
  loadSessions,
  deleteSession,
  clearSessions,
  exportSessionMarkdown,
  downloadFile,
  type SavedSession,
} from "@/lib/sessionStorage";
import { toast } from "sonner";

type Props = {
  onBack: () => void;
};

export const History = ({ onBack }: Props) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const refresh = () => setSessions(loadSessions());

  const handleDelete = (id: string) => {
    deleteSession(id);
    if (openId === id) setOpenId(null);
    refresh();
    toast.success("Session deleted.");
  };

  const handleClearAll = () => {
    if (!confirm("Delete all saved sessions? This can't be undone.")) return;
    clearSessions();
    setOpenId(null);
    refresh();
    toast.success("History cleared.");
  };

  const exportOne = (s: SavedSession, format: "md" | "json") => {
    const stamp = new Date(s.createdAt).toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const base = `poise-${s.roleId}-${stamp}`;
    if (format === "md") {
      downloadFile(`${base}.md`, exportSessionMarkdown(s, { title: s.roleTitle }), "text/markdown");
    } else {
      downloadFile(`${base}.json`, JSON.stringify(s, null, 2), "application/json");
    }
  };

  const open = sessions.find((s) => s.id === openId);

  return (
    <div className="min-h-screen bg-gradient-cream">
      <header className="container flex items-center justify-between py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft /> Home
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl pb-24 pt-4">
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
              <HistoryIcon className="h-3.5 w-3.5" />
              Practice history
            </span>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl text-balance">
              Your past <span className="italic text-accent">sessions.</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Stored locally in your browser. {sessions.length} session{sessions.length === 1 ? "" : "s"} saved.
            </p>
          </div>
          {sessions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 /> Clear all
            </Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-muted-foreground">
              No sessions yet. Finish an interview to see it here.
            </p>
          </div>
        ) : (
          <ul className="mt-10 space-y-3">
            {sessions.map((s) => {
              const date = new Date(s.createdAt);
              const isOpen = openId === s.id;
              return (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : s.id)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex-1">
                      <div className="font-display text-lg font-semibold">{s.roleTitle}</div>
                      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {s.language === "hi" ? "Hindi" : "English"}
                        {" · "}
                        {s.questions.length} Qs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl font-semibold tabular-nums">
                        {s.overall}
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border bg-background/50 p-5">
                      <div className="mb-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => exportOne(s, "md")}>
                          <FileText /> Export MD
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportOne(s, "json")}>
                          <Download /> Export JSON
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                          <Trash2 /> Delete
                        </Button>
                      </div>
                      <ol className="space-y-4">
                        {s.questions.map((q, i) => {
                          const sc = s.scored[i];
                          return (
                            <li
                              key={i}
                              className="rounded-2xl border border-border bg-card p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Q{i + 1}
                                  </div>
                                  <div className="mt-1 font-medium leading-snug">{q}</div>
                                </div>
                                <div className="font-display text-lg font-semibold tabular-nums">
                                  {sc?.score ?? "—"}
                                </div>
                              </div>
                              {s.answers[i]?.trim() && (
                                <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm italic text-muted-foreground">
                                  "{s.answers[i].length > 220 ? s.answers[i].slice(0, 220) + "…" : s.answers[i]}"
                                </blockquote>
                              )}
                              {sc?.feedback && (
                                <p className="mt-3 text-sm">{sc.feedback}</p>
                              )}
                              {sc?.improved && (
                                <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                                    <Sparkles className="h-3 w-3" /> Stronger answer
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed">{sc.improved}</p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};
