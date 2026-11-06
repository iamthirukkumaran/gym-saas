"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "../ui";

/**
 * Scroll-reveal and counter primitives.
 *
 * Deliberately hand-rolled on IntersectionObserver rather than pulling in a
 * motion library: the marketing page needs about six effects, and shipping
 * 40KB of animation runtime to a gym owner on a patchy 4G connection would
 * undercut the thing the page is selling. The transitions themselves live in
 * globals.css, so the browser compositor does the work and
 * prefers-reduced-motion is honoured in one place.
 */

/** Fades and lifts its children into view once, on first intersection. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
  scale = false,
}: {
  children: ReactNode;
  /** Stagger, in milliseconds. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p" | "h2";
  scale?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Already in view on load (above the fold) — show immediately so the
    // hero never flashes empty.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const props = {
    ref: ref as never,
    className,
    style: { ["--reveal-delay" as string]: `${delay}ms` },
    ...(scale
      ? { "data-reveal-scale": shown ? "in" : "out", "data-reveal": shown ? "in" : "out" }
      : { "data-reveal": shown ? "in" : "out" }),
  };

  return <Tag {...props}>{children}</Tag>;
}

/** Counts up to `to` when scrolled into view. */
export function CountUp({
  to,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // easeOutExpo — fast then settles, which reads as "counting up".
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setValue(to * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={cn("nums tabular-nums", className)}>
      {prefix}
      {value.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Infinite horizontal ticker. Pauses on hover. */
export function Marquee({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  return (
    <div className={cn("marquee relative overflow-hidden", className)}>
      {/* Edge fades so items dissolve rather than clipping at the boundary */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-void to-transparent" />
      <div className="marquee-track" aria-hidden>
        {/* Duplicated so the -50% translate loops seamlessly */}
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex shrink-0 items-center px-6">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Thin reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setPct(max <= 0 ? 0 : Math.min(1, window.scrollY / max));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent">
      <div
        className="scroll-progress h-full bg-butter-300"
        style={{ transform: `scaleX(${pct})` }}
      />
    </div>
  );
}

/** Adds a solid background to the nav once the user scrolls past the hero. */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
