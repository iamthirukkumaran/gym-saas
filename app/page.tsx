import Link from "next/link";

import { Logo } from "@/components/logo";
import {
  IconCheck,
  IconChevronRight,
  IconRenew,
  IconSparkles,
  IconTrendUp,
  IconUsers,
  IconWhatsApp,
  IconZap,
} from "@/components/icons";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Marketing page.
 *
 * Leads with the owner's actual problem — members lapsing quietly — rather
 * than a feature list, because that is what a gym owner recognises in two
 * seconds while scrolling on a phone between sets.
 */

async function getPlans() {
  try {
    return await db.saasPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    // Landing page must render even before `npm run db:reset` has been run.
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div className="surface-dark min-h-dvh">
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo variant="light" />
          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#problem" className="transition-colors hover:text-white">The problem</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="grid-lines relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rise">
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] text-white/85">
                <IconZap className="size-3.5 text-good-500" />
                Built for independent gyms in India
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-white md:text-6xl">
                Your members don&apos;t quit.
                <br />
                <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-good-500 bg-clip-text text-transparent">
                  They just forget to renew.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Astryx keeps every member, plan and expiry date in one place — then
                chases the renewal on WhatsApp before the plan lapses. No
                spreadsheets. No forgotten follow-ups. No awkward &ldquo;sir, your
                membership is over&rdquo; phone calls.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-ink-900 shadow-lg shadow-black/20 transition-transform hover:scale-[1.02]"
                >
                  See the live demo
                  <IconChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-6 font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  How it works
                </a>
              </div>

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7">
                {[
                  { k: "~30–50%", v: "of members lapse every year at a typical gym" },
                  { k: "98%", v: "WhatsApp open rate vs ~20% for email" },
                  { k: "4 hrs", v: "a week the front desk spends chasing renewals" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="nums text-xl font-semibold text-white">{s.k}</dt>
                    <dd className="mt-1 text-[12px] leading-snug text-white/55">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* WhatsApp conversation mock — the product's whole promise, shown */}
            <div className="rise">
              <PhoneMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────────────────── */}
      <section id="problem" className="border-t border-white/10 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-brand-600">
            Sound familiar?
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
            Most gyms don&apos;t have a sales problem. They have a memory problem.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                t: "The register is the source of truth",
                b: "Names in a notebook, amounts on WhatsApp, expiry dates in your head. Nobody can answer “who expires this week?” without 20 minutes of flipping pages.",
              },
              {
                t: "Renewals depend on someone remembering",
                b: "A member's plan ends on a Tuesday. Nobody notices until they stop showing up three weeks later — by then they've joined the gym down the road.",
              },
              {
                t: "Dues quietly become donations",
                b: "Half-payments are normal. Tracking them isn't. Money owed drifts past a month and gets silently written off.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-ink-200 bg-ink-50/60 p-6 transition-shadow hover:shadow-lift"
              >
                <h3 className="text-[15px] font-semibold text-ink-900">{c.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{c.b}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50 p-6 md:p-8">
            <p className="text-[15px] leading-relaxed text-ink-800">
              <strong className="font-semibold">The maths that matters.</strong> A gym
              with 200 members at ₹1,500/month that recovers just 8 lapsed members a
              month is {money(8 * 150_000)} of recovered revenue every month — roughly{" "}
              {money(8 * 150_000 * 12)} a year. That is the entire reason Astryx exists,
              and it costs a fraction of one recovered member.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how" className="bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
            Four steps. Then it runs without you.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-ink-600">
            Set it up once in an afternoon. After that the only thing you do is add new
            members.
          </p>

          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              {
                n: "01",
                t: "Import your members",
                b: "Paste or upload your existing spreadsheet. Astryx maps the columns and flags duplicates before anything is saved.",
                icon: <IconUsers className="size-5" />,
              },
              {
                n: "02",
                t: "Set your plans",
                b: "1 month, 3 months, PT packages — with prices and joining fees. Expiry dates then calculate themselves.",
                icon: <IconRenew className="size-5" />,
              },
              {
                n: "03",
                t: "Turn on automations",
                b: "Ten reminder templates ship ready to use: 7/3/1 days before expiry, win-backs, dues, birthdays. Edit the words, not the logic.",
                icon: <IconWhatsApp className="size-5" />,
              },
              {
                n: "04",
                t: "Watch renewals arrive",
                b: "Every message is logged. The dashboard shows who's expiring, who's paid, and who needs a human call.",
                icon: <IconTrendUp className="size-5" />,
              },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    {s.icon}
                  </span>
                  <span className="nums text-xs font-semibold text-ink-300">{s.n}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
            Everything a small gym needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-ink-600">
            We left out class scheduling, POS and the marketing suite you&apos;d never
            open. What&apos;s left is the part that makes money.
          </p>

          <div className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {[
              {
                t: "Member records that stay current",
                b: "Photo, phone, plan, join date, expiry, dues, attendance and full payment history on one screen.",
              },
              {
                t: "Expiry tracking that's always right",
                b: "Status is derived from today's date, not a stale column. Renewals stack, so paid-for days are never lost.",
              },
              {
                t: "The full automation library",
                b: "Before-expiry, on-expiry, win-back, welcome, birthday, pending-dues and inactivity — all editable, all logged.",
              },
              {
                t: "Quiet hours and opt-outs",
                b: "No 2 AM messages, and a member who opts out is never contacted again. This is how you keep a number un-blocked.",
              },
              {
                t: "Dues and collection tracking",
                b: "Part payments, payment modes, auto-numbered invoices, and a pending-dues list the front desk can work through.",
              },
              {
                t: "Attendance that predicts churn",
                b: "A member who stops checking in is leaving weeks before their plan expires. Astryx flags them while you can still act.",
              },
              {
                t: "Enquiry pipeline",
                b: "Walk-ins and Instagram DMs tracked to won or lost, with WhatsApp follow-ups and a reason for every loss.",
              },
              {
                t: "Revenue and retention reports",
                b: "Monthly collections, renewal rate, plan mix and churn — the four numbers that tell you if the gym is growing.",
              },
              {
                t: "Bring your own WhatsApp",
                b: "Start on our sandbox, then connect Meta Cloud API, AiSensy, Wati or Interakt. One setting, no migration.",
              },
            ].map((f) => (
              <div key={f.t}>
                <h3 className="flex items-start gap-2 text-[15px] font-semibold text-ink-900">
                  <IconCheck className="mt-0.5 size-4 shrink-0 text-good-600" />
                  {f.t}
                </h3>
                <p className="mt-1.5 pl-6 text-[13px] leading-relaxed text-ink-600">{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
              Priced for a gym, not an enterprise
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-600">
              14-day free trial. No card needed. Cancel whenever — your data exports to
              CSV in one click.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.length === 0
              ? null
              : plans.map((p) => {
                  const features = JSON.parse(p.featuresJson) as string[];
                  const featured = p.key === "growth";
                  return (
                    <div
                      key={p.id}
                      className={
                        featured
                          ? "relative rounded-2xl border-2 border-brand-500 bg-white p-7 shadow-pop"
                          : "rounded-2xl border border-ink-200 bg-white p-7 shadow-card"
                      }
                    >
                      {featured ? (
                        <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Most popular
                        </span>
                      ) : null}
                      <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
                      <p className="mt-1 min-h-10 text-[13px] text-ink-500">{p.tagline}</p>
                      <p className="mt-5 flex items-baseline gap-1">
                        <span className="nums text-4xl font-semibold tracking-tight text-ink-900">
                          {money(p.priceMonthly)}
                        </span>
                        <span className="text-sm text-ink-500">/month</span>
                      </p>
                      <p className="nums mt-1 text-[12px] text-ink-500">
                        or {money(p.priceYearly)}/year — two months free
                      </p>
                      <Link
                        href="/login"
                        className={
                          featured
                            ? "mt-6 flex h-11 items-center justify-center rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700"
                            : "mt-6 flex h-11 items-center justify-center rounded-xl border border-ink-300 font-semibold text-ink-800 transition-colors hover:bg-ink-50"
                        }
                      >
                        Start 14-day trial
                      </Link>
                      <ul className="mt-6 space-y-2.5 border-t border-ink-100 pt-6">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[13px] text-ink-700">
                            <IconCheck className="mt-0.5 size-3.5 shrink-0 text-good-600" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
          </div>

          <p className="mt-8 text-center text-[13px] text-ink-500">
            WhatsApp conversation charges from Meta are billed at cost and shown in your
            usage dashboard — we don&apos;t mark them up.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="surface-dark border-t border-white/10">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <IconSparkles className="mx-auto size-8 text-brand-300" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            How many members did you lose last month without noticing?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
            Find out in ten minutes. Import your list, and Astryx will show you exactly
            who has already lapsed and who is about to.
          </p>
          <Link
            href="/login"
            className="mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 font-semibold text-ink-900 shadow-lg shadow-black/25 transition-transform hover:scale-[1.02]"
          >
            Open the demo gym
            <IconChevronRight className="size-4" />
          </Link>
          <p className="mt-4 text-[13px] text-white/45">
            Demo logins are on the sign-in page — no sign-up required.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-ink-950 py-9">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-[13px] text-white/45 sm:flex-row">
          <Logo variant="light" />
          <p>Astryx — gym management that chases renewals for you.</p>
          <Link href="/admin/login" className="transition-colors hover:text-white/80">
            Platform admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Static mock of the renewal conversation. The product demo, in one image. */
function PhoneMock() {
  const messages = [
    {
      from: "gym" as const,
      time: "10:00",
      body: (
        <>
          Hi Rahul! 👋
          <br />
          <br />
          Your <b>3 Month Gym + Cardio</b> at Iron Core Fitness expires on{" "}
          <b>28 Nov 2026</b> — that&apos;s 7 days away.
          <br />
          <br />
          Renew now and keep your streak going:
          <br />
          <span className="text-info-600 underline">astryx.app/r/mbr-0042</span>
        </>
      ),
    },
    { from: "member" as const, time: "10:04", body: <>Done bhai, paid via UPI ✅</> },
    {
      from: "gym" as const,
      time: "10:04",
      body: (
        <>
          Payment received ✅
          <br />
          Valid till <b>26 Feb 2027</b>. See you at the gym! 💪
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-[2.2rem] border border-white/15 bg-ink-900 p-2.5 shadow-2xl shadow-black/50">
        <div className="overflow-hidden rounded-[1.8rem] bg-white">
          {/* chat header */}
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-semibold text-white">
              IC
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Iron Core Fitness</p>
              <p className="text-[11px] text-white/70">business account</p>
            </div>
          </div>

          <div className="wa-wallpaper space-y-2.5 px-3 py-4">
            {messages.map((m, i) =>
              m.from === "gym" ? (
                <div key={i} className="flex justify-end pr-2">
                  <div className="wa-bubble max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed text-ink-900">
                    {m.body}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-500">
                      {m.time}
                      <IconCheck className="size-3 text-info-500" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-white px-3 py-2 text-[12.5px] leading-relaxed text-ink-900 shadow-sm">
                    {m.body}
                    <div className="mt-1 text-right text-[10px] text-ink-500">{m.time}</div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-white/45">
        Sent automatically, 7 days before expiry, at 10:00 AM IST.
      </p>
    </div>
  );
}
