"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "../ui";
import { IconMenu, IconUsers, IconX } from "../icons";
import { ScrollProgress, useScrolled } from "./motion";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#numbers", label: "Your numbers" },
  { href: "#inside", label: "Inside" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** Mark + wordmark, both quiet. Letterspaced caps for the name. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
        <path
          d="M4 18 12 5l8 13"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M8 14.2h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[0.14em] text-white">ASTRYX</span>
    </span>
  );
}

export function MarketingNav() {
  const scrolled = useScrolled(40);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Highlight the section currently in view, the way a well-made editorial
  // site keeps you oriented in a long scroll.
  useEffect(() => {
    const sections = LINKS.map((l) => document.querySelector(l.href)).filter(
      Boolean,
    ) as Element[];
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.5] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <ScrollProgress />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "bg-void/70 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="transition-opacity hover:opacity-70">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[14px] transition-colors",
                  active === l.href
                    ? "nav-pill text-white"
                    : "text-white/55 hover:text-white",
                )}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              aria-label="Sign in"
              className="grid size-10 place-items-center rounded-lg border border-white/12 text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              <IconUsers className="size-[18px]" />
            </Link>
            <Link
              href="/login"
              className="hidden rounded-lg bg-white px-5 py-2.5 text-[14px] font-medium text-void transition-opacity hover:opacity-85 sm:block"
            >
              Try it free
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-lg border border-white/12 text-white lg:hidden"
            >
              {open ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-void/95 backdrop-blur-xl transition-all duration-400 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav className="flex h-full flex-col justify-center px-7">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${70 + i * 50}ms` : "0ms" }}
              className={cn(
                "display display-md border-b border-white/8 py-5 text-white/85 transition-all duration-500 hover:text-butter-300",
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              )}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-10 rounded-lg bg-butter-300 py-4 text-center text-[15px] font-medium text-void"
          >
            Open the live demo
          </Link>
        </nav>
      </div>
    </>
  );
}

export { Wordmark };
