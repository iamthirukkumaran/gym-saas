"use client";

import { useMemo, useState } from "react";

import { cn } from "../ui";
import { IconTrendUp } from "../icons";

/**
 * The "what is this costing you?" calculator.
 *
 * Gym owners don't buy software, they buy recovered revenue. This turns an
 * abstract pitch into their own number, computed from three inputs they know
 * off the top of their head.
 *
 * The assumptions are stated on screen rather than hidden, because an
 * inflated number that the owner doesn't believe is worse than a smaller one
 * they do. Recovery rate is deliberately conservative.
 */

const RECOVERY_RATE = 0.25; // share of lapsing members a reminder brings back

export function RoiCalculator() {
  const [members, setMembers] = useState(200);
  const [fee, setFee] = useState(1500);
  const [churn, setChurn] = useState(8);

  const result = useMemo(() => {
    const lapsingPerMonth = Math.round((members * churn) / 100);
    const recovered = Math.max(0, Math.round(lapsingPerMonth * RECOVERY_RATE));
    const monthly = recovered * fee;
    const yearly = monthly * 12;
    // Growth plan, the tier most gyms this size land on.
    const cost = 1999;
    const roi = cost > 0 ? monthly / cost : 0;
    return { lapsingPerMonth, recovered, monthly, yearly, cost, roi };
  }, [members, fee, churn]);

  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        {/* ── Inputs ─────────────────────────────────────────────────── */}
        <div className="border-b border-white/10 p-7 lg:border-b-0 lg:border-r lg:p-9">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-300">
            Your numbers
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            What are lapsed members costing you?
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-white/55">
            Drag the sliders. No sign-up, nothing sent anywhere.
          </p>

          <div className="mt-8 space-y-7">
            <Slider
              label="Active members"
              value={members}
              min={30}
              max={1200}
              step={10}
              onChange={setMembers}
              display={String(members)}
            />
            <Slider
              label="Average monthly fee"
              value={fee}
              min={400}
              max={6000}
              step={100}
              onChange={setFee}
              display={inr(fee)}
            />
            <Slider
              label="Members who lapse each month"
              value={churn}
              min={2}
              max={20}
              step={1}
              onChange={setChurn}
              display={`${churn}%`}
              hint={`about ${result.lapsingPerMonth} people a month`}
            />
          </div>
        </div>

        {/* ── Result ─────────────────────────────────────────────────── */}
        <div className="relative flex flex-col justify-center p-7 lg:p-9">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/15 via-transparent to-good-500/10" />

          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-good-400">
              Recoverable with Astryx
            </p>

            <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
              {inr(result.monthly)}
              <span className="ml-1 text-lg font-normal text-white/45">/month</span>
            </p>

            <p className="mt-2 text-[15px] text-white/65">
              about <strong className="font-semibold text-white">{inr(result.yearly)}</strong> a year
            </p>

            <div className="mt-7 space-y-3 border-t border-white/10 pt-6">
              <Row
                label="Members lapsing each month"
                value={String(result.lapsingPerMonth)}
              />
              <Row
                label={`Recovered at a ${Math.round(RECOVERY_RATE * 100)}% win-back rate`}
                value={String(result.recovered)}
                accent
              />
              <Row label="Astryx Growth plan" value={`${inr(result.cost)}/mo`} />
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-good-500/25 bg-good-500/10 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-good-500/20 text-good-400">
                <IconTrendUp className="size-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-white">
                  {result.roi >= 1
                    ? `${result.roi.toFixed(result.roi >= 10 ? 0 : 1)}× return`
                    : "Below break-even"}
                </p>
                <p className="text-[12.5px] text-white/60">
                  {result.roi >= 1
                    ? `Pays for itself with ${Math.max(1, Math.ceil(result.cost / fee))} recovered ${Math.ceil(result.cost / fee) === 1 ? "member" : "members"}.`
                    : "At this size, start on the Starter plan instead."}
                </p>
              </div>
            </div>

            <p className="mt-5 text-[11.5px] leading-relaxed text-white/35">
              Assumes a 25% win-back rate on members who would otherwise lapse
              — deliberately conservative. Reminders sent before expiry
              typically do better than ones sent after.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: string;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <label className="text-[13.5px] font-medium text-white/75">{label}</label>
        <span className="nums text-[15px] font-semibold text-white">{display}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 outline-none",
          // Track fill has to be painted via a gradient: range inputs give no
          // styleable "filled" pseudo-element across browsers.
          "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(109_74_255_/_0.35)]",
          "[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110",
          "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white",
        )}
        style={{
          background: `linear-gradient(90deg, #6d4aff 0%, #8f75ff ${pct}%, rgb(255 255 255 / 0.15) ${pct}%)`,
        }}
      />

      {hint ? <p className="mt-1.5 text-[11.5px] text-white/40">{hint}</p> : null}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[13px] text-white/55">{label}</span>
      <span
        className={cn(
          "nums text-[15px] font-semibold",
          accent ? "text-good-400" : "text-white/90",
        )}
      >
        {value}
      </span>
    </div>
  );
}
