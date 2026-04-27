import logoImg from "@/assets/omni-prep-logo.png";

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <img
      src={logoImg}
      alt="Poise app logo"
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
    />
    <span className="font-display text-xl font-semibold tracking-tight">
      Poise<span className="text-accent">.</span>
    </span>
  </div>
);
