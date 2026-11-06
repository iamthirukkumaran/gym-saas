"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "../ui";
import {
  IconAlert,
  IconCalendarCheck,
  IconCheck,
  IconRenew,
  IconTrendDown,
  IconUsers,
  IconWallet,
  IconWhatsApp,
  IconZap,
} from "../icons";

type Tab = {
  key: string;
  label: string;
  icon: React.ReactNode;
  headline: string;
  body: string;
  points: string[];
  visual: React.ReactNode;
};

/**
 * Feature showcase.
 *
 * Each tab renders a small, honest mock of the real screen rather than a
 * stock illustration — the point is for an owner to recognise their own
 * problem in it. Auto-advances until the visitor interacts, then stops: an
 * auto-rotating carousel that fights the user is worse than no rotation.
 */
export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % TABS.length), 5200);
    return () => clearTimeout(t);
  }, [active, paused, inView]);

  const tab = TABS[active];

  return (
    <div ref={containerRef} onMouseEnter={() => setPaused(true)}>
      {/* Tab strip */}
      <div className="thin-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            aria-pressed={i === active}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-[13.5px] font-medium transition-all",
              i === active
                ? "border-butter-300 bg-butter-300 text-void"
                : "border-white/15 text-white/45 hover:border-white/35 hover:text-white/80",
            )}
          >
            <span className={i === active ? "text-void" : "text-white/35"}>{t.icon}</span>
            {t.label}
            {/* Progress bar on the active tab, only while auto-advancing */}
            {i === active && !paused && inView ? (
              <span className="absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded-full bg-void/20">
                <span
                  key={active}
                  className="block h-full bg-void"
                  style={{ animation: "marquee-scroll 5.2s linear", width: "200%" }}
                />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div key={`copy-${active}`} className="bubble-in">
          <h3 className="display display-md text-white">{tab.headline}</h3>
          <p className="mt-5 text-[16px] leading-relaxed text-white/55">{tab.body}</p>
          <ul className="mt-7 space-y-3">
            {tab.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[14.5px] text-white/75">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center bg-butter-300/15">
                  <IconCheck className="size-3 text-butter-300" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div key={`visual-${active}`} className="bubble-in">
          {tab.visual}
        </div>
      </div>
    </div>
  );
}

// ── Mock visuals ────────────────────────────────────────────────────────────

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-void-soft shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-bad-500/60" />
        <span className="size-2.5 rounded-full bg-warn-500/60" />
        <span className="size-2.5 rounded-full bg-good-500/60" />
        <span className="ml-2 text-[11.5px] text-white/40">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MemberRow({
  name,
  plan,
  expiry,
  tone,
  note,
}: {
  name: string;
  plan: string;
  expiry: string;
  tone: "bad" | "warn" | "good";
  note?: string;
}) {
  const tones = {
    bad: "text-bad-400 bg-bad-500/10",
    warn: "text-warn-400 bg-warn-500/10",
    good: "text-good-400 bg-good-500/10",
  };
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/90">{name}</p>
        <p className="truncate text-[11px] text-white/40">{plan}</p>
      </div>
      <div className="text-right">
        <span
          className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", tones[tone])}
        >
          {expiry}
        </span>
        {note ? <p className="mt-0.5 text-[10px] text-white/35">{note}</p> : null}
      </div>
    </div>
  );
}

