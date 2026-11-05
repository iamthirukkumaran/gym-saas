import { cn } from "./ui";

/**
 * The Astryx mark: an "A" built from a rising bar chart — growth, which is
 * what the product actually sells, rather than a dumbbell like every
 * competitor.
 */
export function Logo({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill="url(#astryx-mark)" />
        <path
          d="M9 22.5 16 9l7 13.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M12.4 18.2h7.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="astryx-mark" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#8f75ff" />
            <stop offset="1" stopColor="#5a32f0" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className={cn(
          "text-[17px] font-semibold tracking-tight",
          variant === "dark" ? "text-ink-900" : "text-white",
        )}
      >
        Astryx
      </span>
    </span>
  );
}
