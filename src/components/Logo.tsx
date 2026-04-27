import logoImg from "@/assets/omni-prep-logo.png";

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
    <img
      src={logoImg}
      alt="Poise app logo"
      width={32}
      height={32}
      loading="eager"
      decoding="async"
      className="h-7 w-7 object-contain sm:h-8 sm:w-8"
    />
    <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
      Poise<span className="text-accent">.</span>
    </span>
  </div>
);
