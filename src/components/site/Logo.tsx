import { Link } from "react-router-dom";

type Props = { variant?: "default" | "light"; className?: string };

export const Logo = ({ variant = "default", className = "" }: Props) => {
  const isLight = variant === "light";
  return (
    <Link to="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-ember text-primary-foreground shadow-ember transition-transform duration-300 group-hover:rotate-[-6deg]`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17V8h11l4 4h3v5" />
          <circle cx="7.5" cy="17.5" r="2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="17.5" r="2" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${isLight ? "text-cream" : "text-foreground"}`}>
        TruckHub<span className="text-primary">.</span>
        <span className={`ml-1 text-sm font-medium ${isLight ? "text-cream/70" : "text-muted-foreground"}`}>Green Bay</span>
      </span>
    </Link>
  );
};