const TABS: Tab[] = [
  {
    key: "expiry",
    label: "Expiry tracking",
    icon: <IconRenew className="size-4" />,
    headline: "Always know who's about to lapse",
    body: "Every member's expiry date is live, not a cell in a spreadsheet someone forgot to update. Astryx works out who's active, who's expiring this week and who's already gone — recalculated against today's date, every time you open it.",
    points: [
      "Status is computed, never stale",
      "Renewing early stacks days instead of losing them",
      "Freeze a membership and the paid days come back",
    ],
    visual: (
      <Panel title="Renewals — next 7 days">
        <MemberRow name="Sneha Verma" plan="6 Months" expiry="today" tone="bad" />
        <MemberRow name="Vikram Khan" plan="1 Month" expiry="tomorrow" tone="bad" />
        <MemberRow name="Ananya Shetty" plan="12 Months" expiry="in 2 days" tone="warn" />
        <MemberRow name="Karthik Patel" plan="6 Months" expiry="in 4 days" tone="warn" />
        <MemberRow name="Divya Joshi" plan="3 Months" expiry="in 6 days" tone="warn" note="₹2,800 due" />
      </Panel>
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp automation",
    icon: <IconWhatsApp className="size-4" />,
    headline: "The follow-up happens without you",
    body: "Ten automations ship switched on: reminders at 7, 3 and 1 days before expiry, on the day, win-backs after, a welcome message, birthdays, pending dues and inactivity. You edit the wording. You never build the logic.",
    points: [
      "Quiet hours enforced by the engine, not the interface",
      "One message per member per cycle — never a double-send",
      "Opt-out removes them from everything, permanently",
    ],
    visual: (
      <Panel title="Automations">
        {[
          { n: "Renewal reminder — 7 days before", m: "6 queued", on: true },
          { n: "Renewal reminder — 3 days before", m: "6 queued", on: true },
          { n: "Expires today", m: "4 queued", on: true },
          { n: "Win-back — 3 days after", m: "2 queued", on: true },
          { n: "We haven't seen you", m: "9 queued", on: true },
        ].map((r) => (
          <div key={r.n} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-good-500/15 text-good-400">
              <IconZap className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-white/85">{r.n}</p>
              <p className="text-[10.5px] text-white/35">{r.m}</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-good-500/10 px-2 py-0.5 text-[10.5px] font-medium text-good-400">
              <span className="size-1.5 rounded-full bg-good-500" />
              on
            </span>
          </div>
        ))}
      </Panel>
    ),
  },
  {
    key: "inactivity",
    label: "Churn signals",
    icon: <IconTrendDown className="size-4" />,
    headline: "Catch them leaving, not after they've left",
    body: "A member who stops turning up has already decided — they just haven't told you. Astryx flags paid-up members who've gone quiet, weeks before their plan runs out, while a phone call still works.",
    points: [
      "Flags active members with no check-in for 14+ days",
      "An automation nudges them without you noticing first",
      "This is the churn that expiry reminders never catch",
    ],
    visual: (
      <Panel title="At risk — paid up but not showing up">
        <MemberRow name="Manoj Rao" plan="12 Months · valid 94 days" expiry="21 days" tone="bad" note="last visit" />
        <MemberRow name="Pooja Desai" plan="6 Months · valid 51 days" expiry="18 days" tone="bad" note="last visit" />
        <MemberRow name="Nikhil Bose" plan="3 Months · valid 40 days" expiry="16 days" tone="warn" note="last visit" />
        <MemberRow name="Swati Menon" plan="6 Months · valid 77 days" expiry="15 days" tone="warn" note="last visit" />
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-warn-500/10 p-2.5 text-[11.5px] text-warn-300">
          <IconAlert className="mt-0.5 size-3.5 shrink-0" />
          These four are paid up. Nothing in a renewal report would show them.
        </div>
      </Panel>
    ),
  },
  {
    key: "money",
    label: "Money",
    icon: <IconWallet className="size-4" />,
    headline: "Dues stop quietly becoming donations",
    body: "Part payments are normal at a gym. Tracking them isn't. Astryx keeps the balance on every member, chases it on WhatsApp, and gives your accountant a clean CSV at the end of the month.",
    points: [
      "Part payments, UPI, cash, card and bank all tracked",
      "Auto-numbered invoices, exported in one click",
      "Collections and renewal rate in plain numbers",
    ],
    visual: (
      <Panel title="Pending dues">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11.5px] text-white/40">15 members owe you</span>
          <span className="nums text-2xl font-semibold text-warn-400">₹45,200</span>
        </div>
        <MemberRow name="Divya Joshi" plan="3 Months" expiry="₹2,800" tone="warn" />
        <MemberRow name="Faisal Khan" plan="6 Months" expiry="₹4,500" tone="warn" />
        <MemberRow name="Ritu Sharma" plan="12 Months" expiry="₹6,000" tone="warn" />
        <MemberRow name="Akash Gupta" plan="1 Month" expiry="₹900" tone="warn" />
      </Panel>
    ),
  },
  {
    key: "desk",
    label: "Front desk",
    icon: <IconCalendarCheck className="size-4" />,
    headline: "Fast enough to use with someone waiting",
    body: "Type a member number, a phone or a name — Astryx finds them and checks them in. If their plan has expired it says so immediately, which is the single best moment to ask for a renewal.",
    points: [
      "Type 42 and it finds MBR-0042",
      "Expired members flagged at the desk, in the moment",
      "Front desk role can't reach settings or billing",
    ],
    visual: (
      <Panel title="Quick check-in">
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-white/80">
            42
          </div>
          <div className="grid place-items-center rounded-lg bg-brand-500 px-4 text-[13px] font-medium text-white">
            Check in
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-warn-500/10 p-3 text-[12.5px] text-warn-300">
          Priya Gupta (MBR-0042) checked in — ⚠ their membership has EXPIRED. Ask them
          to renew.
        </div>
        <div className="mt-4 space-y-0">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/30">
            Today · 18 check-ins
          </p>
          <MemberRow name="Rahul Sharma" plan="Personal Training" expiry="7:04 AM" tone="good" />
          <MemberRow name="Ananya Shetty" plan="12 Months" expiry="7:21 AM" tone="good" />
          <MemberRow name="Imran Khan" plan="3 Months" expiry="8:02 AM" tone="good" />
        </div>
      </Panel>
    ),
  },
  {
    key: "import",
    label: "Getting started",
    icon: <IconUsers className="size-4" />,
    headline: "Off the spreadsheet in one afternoon",
    body: "Paste your sheet in. Astryx figures out which column is the name, the phone, the joining date and the expiry — then shows you exactly what it will create, row by row, before anything is saved.",
    points: [
      "Reads dd/mm/yyyy, ₹1,500 /- and 'Valid Till' columns",
      "Rebuilds memberships, so reminders work the same day",
      "Flags duplicates instead of creating them twice",
    ],
    visual: (
      <Panel title="Import — review before saving">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["name ← Member Name", "phone ← Mobile No.", "expiry ← Valid Till", "amount ← Fees Paid"].map(
            (m) => (
              <span
                key={m}
                className="rounded-md border border-good-500/25 bg-good-500/10 px-2 py-0.5 text-[10.5px] text-good-400"
              >
                {m}
              </span>
            ),
          )}
        </div>
        {[
          { n: "Rahul Verma", d: "12/03/2026 → 28/11/2026", ok: true },
          { n: "Priya Nair", d: "05/01/2026 → 04/07/2026", ok: true },
          { n: "Imran Khan", d: "05/04/26 → 05/10/26", ok: true },
          { n: "(blank)", d: "no phone number", ok: false },
        ].map((r) => (
          <div key={r.n} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                r.ok ? "bg-good-500/15 text-good-400" : "bg-warn-500/15 text-warn-400",
              )}
            >
              {r.ok ? <IconCheck className="size-3" strokeWidth={3} /> : <IconAlert className="size-3" />}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">{r.n}</span>
            <span className="shrink-0 text-[11px] text-white/40">{r.d}</span>
          </div>
        ))}
        <p className="mt-3 text-[11px] text-white/35">
          3 rows ready · 1 will be skipped. Nothing saved yet.
        </p>
      </Panel>
    ),
  },
];
