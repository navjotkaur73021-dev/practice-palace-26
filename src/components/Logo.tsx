export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative h-8 w-8">
      <div className="absolute inset-0 rounded-full bg-gradient-warm shadow-coral" />
      <div className="absolute inset-[6px] rounded-full bg-background" />
      <div className="absolute inset-[10px] rounded-full bg-primary" />
    </div>
    <span className="font-display text-xl font-semibold tracking-tight">
      Poise<span className="text-accent">.</span>
    </span>
  </div>
);
