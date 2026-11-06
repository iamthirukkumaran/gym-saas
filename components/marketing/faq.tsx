"use client";

import { useState } from "react";

import { cn } from "../ui";
import { IconPlus } from "../icons";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "We've never used gym software. Is this going to be complicated?",
    a: (
      <>
        That&apos;s exactly who Astryx is built for. Most of our thinking went into the
        first hour, not the hundredth: paste your member list straight out of Excel or a
        Google Sheet, and Astryx works out which column is the name, the phone, the
        joining date and the expiry — then shows you exactly what it will do before
        saving anything. Your plans, message templates and automations are already set
        up. You edit the wording; you never have to build the logic.
      </>
    ),
  },
  {
    q: "Our records are in a register and a WhatsApp group. Can you handle that?",
    a: (
      <>
        Yes, and it&apos;s the normal starting point. If you have a spreadsheet, import
        it. If you only have a notebook, add members as they come in to renew — within
        one cycle everyone is in the system. You don&apos;t need to digitise years of
        history to get value; you need today&apos;s expiry dates.
      </>
    ),
  },
  {
    q: "Do I need a WhatsApp Business API account to start?",
    a: (
      <>
        No. Astryx ships with a sandbox mode that runs every automation for real —
        scheduling, timing, member matching, the exact message text — and logs it all,
        without delivering. You can set everything up and trust it before Meta approves
        anything. When you&apos;re ready, connect Meta Cloud API directly or an Indian
        provider like AiSensy, Wati or Interakt. It&apos;s one setting, and nothing else
        changes.
      </>
    ),
  },
  {
    q: "What does WhatsApp itself cost?",
    a: (
      <>
        Meta charges per conversation, not per message — roughly ₹0.11–0.15 for a
        utility message in India at current rates. A 300-member gym sending reminders
        typically spends well under ₹200 a month. We bill that at cost and show it in
        your usage dashboard. We don&apos;t mark it up.
      </>
    ),
  },
  {
    q: "Will my members find the reminders annoying?",
    a: (
      <>
        They won&apos;t if you don&apos;t make them annoying, and Astryx is built to stop
        you. Quiet hours are enforced by the engine, not the interface — nothing sends
        at 2 AM even if you misconfigure it. A member can only receive one message per
        expiry cycle, no matter how often the system runs. And the moment someone asks to
        stop, one switch removes them from every automation permanently. Protecting your
        number&apos;s reputation is protecting the whole product.
      </>
    ),
  },
  {
    q: "What happens to my data if I leave?",
    a: (
      <>
        You export everything to CSV in one click — members, plans, expiry dates,
        payments, the lot — and we don&apos;t make you ask support. Your member list is
        your business, not our lock-in.
      </>
    ),
  },
  {
    q: "Can my front desk use it without breaking anything?",
    a: (
      <>
        There are three roles. Front desk can add members, check people in, collect
        payments and log enquiries — but can&apos;t touch settings, staff or billing.
        Managers get the gym settings. Only owners can manage staff logins and the
        subscription.
      </>
    ),
  },
  {
    q: "Do you handle payments?",
    a: (
      <>
        Partly, and we&apos;d rather be straight about it. Every reminder carries a
        renewal link with a one-tap UPI button, and you record the payment when it lands
        — cash, UPI, card or bank. Automatic reconciliation through a payment gateway is
        the next thing we&apos;re building, not something we claim today.
      </>
    ),
  },
];

/** Accordion. One open at a time, animated on max-height. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="group flex w-full items-center justify-between gap-6 py-7 text-left transition-colors"
            >
              <span
                className={cn(
                  "text-[17px] font-medium transition-colors sm:text-[19px]",
                  isOpen ? "text-butter-300" : "text-white/85 group-hover:text-white",
                )}
              >
                {item.q}
              </span>
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center border transition-all duration-300",
                  isOpen
                    ? "border-butter-300 bg-butter-300 text-void"
                    : "border-white/20 text-white/50 group-hover:border-white/50",
                )}
              >
                <IconPlus
                  className={cn(
                    "size-3.5 transition-transform duration-300",
                    isOpen && "rotate-45",
                  )}
                  strokeWidth={2.5}
                />
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-400 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-8 pr-12 text-[15px] leading-relaxed text-white/50">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
