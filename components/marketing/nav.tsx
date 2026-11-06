"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "../ui";
import { IconMenu, IconX } from "../icons";
import { ScrollProgress, useScrolled } from "./motion";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#numbers", label: "Your numbers" },
  { href: "#inside", label: "Inside" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** Wordmark set in the display face, so the brand reads athletic everywhere. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("display text-2xl tracking-tight text-white", className)}>
      Astryx
      <span className="text-volt-300">.</span>
    </span>
  );
}

export function MarketingNav() {
  const scrolled = useScrolled(40);
  const [open, setOpen] = useState(false);

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
          scrolled ? "bg-void/85 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 md:px-10">
          <Link href="/" className="transition-opacity hover:opacity-70">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="label text-white/50 transition-colors hover:text-volt-300"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="label hidden text-white/60 transition-colors hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="label bg-volt-300 px-5 py-3.5 text-void transition-colors hover:bg-white"
            >
              Try it free
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid size-10 place-items-center text-white lg:hidden"
            >
              {open ? <IconX className="size-6" /> : <IconMenu className="size-6" />}
            </button>
          </div>
        </div>
        <div
          className={cn(
            "h-px origin-left bg-white/10 transition-transform duration-300",
            scrolled ? "scale-x-100" : "scale-x-0",
          )}
        />
      </header>

      {/* Full-bleed mobile menu with oversized type */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-void transition-all duration-400 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <nav className="flex h-full flex-col justify-center px-6">
          {LINKS.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${80 + i * 55}ms` : "0ms" }}
              className={cn(
                "display display-md border-b border-white/10 py-5 text-white transition-all duration-500 hover:text-volt-300",
                open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
              )}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="label mt-10 bg-volt-300 py-5 text-center text-void"
          >
            Open the live demo
          </Link>
        </nav>
      </div>
    </>
  );
}

export { Wordmark };
