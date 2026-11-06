"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "../ui";
import { IconCheck } from "../icons";

type Msg = {
  from: "gym" | "member";
  body: React.ReactNode;
  time: string;
  /** Pause before this message, in ms. */
  gap: number;
};

const SCRIPT: Msg[] = [
  {
    from: "gym",
    time: "10:00",
    gap: 600,
    body: (
      <>
        Hi Rahul! 👋
        <br />
        <br />
        Your <b>3 Month Gym + Cardio</b> at Iron Core Fitness expires on{" "}
        <b>28 Nov</b> — that&apos;s 7 days away.
        <br />
        <br />
        Renew now and keep your streak going:
        <br />
        <span className="text-info-600 underline">astryx.app/r/mbr-0042</span>
      </>
    ),
  },
  { from: "member", time: "10:04", gap: 1900, body: <>Oh I totally forgot 😅</> },
  { from: "member", time: "10:04", gap: 900, body: <>Done bhai, paid via UPI ✅</> },
  {
    from: "gym",
    time: "10:05",
    gap: 1200,
    body: (
      <>
        Payment received ✅
        <br />
        Valid till <b>26 Feb 2027</b>. See you at the gym! 💪
      </>
    ),
  },
];

/**
 * The product demo, as a conversation that plays itself.
 *
 * Starts only when scrolled into view, and loops with a long pause so a
 * visitor who scrolls back still sees it run. This is the single most
 * persuasive element on the page: it shows the entire value proposition —
 * a renewal recovered without the owner touching anything — in ten seconds.
 */
export function ChatDemo({ bare = false }: { bare?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(SCRIPT.length);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const play = () => {
      setVisible(0);
      let elapsed = 0;

      SCRIPT.forEach((msg, i) => {
        elapsed += msg.gap;
        // Show the typing indicator just before an incoming member reply.
        if (msg.from === "member") {
          timers.push(
            setTimeout(() => !cancelled && setTyping(true), Math.max(0, elapsed - 700)),
          );
        }
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setTyping(false);
            setVisible(i + 1);
          }, elapsed),
        );
      });

      // Hold the finished conversation, then replay.
      timers.push(setTimeout(() => !cancelled && play(), elapsed + 6000));
    };

    play();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-sm">
      <div className="rounded-[2.4rem] border border-white/15 bg-void-soft p-2.5 shadow-2xl shadow-black/70">
        <div className="overflow-hidden rounded-[2rem] bg-white">
          {/* chat header */}
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-semibold text-white">
              IC
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Iron Core Fitness</p>
              <p className="text-[11px] text-white/70">
                {typing ? "typing…" : "business account"}
              </p>
            </div>
          </div>

          <div className="wa-wallpaper flex min-h-[21rem] flex-col justify-end gap-2.5 px-3 py-4">
            {SCRIPT.slice(0, visible).map((m, i) =>
              m.from === "gym" ? (
                <div key={i} className="bubble-in flex justify-end pr-2">
                  <div className="wa-bubble max-w-[86%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed text-ink-900">
                    {m.body}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-500">
                      {m.time}
                      <IconCheck className="size-3 text-info-500" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="bubble-in flex justify-start">
                  <div className="max-w-[86%] rounded-lg bg-white px-3 py-2 text-[12.5px] leading-relaxed text-ink-900 shadow-sm">
                    {m.body}
                    <div className="mt-1 text-right text-[10px] text-ink-500">{m.time}</div>
                  </div>
                </div>
              ),
            )}

            {typing ? (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-lg bg-white px-3 py-2.5 shadow-sm">
                  <span className="typing-dot size-1.5 rounded-full bg-ink-400" />
                  <span className="typing-dot size-1.5 rounded-full bg-ink-400" />
                  <span className="typing-dot size-1.5 rounded-full bg-ink-400" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {bare ? null : (
        <p className="mt-5 text-center">
          <span className="block text-[13px] font-medium text-butter-300">
            Sent automatically
          </span>
          <span className="mt-1.5 block text-[12.5px] text-white/45">
            7 days before expiry, 10:00 AM IST. The owner did nothing.
          </span>
        </p>
      )}
    </div>
  );
}
