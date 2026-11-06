import Link from "next/link";
import type { Metadata } from "next";

import { ChatDemo } from "@/components/marketing/chat-demo";
import { Faq } from "@/components/marketing/faq";
import { FeatureTabs } from "@/components/marketing/feature-tabs";
import { CountUp, Reveal } from "@/components/marketing/motion";
import { MarketingNav, Wordmark } from "@/components/marketing/nav";
import { PricingTable, type PlanCard } from "@/components/marketing/pricing";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { IconCheck, IconExternal } from "@/components/icons";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Astryx — gym software that chases renewals for you",
  description:
    "Your members don't quit, they forget to renew. Astryx tracks every membership and chases the renewal on WhatsApp automatically. Built for independent gyms in India.",
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

/** Accent CTA: label, then a light square holding the arrow. */
function AccentButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="btn-accent">
      <span className="btn-label">{children}</span>
      <span className="btn-icon">
        <IconExternal className="size-4 text-void" />
      </span>
    </Link>
  );
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-void text-white">
      <MarketingNav />

      {/* ══ HERO ═══════════════════════════════════════════════════════
          The headline sits over the product itself, the way a brand site
          lets the object carry the page. Supporting copy is pushed to the
          bottom corners so the centre stays uncluttered. */}
      <section className="dot-grid relative flex min-h-dvh flex-col justify-center overflow-hidden pb-14 pt-28">
        <div className="spotlight pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto w-full max-w-[1400px] px-5 md:px-8">
          <div className="relative flex justify-center">
            {/* The chat sits behind the headline as texture. It is desaturated
                and heavily dimmed because, unlike a dark product shot, a
                WhatsApp thread is light — white type straight over it would
                be unreadable. */}
            <div className="pointer-events-none absolute inset-x-0 -top-10 hidden justify-center md:flex">
              <div className="w-[310px] opacity-[0.22] saturate-0">
                <ChatDemo bare />
              </div>
            </div>
            {/* Scrim: darkest exactly where the headline lands */}
            <div
              className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 hidden bg-[radial-gradient(ellipse_52%_46%_at_50%_44%,rgb(13_13_15/0.92),rgb(13_13_15/0.55)_62%,transparent_85%)] md:block"
              aria-hidden
            />

            <Reveal>
              <h1 className="display display-xl relative z-10 max-w-5xl text-center text-white md:pt-24">
                Quiet software for
                <br />
                gyms that keep
                <br />
                <span className="display-dim">losing members.</span>
              </h1>
            </Reveal>
          </div>

          <div className="relative z-10 mt-14 grid items-end gap-10 md:mt-28 md:grid-cols-2">
            <Reveal delay={140}>
              <p className="fade-out max-w-md text-[15px] leading-relaxed text-white/55">
                They don&apos;t quit — they forget to renew. Astryx keeps every
                membership, plan and expiry date in one place, then chases the renewal
                on WhatsApp before it lapses. No spreadsheets. No forgotten follow-ups.
                No awkward phone call three weeks too late.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Link href="/login" className="btn-ghost">
                  See it working
                </Link>
                <AccentButton href="/login">Open the live demo</AccentButton>
              </div>
            </Reveal>
          </div>

          <Reveal delay={260}>
            <div className="mt-16 md:hidden">
              <ChatDemo />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PROOF STRIP ════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-[1400px] px-5 md:px-8">
        <div className="rule-ticked" />
        <div className="grid gap-10 py-14 sm:grid-cols-3 md:py-20">
          {[
            { v: <CountUp to={50} suffix="%" />, l: "of members lapse each year at a typical gym" },
            { v: <CountUp to={98} suffix="%" />, l: "WhatsApp open rate, against about 20% for email" },
            { v: <CountUp to={4} suffix=" hrs" />, l: "a week the front desk spends chasing renewals" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 90}>
              <p className="display text-5xl text-white md:text-6xl">{s.v}</p>
              <p className="mt-4 max-w-[17rem] text-[14px] leading-relaxed text-white/45">
                {s.l}
              </p>
            </Reveal>
          ))}
        </div>
        <div className="rule-ticked" />
      </section>

      {/* ══ PROBLEM ════════════════════════════════════════════════════ */}
      <section id="problem" className="relative py-24 md:py-36">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">The honest version</p>
            <h2 className="display display-lg mt-7 max-w-4xl text-white">
              It isn&apos;t a sales problem.
              <br />
              <span className="display-dim">It&apos;s a memory problem.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
            <Reveal delay={100}>
              <div className="panel h-full p-8 md:p-10">
                <p className="fade-out text-[15px] leading-relaxed text-white/55">
                  Names in a notebook. Amounts on WhatsApp. Expiry dates in your head.
                  Nobody can answer &ldquo;who expires this week?&rdquo; without twenty
                  minutes of flipping pages — so nobody asks, and the question quietly
                  stops being asked at all.
                </p>
                <div className="mt-10 space-y-6 border-t border-white/8 pt-8">
                  {[
                    ["Renewals depend on somebody remembering", "A plan ends on a Tuesday. Nobody notices until they stop showing up three weeks later."],
                    ["Dues quietly become donations", "Part payments are normal. Tracking them isn't. Money owed drifts past a month and gets written off without anyone deciding to."],
                  ].map(([t, b]) => (
                    <div key={t}>
                      <h3 className="text-[16px] font-medium text-white">{t}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-white/45">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="panel panel-outline relative h-full overflow-hidden p-8 md:p-12">
                <p className="eyebrow">What it costs</p>
                <p className="display display-md mt-8 max-w-xl text-white">
                  Almost none of it is members deciding they don&apos;t want to train.
                </p>
                <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-white/50">
                  It&apos;s admin. It&apos;s a date nobody wrote down. The gym down the
                  road isn&apos;t better than yours — it just called them first.
                </p>

                <div className="mt-12 flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-white/8 pt-8">
                  <div>
                    <p className="display text-4xl text-butter-300">
                      <CountUp to={8} />
                    </p>
                    <p className="mt-2 text-[13px] text-white/40">
                      members recovered a month
                    </p>
                  </div>
                  <div>
                    <p className="display text-4xl text-white">
                      ₹<CountUp to={144000} />
                    </p>
                    <p className="mt-2 text-[13px] text-white/40">
                      a year, at ₹1,500 a member
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ ROI CALCULATOR ═════════════════════════════════════════════ */}
      <section id="numbers" className="py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">Do the maths</p>
            <h2 className="display display-lg mt-7 max-w-3xl text-white">
              Work out your own number.
              <br />
              <span className="display-dim">Not ours.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-white/50">
              Three sliders you know off the top of your head, and you&apos;ll know
              whether this is worth a conversation.
            </p>
          </Reveal>

          <Reveal delay={120} scale>
            <div className="mt-14">
              <RoiCalculator />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ INSIDE ═════════════════════════════════════════════════════ */}
      <section id="inside" className="py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">Inside Astryx</p>
            <h2 className="display display-lg mt-7 max-w-4xl text-white">
              Everything a small gym needs.
              <br />
              <span className="display-dim">Nothing it doesn&apos;t.</span>
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/50">
              We left out class scheduling, the POS and the marketing suite you&apos;d
              never open. What&apos;s left is the part that makes money.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="panel mt-14 p-6 md:p-12">
              <FeatureTabs />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">Getting started</p>
            <h2 className="display display-lg mt-7 max-w-3xl text-white">
              Four steps.
              <br />
              <span className="display-dim">Then it runs without you.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Import your members", b: "Paste your sheet. Astryx maps the columns, parses your dates and flags duplicates — then shows you everything before saving." },
              { n: "02", t: "Set your plans", b: "1 month, 3 months, PT packages, joining fees. Expiry dates then calculate themselves, forever." },
              { n: "03", t: "Switch on automations", b: "Ten templates arrive ready to use. Edit the words, not the logic. Preview exactly who gets what." },
              { n: "04", t: "Watch renewals land", b: "Every message logged. The dashboard shows who's expiring, who's paid and who needs a human call." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="panel lift group h-full p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] tabular-nums text-butter-300">{s.n}</span>
                    <span className="h-px w-8 bg-white/15 transition-all duration-500 group-hover:w-14 group-hover:bg-butter-300" />
                  </div>
                  <h3 className="display display-sm mt-8 text-white">{s.t}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/45">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ═════════════════════════════════════════════════ */}
      <section className="py-24 md:py-28">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">Against today</p>
            <h2 className="display display-lg mt-7 max-w-3xl text-white">
              Most gyms aren&apos;t switching software.
              <br />
              <span className="display-dim">They&apos;re switching from a notebook.</span>
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <div className="panel mt-14 overflow-x-auto p-2 md:p-4">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-5">&nbsp;</th>
                    <th className="px-4 py-5 text-center text-[13px] font-medium text-white/40">Register</th>
                    <th className="px-4 py-5 text-center text-[13px] font-medium text-white/40">Spreadsheet</th>
                    <th className="px-4 py-5 text-center text-[13px] font-medium text-butter-300">Astryx</th>
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
                    <tr key={i} className="border-t border-white/6">
                      <td className="px-4 py-4 text-[14.5px] text-white/70">{label as string}</td>
                      {[reg, sheet, astryx].map((v, j) => (
                        <td key={j} className="px-4 py-4 text-center">
                          {v === true ? (
                            <span className="inline-grid size-6 place-items-center rounded-full bg-butter-300">
                              <IconCheck className="size-3.5 text-void" strokeWidth={3} />
                            </span>
                          ) : v === "manual" ? (
                            <span className="text-[12.5px] text-white/30">By hand</span>
                          ) : (
                            <span className="text-white/15">—</span>
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
      <section id="pricing" className="py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <Reveal>
            <div className="text-center">
              <p className="eyebrow">Pricing</p>
              <h2 className="display display-lg mx-auto mt-7 max-w-2xl text-white">
                Priced for a gym,
                <br />
                <span className="display-dim">not an enterprise.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-white/50">
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
      <section id="faq" className="py-24 md:py-32">
        <div className="mx-auto max-w-[1000px] px-5 md:px-8">
          <Reveal>
            <p className="eyebrow">Before you ask</p>
            <h2 className="display display-lg mt-7 max-w-2xl text-white">
              Questions owners
              <br />
              <span className="display-dim">actually ask.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14">
              <Faq />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ CLOSING ════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-40">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <Reveal>
            <div className="panel panel-outline spotlight relative overflow-hidden px-7 py-20 text-center md:px-12 md:py-32">
              <p className="eyebrow mx-auto">One last thing</p>
              <h2 className="display display-lg mx-auto mt-8 max-w-3xl text-white">
                How many members did you lose last month
                <br />
                <span className="display-dim">without noticing?</span>
              </h2>
              <p className="mx-auto mt-7 max-w-lg text-[15px] leading-relaxed text-white/50">
                Import your list and Astryx will show you exactly who has already
                lapsed, and who is about to. About ten minutes.
              </p>
              <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
                <AccentButton href="/login">Open the demo gym</AccentButton>
                <Link href="/login" className="btn-ghost">
                  Sign in
                </Link>
              </div>
              <p className="mt-7 text-[13px] text-white/30">
                Demo logins are on the sign-in page. Nothing to install.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/8">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8">
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
                  <p className="text-[13px] font-medium text-white/35">{col.h}</p>
                  <ul className="mt-5 space-y-3">
                    {col.links.map(([label, href]) => (
                      <li key={label}>
                        <Link
                          href={href}
                          className="text-[14px] text-white/60 transition-colors hover:text-white"
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

          <div className="mt-16 flex flex-col gap-3 border-t border-white/8 pt-7 text-[12.5px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Astryx. All rights reserved.</p>
            <p>Made for gyms that deserve better than a notebook.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
