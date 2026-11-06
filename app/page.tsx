import Link from "next/link";
import type { Metadata } from "next";

import { Logo } from "@/components/logo";
import { ChatDemo } from "@/components/marketing/chat-demo";
import { Faq } from "@/components/marketing/faq";
import { FeatureTabs } from "@/components/marketing/feature-tabs";
import { CountUp, Marquee, Reveal } from "@/components/marketing/motion";
import { MarketingNav } from "@/components/marketing/nav";
import { PricingTable, type PlanCard } from "@/components/marketing/pricing";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconFile,
  IconRenew,
  IconSparkles,
  IconTrendUp,
  IconUsers,
  IconWhatsApp,
  IconZap,
} from "@/components/icons";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Astryx — gym software that chases renewals for you",
  description:
    "Your members don't quit, they forget to renew. Astryx tracks every membership and chases the renewal on WhatsApp automatically. Built for independent gyms in India still running on a register.",
};

async function getPlans(): Promise<PlanCard[]> {
  try {
    const rows = await db.saasPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((p) => ({
      key: p.key,
      name: p.name,
      tagline: p.tagline,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      features: JSON.parse(p.featuresJson) as string[],
    }));
  } catch {
    // The marketing page must render before `npm run db:reset` has been run.
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div className="grain relative min-h-dvh overflow-x-hidden bg-ink-950 text-white">
      <MarketingNav />

      {/* ══ Hero ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="grid-lines absolute inset-0" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-32 md:pb-32 md:pt-40">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] text-white/80 backdrop-blur">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-good-500 opacity-70" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-good-500" />
                  </span>
                  For gyms still running on a register and a WhatsApp group
                </span>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-7 text-[2.75rem] font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-[4.2rem]">
                  Your members
                  <br />
                  don&apos;t quit.
                  <br />
                  <span className="gradient-text">They forget to renew.</span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-white/60 md:text-lg">
                  Astryx keeps every member, plan and expiry date in one place — then
                  chases the renewal on WhatsApp before it lapses. No spreadsheets. No
                  forgotten follow-ups. No awkward &ldquo;sir, your membership is
                  over&rdquo; phone call three weeks too late.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="shine group inline-flex h-13 items-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-semibold text-ink-900 shadow-xl shadow-black/30 transition-transform hover:scale-[1.03]"
                  >
                    Open the live demo
                    <IconChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#calculator"
                    className="inline-flex h-13 items-center gap-2 rounded-xl border border-white/15 px-7 py-4 text-[15px] font-medium text-white/85 transition-colors hover:border-white/30 hover:bg-white/5"
                  >
                    What&apos;s it worth to me?
                  </a>
                </div>
              </Reveal>

              <Reveal delay={320}>
                <p className="mt-5 flex items-center gap-2 text-[13px] text-white/40">
                  <IconCheck className="size-3.5 text-good-500" strokeWidth={2.5} />
                  Real demo gym, fully loaded. No sign-up, no card.
                </p>
              </Reveal>

              <Reveal delay={400}>
                <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                  {[
                    { v: <><CountUp to={30} suffix="–50%" /></>, l: "of members lapse every year at a typical gym" },
                    { v: <CountUp to={98} suffix="%" />, l: "WhatsApp open rate, against ~20% for email" },
                    { v: <CountUp to={4} suffix=" hrs" />, l: "a week the front desk spends chasing renewals" },
                  ].map((s, i) => (
                    <div key={i}>
                      <dt className="text-xl font-semibold text-white md:text-2xl">{s.v}</dt>
                      <dd className="mt-1.5 text-[11.5px] leading-snug text-white/45">{s.l}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={200} scale>
              <ChatDemo />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ Marquee ════════════════════════════════════════════════════ */}
      <section className="border-y border-white/10 bg-ink-950 py-5">
        <Marquee
          items={[
            "Member expiry tracking",
            "WhatsApp renewal reminders",
            "Win-back campaigns",
            "Pending dues",
            "Attendance & inactivity alerts",
            "Enquiry pipeline",
            "Birthday wishes",
            "CSV import from your sheet",
            "Revenue & retention reports",
            "Multi-staff roles",
          ].map((t) => (
            <span
              key={t}
              className="flex items-center gap-2.5 whitespace-nowrap text-[13.5px] text-white/35"
            >
              <IconZap className="size-3.5 text-brand-400/70" />
              {t}
            </span>
          ))}
        />
      </section>

      {/* ══ Problem ════════════════════════════════════════════════════ */}
      <section id="problem" className="relative py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-400">
              Sound familiar?
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Most gyms don&apos;t have a sales problem.
              <br />
              <span className="text-white/45">They have a memory problem.</span>
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: <IconFile className="size-5" />,
                t: "The register is the only source of truth",
                b: "Names in a notebook, amounts on WhatsApp, expiry dates in your head. Nobody can answer “who expires this week?” without twenty minutes of flipping pages — so nobody asks.",
              },
              {
                icon: <IconRenew className="size-5" />,
                t: "Renewals depend on somebody remembering",
                b: "A member's plan ends on a Tuesday. Nobody notices until they stop showing up three weeks later. By then they've already joined the gym down the road.",
              },
              {
                icon: <IconAlert className="size-5" />,
                t: "Dues quietly become donations",
                b: "Half-payments are normal at a gym. Tracking them isn't. Money owed drifts past a month, then past two, and eventually gets silently written off.",
              },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 100}>
                <div className="lift group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 hover:border-white/20 hover:bg-white/[0.05]">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition-colors group-hover:bg-brand-500/25">
                    {c.icon}
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold text-white">{c.t}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/55">{c.b}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150}>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-white/[0.03] to-good-500/10 p-7 md:p-9">
              <p className="text-[16px] leading-relaxed text-white/80 md:text-lg">
                <strong className="font-semibold text-white">
                  Here&apos;s the part that stings.
                </strong>{" "}
                Almost none of that is members deciding they don&apos;t want to train. It&apos;s
                admin. It&apos;s a date nobody wrote down. The gym down the road isn&apos;t
                better than yours — it just called them first.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ ROI calculator ═════════════════════════════════════════════ */}
      <section id="calculator" className="relative py-24 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_0%,rgb(109_74_255_/_0.15),transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <Reveal>
            <div className="text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-400">
                Do the maths
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Work out your own number
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-white/55">
                Not ours. Yours. Three sliders, and you&apos;ll know whether this is worth
                a conversation.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120} scale>
            <div className="mt-12">
              <RoiCalculator />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Features ═══════════════════════════════════════════════════ */}
      <section id="features" className="border-t border-white/10 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-400">
                What you actually get
              </p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                Everything a small gym needs.
                <br />
                <span className="text-white/45">Nothing it doesn&apos;t.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-white/55">
                We left out class scheduling, the POS and the marketing suite you&apos;d
                never open. What&apos;s left is the part that makes money.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-16">
              <FeatureTabs />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ How it works ═══════════════════════════════════════════════ */}
      <section className="relative border-t border-white/10 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Four steps.
              <br />
              <span className="text-white/45">Then it runs without you.</span>
            </h2>
          </Reveal>

          <ol className="mt-16 grid gap-6 md:grid-cols-4">
            {[
              { n: "01", t: "Import your members", b: "Paste your sheet. Astryx maps the columns, parses your dates, flags duplicates — and shows you everything before saving.", icon: <IconUsers className="size-5" /> },
              { n: "02", t: "Set your plans", b: "1 month, 3 months, PT packages, joining fees. Expiry dates then calculate themselves, forever.", icon: <IconRenew className="size-5" /> },
              { n: "03", t: "Turn on automations", b: "Ten reminder templates arrive ready to use. Edit the words, not the logic. Preview exactly who gets what.", icon: <IconWhatsApp className="size-5" /> },
              { n: "04", t: "Watch renewals land", b: "Every message logged. The dashboard shows who's expiring, who's paid and who needs a human call.", icon: <IconTrendUp className="size-5" /> },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 110} as="li">
                <div className="lift group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-brand-400/30 hover:bg-white/[0.05]">
                  {/* connector line between steps on desktop */}
                  {i < 3 ? (
                    <span className="absolute -right-3 top-11 hidden h-px w-6 bg-gradient-to-r from-white/20 to-transparent md:block" />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition-colors group-hover:bg-brand-500/25">
                      {s.icon}
                    </span>
                    <span className="nums text-[13px] font-semibold text-white/20">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-[16px] font-semibold text-white">{s.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ Comparison ═════════════════════════════════════════════════ */}
      <section className="border-t border-white/10 py-24 md:py-28">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Compared with how you run things today
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-white/55">
                Most gyms we talk to aren&apos;t switching from other software. They&apos;re
                switching from a notebook.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-5 py-4 font-medium text-white/50">&nbsp;</th>
                    <th className="px-4 py-4 text-center font-medium text-white/50">Register</th>
                    <th className="px-4 py-4 text-center font-medium text-white/50">Spreadsheet</th>
                    <th className="px-4 py-4 text-center font-semibold text-white">Astryx</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Know who expires this week", false, "manual", true],
                    ["Reminders sent automatically", false, false, true],
                    ["Catch members who stop turning up", false, false, true],
                    ["Track part payments and dues", "manual", "manual", true],
                    ["Works from your phone at the desk", false, "manual", true],
                    ["Survives your front desk quitting", false, "manual", true],
                  ].map(([label, reg, sheet, astryx], i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3.5 text-white/75">{label as string}</td>
                      {[reg, sheet, astryx].map((v, j) => (
                        <td key={j} className="px-4 py-3.5 text-center">
                          {v === true ? (
                            <span className="inline-grid size-6 place-items-center rounded-full bg-good-500/15">
                              <IconCheck className="size-3.5 text-good-400" strokeWidth={3} />
                            </span>
                          ) : v === "manual" ? (
                            <span className="text-[11.5px] text-warn-400/80">by hand</span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Pricing ════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative border-t border-white/10 py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_26rem_at_50%_0%,rgb(0_196_140_/_0.1),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-good-400">
                Pricing
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Priced for a gym, not an enterprise
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15.5px] text-white/55">
                14-day free trial. No card needed. Cancel whenever — your data exports to
                CSV in one click.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-12">
              {plans.length > 0 ? (
                <PricingTable plans={plans} />
              ) : (
                <p className="text-center text-white/40">
                  Run <code className="font-mono">npm run db:reset</code> to load plans.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-10 text-center text-[13px] text-white/40">
              WhatsApp conversation charges from Meta are billed at cost and shown in your
              usage dashboard — we don&apos;t mark them up.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════ */}
      <section id="faq" className="border-t border-white/10 py-24 md:py-28">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal>
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Questions owners actually ask
              </h2>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12">
              <Faq />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Final CTA ══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="aurora opacity-40" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center md:py-36">
          <Reveal>
            <IconSparkles className="mx-auto size-9 text-brand-300" />
            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              How many members did you lose last month
              <span className="text-white/45"> without noticing?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/60">
              Find out in ten minutes. Import your list and Astryx will show you exactly
              who has already lapsed, and who is about to.
            </p>
            <Link
              href="/login"
              className="shine group mt-10 inline-flex h-14 items-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-ink-900 shadow-2xl shadow-black/40 transition-transform hover:scale-[1.03]"
            >
              Open the demo gym
              <IconChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="mt-5 text-[13px] text-white/35">
              Demo logins are on the sign-in page. Nothing to install.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ Footer ═════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/10 bg-ink-950">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <Logo variant="light" />
              <p className="mt-4 text-[13.5px] leading-relaxed text-white/45">
                Gym management that chases renewals for you. Built for independent gyms in
                India.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              {[
                { h: "Product", links: [["The problem", "#problem"], ["Features", "#features"], ["Pricing", "#pricing"], ["FAQ", "#faq"]] },
                { h: "Get started", links: [["Live demo", "/login"], ["Sign in", "/login"], ["What's it worth?", "#calculator"]] },
                { h: "Internal", links: [["Platform admin", "/admin/login"]] },
              ].map((col) => (
                <div key={col.h}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wider text-white/35">
                    {col.h}
                  </p>
                  <ul className="mt-3.5 space-y-2.5">
                    {col.links.map(([label, href]) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-[13.5px] text-white/60 transition-colors hover:text-white"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-7 text-[12.5px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Astryx. All rights reserved.</p>
            <p>Made for gyms that deserve better than a notebook.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
