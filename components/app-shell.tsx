"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "./ui";
import { Logo } from "./logo";
import { IconChevronDown, IconLogout, IconMenu, IconX } from "./icons";
import type { NavSection } from "./nav-config";

export type ShellCounts = {
  expiring?: number;
  dues?: number;
  followups?: number;
  failed?: number;
};

/**
 * The persistent chrome for both the gym app and the platform admin.
 *
 * Client-side only because of the mobile drawer and active-route
 * highlighting; everything inside `children` stays server-rendered. Gym
 * owners check this on a phone at the front desk far more than on a laptop,
 * so the mobile drawer is a first-class path, not an afterthought.
 */
export function AppShell({
  sections,
  counts,
  role,
  brandHref,
  title,
  subtitle,
  badge,
  userName,
  userMeta,
  logoutAction,
  banner,
  children,
}: {
  sections: NavSection[];
  counts: ShellCounts;
  role: string;
  brandHref: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  userName: string;
  userMeta: string;
  logoutAction: () => Promise<void>;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating should always dismiss the drawer, otherwise it covers the page
  // the user just asked for.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes whatever is open — expected on desktop, cheap to support.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section, si) => {
        const items = section.items.filter((i) => !i.roles || i.roles.includes(role));
        if (items.length === 0) return null;
        return (
          <div key={si}>
            {section.title ? (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                {section.title}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item.href, item.exact);
                const count = item.badge ? counts[item.badge] : undefined;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {count && count > 0 ? (
                        <span
                          className={cn(
                            "nums rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                            item.badge === "failed"
                              ? "bg-bad-100 text-bad-700"
                              : item.badge === "dues"
                                ? "bg-warn-100 text-warn-700"
                                : "bg-brand-100 text-brand-700",
                          )}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="border-t border-ink-200 p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
          {userName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink-900">{userName}</p>
          <p className="truncate text-[11px] text-ink-500">{userMeta}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
          >
            <IconLogout className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-50">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-ink-200 px-5">
          <Link href={brandHref}>
            <Logo />
          </Link>
        </div>
        {nav}
        {sidebarFooter}
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-ink-950/40 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-200 bg-white lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-ink-200 px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
              >
                <IconX className="size-5" />
              </button>
            </div>
            {nav}
            {sidebarFooter}
          </aside>
        </>
      ) : null}

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/85 backdrop-blur-lg">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden"
            >
              <IconMenu className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold text-ink-900">{title}</h1>
                {badge}
              </div>
              {subtitle ? (
                <p className="truncate text-[12px] text-ink-500">{subtitle}</p>
              ) : null}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-700 transition-colors hover:bg-ink-100"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-[10.5px] font-semibold text-brand-700">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate sm:block">{userName}</span>
                <IconChevronDown className="size-3.5 text-ink-400" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop">
                  <div className="border-b border-ink-100 px-3 py-2">
                    <p className="truncate text-[13px] font-medium text-ink-900">{userName}</p>
                    <p className="truncate text-[11.5px] text-ink-500">{userMeta}</p>
                  </div>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-ink-700 transition-colors hover:bg-bad-50 hover:text-bad-700"
                    >
                      <IconLogout className="size-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {banner}

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
