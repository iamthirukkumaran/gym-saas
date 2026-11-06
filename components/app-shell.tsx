"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "./ui";
import { Logo } from "./logo";
import {
  IconChevronDown,
  IconLogout,
  IconMenu,
  IconPanelLeft,
  IconPin,
  IconX,
} from "./icons";
import type { NavItem, NavSection } from "./nav-config";

export type ShellCounts = {
  expiring?: number;
  dues?: number;
  followups?: number;
  failed?: number;
};

const PIN_KEY = "astryx:sidebar-pinned";

/** Rail width when collapsed, and full width when expanded. */
const RAIL = "3.75rem"; // 60px
const PANEL = "15rem"; // 240px

/**
 * The persistent chrome for both the gym app and the platform admin.
 *
 * The desktop sidebar is a collapsed icon rail that expands on hover or
 * keyboard focus, and can be pinned open. The expanded panel *overlays* the
 * content rather than pushing it, so the page never reflows under the
 * owner's cursor — reflow on hover is the thing that makes this pattern feel
 * broken when it's done wrong.
 *
 * Client-side only because of the drawer, hover state and active-route
 * highlighting; everything inside `children` stays server-rendered. Gym
 * owners check this on a phone at the front desk far more often than on a
 * laptop, so the mobile drawer is a first-class path, not an afterthought.
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
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Read the pin preference after mount: touching localStorage during render
  // would desync server and client HTML.
  useEffect(() => {
    try {
      setPinned(window.localStorage.getItem(PIN_KEY) === "1");
    } catch {
      /* private browsing blocks localStorage; the default is fine */
    }
  }, []);

  function togglePinned() {
    setPinned((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PIN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Navigating should always dismiss the drawer, otherwise it covers the page
  // the user just asked for.
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

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

  /** Expanded when pinned, hovered, or focused by keyboard navigation. */
  const expanded = pinned || hovered || focused;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function countFor(item: NavItem) {
    return item.badge ? counts[item.badge] : undefined;
  }

  const badgeTone = (badge: NavItem["badge"]) =>
    badge === "failed"
      ? "bg-bad-100 text-bad-700"
      : badge === "dues"
        ? "bg-warn-100 text-warn-700"
        : "bg-brand-100 text-brand-700";

  const dotTone = (badge: NavItem["badge"]) =>
    badge === "failed" ? "bg-bad-500" : badge === "dues" ? "bg-warn-500" : "bg-brand-500";

  /**
   * `showLabels` is passed explicitly rather than derived from CSS hover, so
   * the collapsed rail can centre its icons and swap count badges for dots
   * instead of clipping text mid-animation.
   */
  function renderNav(showLabels: boolean) {
    return (
      <nav className="thin-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {sections.map((section, si) => {
          const items = section.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={si} className={si > 0 ? "mt-5" : undefined}>
              {section.title ? (
                showLabels ? (
                  <p className="mb-1.5 truncate px-3 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
                    {section.title}
                  </p>
                ) : (
                  // A hairline stands in for the heading so the grouping is
                  // still legible on the rail.
                  <div className="mx-auto mb-2 h-px w-6 bg-ink-200" />
                )
              ) : null}

              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const count = countFor(item);
                  const hasCount = typeof count === "number" && count > 0;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={showLabels ? undefined : item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center rounded-lg py-2 text-[13.5px] font-medium transition-colors",
                          showLabels ? "gap-2.5 px-3" : "justify-center px-0",
                          active
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                        )}
                      >
                        {/* Active marker, visible in both states */}
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-600" />
                        ) : null}

                        <span
                          className={cn(
                            "relative grid shrink-0 place-items-center",
                            active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
                          )}
                        >
                          {item.icon}
                          {/* On the rail there's no room for a number, so an
                              unread dot carries the signal instead. */}
                          {!showLabels && hasCount ? (
                            <span
                              className={cn(
                                "absolute -right-1 -top-0.5 size-2 rounded-full ring-2 ring-white",
                                dotTone(item.badge),
                              )}
                            />
                          ) : null}
                        </span>

                        {showLabels ? (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {hasCount ? (
                              <span
                                className={cn(
                                  "nums rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                                  badgeTone(item.badge),
                                )}
                              >
                                {count > 99 ? "99+" : count}
                              </span>
                            ) : null}
                          </>
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
  }

  function renderFooter(showLabels: boolean) {
    return (
      <div className="border-t border-ink-200 p-2">
        <div
          className={cn(
            "flex items-center rounded-lg py-1.5",
            showLabels ? "gap-2.5 px-2" : "justify-center px-0",
          )}
        >
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700"
            title={showLabels ? undefined : `${userName} — ${userMeta}`}
          >
            {userName.slice(0, 2).toUpperCase()}
          </span>

          {showLabels ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      {/* ── Desktop sidebar: icon rail that expands on hover ─────────── */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
        aria-label="Main navigation"
        data-expanded={expanded ? "true" : "false"}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-ink-200 bg-white",
          "transition-[width,box-shadow] duration-200 ease-out lg:flex",
          // Only the floating (unpinned) panel casts a shadow — when pinned it
          // is part of the layout, not hovering above it.
          expanded && !pinned
            ? "shadow-[0_8px_40px_-4px_rgb(16_24_40_/_0.22)]"
            : "shadow-none",
        )}
        style={{ width: expanded ? PANEL : RAIL }}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-ink-200",
            expanded ? "justify-between px-4" : "justify-center px-0",
          )}
        >
          <Link href={brandHref} aria-label="Astryx home">
            <Logo markOnly={!expanded} />
          </Link>

          {expanded ? (
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              title={pinned ? "Unpin sidebar (collapse to icons)" : "Keep sidebar open"}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                pinned
                  ? "bg-brand-50 text-brand-600"
                  : "text-ink-400 hover:bg-ink-100 hover:text-ink-700",
              )}
            >
              {pinned ? <IconPin className="size-4" /> : <IconPanelLeft className="size-4" />}
            </button>
          ) : null}
        </div>

        {renderNav(expanded)}
        {renderFooter(expanded)}
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
          <aside
            aria-label="Main navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-200 bg-white lg:hidden"
          >
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
            {renderNav(true)}
            {renderFooter(true)}
          </aside>
        </>
      ) : null}

      {/* ── Main ────────────────────────────────────────────────────── */}
      {/* Left padding tracks the *pinned* width only, never the hovered
          width — so hovering the rail never reflows the page. Applied at the
          lg breakpoint so mobile keeps the full viewport. */}
      <div
        className="transition-[padding] duration-200 ease-out lg:[padding-left:var(--sidebar-pad)]"
        style={{ ["--sidebar-pad" as string]: pinned ? PANEL : RAIL }}
      >
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
