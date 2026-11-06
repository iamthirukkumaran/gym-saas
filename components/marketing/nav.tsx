"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "../ui";
import { Logo } from "../logo";
import { IconMenu, IconX } from "../icons";
import { ScrollProgress, useScrolled } from "./motion";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#calculator", label: "What it's worth" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const scrolled = useScrolled(32);
  const [open, setOpen] = useState(false);

  // Lock scroll behind the mobile menu, otherwise the page drifts underneath.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <ScrollProgress />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-white/10 bg-ink-950/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo variant="light" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-[13.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-[13.5px] font-semibold text-ink-900 transition-transform hover:scale-[1.03]"
            >
              Try the demo
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid size-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 md:hidden"
            >
              {open ? <IconX className="size-5" /> : <IconMenu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav className="flex h-full flex-col justify-center gap-2 px-8">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
              className={cn(
                "border-b border-white/10 py-4 text-2xl font-medium text-white/80 transition-all duration-300 hover:text-white",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-8 flex h-13 items-center justify-center rounded-xl bg-white py-4 text-base font-semibold text-ink-900"
          >
            Open the live demo
          </Link>
        </nav>
      </div>
    </>
  );
}
