import { useEffect, useState } from "react";
import logoMark from "@/assets/omni-prep-logo.png";

type Props = { onDone: () => void; duration?: number };

export const Splash = ({ onDone, duration = 1600 }: Props) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveAt = Math.max(400, duration - 400);
    const t1 = window.setTimeout(() => setLeaving(true), leaveAt);
    const t2 = window.setTimeout(() => onDone(), duration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onDone]);

  return (
    <div
      role="status"
      aria-label="Loading Poise"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-cream px-6 transition-opacity duration-400 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="relative">
          <span className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-2xl" aria-hidden />
          <div className="flex items-center justify-center rounded-3xl bg-card p-5 shadow-lifted sm:p-6">
            <img
              src={logoMark}
              alt="Poise app logo"
              width={112}
              height={112}
              className="h-20 w-20 object-contain sm:h-24 sm:w-24 md:h-28 md:w-28"
            />
          </div>
        </div>

        <h1 className="mt-7 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Poise<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 max-w-xs text-balance text-sm text-muted-foreground sm:max-w-sm sm:text-base">
          Walk in calm. Walk out hired.
        </p>

        <div className="mt-8 flex items-center gap-1.5" aria-hidden>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};
