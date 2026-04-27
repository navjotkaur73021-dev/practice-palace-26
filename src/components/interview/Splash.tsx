import { useEffect, useRef, useState } from "react";
import logoMark from "@/assets/omni-prep-logo.png";

type Props = { onDone: () => void; duration?: number };

export const Splash = ({ onDone, duration = 1600 }: Props) => {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const leaveAt = Math.max(400, duration - 400);
    const t1 = window.setTimeout(() => setLeaving(true), leaveAt);
    const t2 = window.setTimeout(() => onDone(), duration);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onDone]);

  return (
    <div
      role="status"
      aria-label="Loading Poise"
      aria-live="polite"
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
              fetchPriority="high"
              decoding="async"
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

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-foreground/10 sm:w-56"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
          Loading {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};
