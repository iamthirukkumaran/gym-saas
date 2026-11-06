import Link from "next/link";
import type { Metadata } from "next";

import { ChatDemo } from "@/components/marketing/chat-demo";
import { Faq } from "@/components/marketing/faq";
import { FeatureTabs } from "@/components/marketing/feature-tabs";
import { CountUp, Marquee, Reveal } from "@/components/marketing/motion";
import { MarketingNav, Wordmark } from "@/components/marketing/nav";
import { PricingTable, type PlanCard } from "@/components/marketing/pricing";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { IconCheck, IconChevronRight } from "@/components/icons";
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
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div className="grain relative min-h-dvh overflow-x-hidden bg-void text-white">
      <MarketingNav />

      {/* ══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden pb-16 pt-28">
        <div className="aurora opacity-40" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        {/* Huge watermark numeral — editorial, not decorative filler */}
        <span
          className="watermark absolute -right-8 top-1/4 hidden select-none lg:block"
          aria-hidden
        >
          01
        </span>

        <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-14 px-5 md:px-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Reveal>
              <p className="label flex items-center gap-3 text-volt-300">
                <span className="h-px w-10 bg-volt-300" />
                For gyms still running on a register
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="display display-xl mt-7 text-white">
                They don&apos;t
                <br />
                quit.
                <br />
                <span className="text-volt-300">They forget</span>
                <br />
                <span className="display-outline">to renew.</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <p className="mt-9 max-w-xl text-[17px] leading-relaxed text-white/55 md:text-lg">
                Astryx tracks every membership and chases the renewal on WhatsApp
                before it lapses. No spreadsheets. No forgotten follow-ups. No
                awkward phone call three weeks too late.
              </p>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-11 flex flex-wrap items-stretch gap-3">
                <Link
                  href="/login"
                  className="label group flex items-center gap-3 bg-volt-300 px-8 py-5 text-void transition-colors hover:bg-white"
                >
                  Open the live demo
                  <IconChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#numbers"
                  className="wipe label flex items-center border border-white/25 px-8 py-5 text-white transition-colors hover:text-void"
                >
                  What&apos;s it worth to me?
                </a>
              </div>
            </Reveal>

            <Reveal delay={340}>
              <p className="mt-6 flex items-center gap-2 text-[13px] text-white/35">
                <IconCheck className="size-3.5 text-volt-300" strokeWidth={3} />
                Real demo gym, fully loaded. No sign-up, no card.
              </p>
            </Reveal>
          </div>

          <Reveal delay={240} scale>
            <ChatDemo />
          </Reveal>
        </div>
      </section>

      {/* ══ VOLT STAT BAND ═════════════════════════════════════════════ */}
      <section className="band-volt relative">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { v: <CountUp to={50} suffix="%" />, l: "of members lapse each year at a typical gym" },
              { v: <CountUp to={98} suffix="%" />, l: "WhatsApp open rate, against ~20% for email" },
              { v: <CountUp to={4} suffix=" hrs" />, l: "a week the front desk spends chasing renewals" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="border-t-2 border-void/20 pt-6">
                  <p className="display text-6xl text-void md:text-7xl">{s.v}</p>
                  <p className="mt-3 max-w-[16rem] text-[13.5px] font-medium leading-snug text-void/65">
                    {s.l}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MARQUEE ════════════════════════════════════════════════════ */}
      <section className="overflow-hidden border-b border-white/10 bg-void py-7">
        <Marquee
          items={[
            "Expiry tracking",
            "WhatsApp reminders",
            "Win-back campaigns",
            "Pending dues",
            "Inactivity alerts",
            "Enquiry pipeline",
            "Birthday wishes",
            "CSV import",
            "Retention reports",
            "Staff roles",
          ].map((t) => (
            <span key={t} className="display display-sm flex items-center gap-7 text-white/15">
              {t}
              <span className="text-volt-300/50">◆</span>
            </span>
          ))}
        />
      </section>

      {/* ══ PROBLEM ════════════════════════════════════════════════════ */}
      <section id="problem" className="relative py-24 md:py-36">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <Reveal>
            <p className="label flex items-center gap-3 text-volt-300">
              <span className="h-px w-10 bg-volt-300" />
              Sound familiar?
            </p>
            <h2 className="display display-lg mt-7 max-w-4xl text-white">
              It&apos;s not a sales problem.
              <br />
              <span className="text-white/25">It&apos;s a memory problem.</span>
            </h2>
          </Reveal>

          <div className="mt-20 space-y-0">
            {[
              {
                n: "01",
                t: "The register is the only source of truth",
                b: "Names in a notebook, amounts on WhatsApp, expiry dates in your head. Nobody can answer “who expires this week?” without twenty minutes of flipping pages — so nobody asks.",
              },
              {
                n: "02",
                t: "Renewals depend on somebody remembering",
                b: "A member's plan ends on a Tuesday. Nobody notices until they stop showing up three weeks later. By then they've already joined the gym down the road.",
              },
              {
                n: "03",
                t: "Dues quietly become donations",
                b: "Half-payments are normal at a gym. Tracking them isn't. Money owed drifts past a month, then two, and eventually gets written off without anyone deciding to.",
              },
            ].map((c, i) => (
              <Reveal key={c.n} delay={i * 90}>
                <div className="group grid gap-6 border-t border-white/10 py-10 md:grid-cols-[6rem_1fr_1.2fr] md:gap-10 md:py-12">
                  <span className="display text-4xl text-white/15 transition-colors group-hover:text-volt-300 md:text-5xl">
                    {c.n}
                  </span>
                  <h3 className="display display-sm text-white">{c.t}</h3>
                  <p className="max-w-xl text-[15.5px] leading-relaxed text-white/50">{c.b}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="border-t border-white/10 pt-12">
              <p className="max-w-4xl text-[19px] leading-relaxed text-white/70 md:text-2xl">
                Almost none of that is members deciding they don&apos;t want to train.
                It&apos;s admin. It&apos;s a date nobody wrote down.{" "}
                <span className="text-volt-300">
                  The gym down the road isn&apos;t better than yours — it just called
                  them first.
                </span>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ ROI CALCULATOR ═════════════════════════════════════════════ */}
      <section id="numbers" className="relative border-t border-white/10 py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-5 md:px-10">
          <Reveal>
            <p className="label text-volt-300">Do the maths</p>
            <h2 className="display display-lg mt-6 max-w-3xl text-white">
              Work out your
              <br />
              <span className="text-volt-300">own number.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[16px] text-white/50">
              Not ours. Yours. Three sliders and you&apos;ll know whether this is worth
              a conversation.
            </p>
          </Reveal>

          <Reveal delay={120} scale>
            <div className="mt-14">
              <RoiCalculator />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ INSIDE THE PRODUCT ═════════════════════════════════════════ */}
      <section id="inside" className="border-t border-white/10 py-24 md:py-36">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <Reveal>
            <p className="label text-volt-300">Inside Astryx</p>
            <h2 className="display display-lg mt-6 max-w-4xl text-white">
              Everything a gym needs.
              <br />
              <span className="text-white/25">Nothing it doesn&apos;t.</span>
            </h2>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-white/50">
              We left out class scheduling, the POS and the marketing suite you&apos;d
              never open. What&apos;s left is the part that makes money.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-16">
              <FeatureTabs />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════ */}
      <section className="band-volt cut-top relative -mt-[3.5vw] pt-[7vw]">
        <div className="mx-auto max-w-[1400px] px-5 pb-16 md:px-10 md:pb-24">
          <Reveal>
            <p className="label text-void/55">Getting started</p>
            <h2 className="display display-lg mt-6 max-w-3xl text-void">
              Four steps. Then it
              <br />
              runs without you.
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-px bg-void/15 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Import your members", b: "Paste your sheet. Astryx maps the columns, parses your dates and flags duplicates — then shows you everything before saving." },
              { n: "02", t: "Set your plans", b: "1 month, 3 months, PT packages, joining fees. Expiry dates then calculate themselves, forever." },
              { n: "03", t: "Switch on automations", b: "Ten templates arrive ready to use. Edit the words, not the logic. Preview exactly who gets what." },
              { n: "04", t: "Watch renewals land", b: "Every message logged. The dashboard shows who's expiring, who's paid and who needs a human call." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="group h-full bg-volt-300 p-8 transition-colors hover:bg-void">
                  <span className="display text-5xl text-void/25 transition-colors group-hover:text-volt-300">
                    {s.n}
                  </span>
                  <h3 className="display display-sm mt-6 text-void transition-colors group-hover:text-white">
                    {s.t}
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-void/70 transition-colors group-hover:text-white/55">
                    {s.b}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ═════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1100px] px-5 md:px-10">
          <Reveal>
            <h2 className="display display-lg max-w-3xl text-white">
              Against how you
              <br />
              run things today.
            </h2>
            <p className="mt-6 max-w-lg text-[16px] text-white/50">
              Most gyms we talk to aren&apos;t switching from other software.
              They&apos;re switching from a notebook.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-14 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-white/15">
                    <th className="py-5 pr-4">&nbsp;</th>
                    <th className="label px-4 py-5 text-center text-white/35">Register</th>
                    <th className="label px-4 py-5 text-center text-white/35">Spreadsheet</th>
                    <th className="label px-4 py-5 text-center text-volt-300">Astryx</th>
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
                    <tr key={i} className="border-b border-white/8">
                      <td className="py-5 pr-4 text-[15px] text-white/70">{label as string}</td>
                      {[reg, sheet, astryx].map((v, j) => (
                        <td key={j} className="px-4 py-5 text-center">
                          {v === true ? (
                            <span className="inline-grid size-7 place-items-center bg-volt-300">
                              <IconCheck className="size-4 text-void" strokeWidth={3} />
                            </span>
                          ) : v === "manual" ? (
                            <span className="label text-white/30">By hand</span>
                          ) : (
                            <span className="text-xl text-white/15">—</span>
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

      {/* ══ PRICING ════════════════════════════════════════════════════ */}
      <section id="pricing" className="border-t border-white/10 py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-5 md:px-10">
          <Reveal>
            <div className="text-center">
              <p className="label text-volt-300">Pricing</p>
              <h2 className="display display-lg mx-auto mt-6 max-w-3xl text-white">
                Priced for a gym,
                <br />
                not an enterprise.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-[16px] text-white/50">
                14-day free trial. No card needed. Cancel whenever — your data exports
                to CSV in one click.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-14">
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
            <p className="mt-12 text-center text-[13px] text-white/35">
              WhatsApp conversation charges from Meta are billed at cost and shown in
              your usage dashboard — we don&apos;t mark them up.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════ */}
      <section id="faq" className="border-t border-white/10 py-24 md:py-32">
        <div className="mx-auto max-w-[1000px] px-5 md:px-10">
          <Reveal>
            <h2 className="display display-lg max-w-2xl text-white">
              Questions owners
              <br />
              <span className="text-white/25">actually ask.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14">
              <Faq />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════ */}
      <section className="band-volt relative overflow-hidden">
        <div className="relative mx-auto max-w-[1400px] px-5 py-28 md:px-10 md:py-40">
          <Reveal>
            <h2 className="display text-void" style={{ fontSize: "clamp(2.6rem, 8.5vw, 8rem)", lineHeight: 0.88 }}>
              How many members
              <br />
              did you lose last month
              <br />
              <span className="display-outline" style={{ WebkitTextStrokeColor: "rgb(10 10 12 / 0.4)" }}>
                without noticing?
              </span>
            </h2>

            <div className="mt-14 flex flex-wrap items-center gap-6">
              <Link
                href="/login"
                className="label group flex items-center gap-3 bg-void px-10 py-6 text-volt-300 transition-colors hover:bg-void-soft"
              >
                Open the demo gym
                <IconChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="max-w-xs text-[14px] leading-snug text-void/60">
                Import your list and Astryx shows you exactly who has already lapsed —
                in about ten minutes.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════════ */}
      <footer className="bg-void">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10">
          <div className="flex flex-col gap-12 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <Wordmark />
              <p className="mt-5 text-[14px] leading-relaxed text-white/40">
                Gym management that chases renewals for you. Built for independent gyms
                in India.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
              {[
                { h: "Product", links: [["The problem", "#problem"], ["Inside", "#inside"], ["Pricing", "#pricing"], ["FAQ", "#faq"]] },
                { h: "Start", links: [["Live demo", "/login"], ["Sign in", "/login"], ["Your numbers", "#numbers"]] },
                { h: "Internal", links: [["Platform admin", "/admin/login"]] },
              ].map((col) => (
                <div key={col.h}>
                  <p className="label text-white/30">{col.h}</p>
                  <ul className="mt-5 space-y-3">
                    {col.links.map(([label, href]) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-[14px] text-white/55 transition-colors hover:text-volt-300"
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

          {/* Oversized wordmark as a closing graphic */}
          <div className="mt-20 overflow-hidden border-t border-white/10 pt-8">
            <p
              className="display select-none leading-none text-white/[0.055]"
              style={{ fontSize: "clamp(4rem, 17vw, 15rem)" }}
              aria-hidden
            >
              Astryx
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-[12.5px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Astryx. All rights reserved.</p>
            <p>Made for gyms that deserve better than a notebook.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
