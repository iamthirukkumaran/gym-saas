import { cn } from "./ui";

/**
 * Charts, rendered as plain SVG on the server.
 *
 * No charting library and no client JavaScript: these are read-only
 * dashboard visuals, so shipping a runtime to draw them would trade real
 * page weight for nothing. Every chart degrades to a labelled table-like
 * reading for screen readers via `role` + `aria-label`.
 *
 * Palette is the shared brand ramp, so charts match the rest of the UI
 * instead of looking like a bolted-on widget.
 */

const SERIES = ["#6d4aff", "#00c48c", "#f59b14", "#2f80ed", "#f0484e", "#8f75ff"];

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(value));
  const n = value / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

// ── Bar chart ───────────────────────────────────────────────────────────────

export function BarChart({
  data,
  height = 180,
  format = (n: number) => String(n),
  tone = 0,
  className,
  label,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
  tone?: number;
  className?: string;
  label?: string;
}) {
  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }

  const max = niceCeil(Math.max(...data.map((d) => d.value), 0));
  const barW = 100 / data.length;
  const colour = SERIES[tone % SERIES.length];

  return (
    <figure className={cn("w-full", className)}>
      <div
        role="img"
        aria-label={
          label ??
          `Bar chart: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`
        }
      >
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1="0"
              x2="100"
              y1={height - 24 - f * (height - 40)}
              y2={height - 24 - f * (height - 40)}
              stroke="#eef0f4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {data.map((d, i) => {
            const h = max === 0 ? 0 : (d.value / max) * (height - 40);
            return (
              <rect
                key={i}
                x={i * barW + barW * 0.22}
                y={height - 24 - h}
                width={barW * 0.56}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx="1.5"
                fill={colour}
                opacity={0.88}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex" aria-hidden>
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center">
            <span className="block truncate text-[10px] text-ink-400">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="nums mt-1 flex justify-between text-[11px] text-ink-500">
        <span>peak {format(Math.max(...data.map((d) => d.value)))}</span>
        <span>total {format(data.reduce((s, d) => s + d.value, 0))}</span>
      </figcaption>
    </figure>
  );
}

// ── Line / area chart ───────────────────────────────────────────────────────

export function AreaChart({
  data,
  height = 180,
  format = (n: number) => String(n),
  tone = 0,
  className,
  label,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
  tone?: number;
  className?: string;
  label?: string;
}) {
  if (data.length < 2) return <EmptyChart height={height} />;

  const max = niceCeil(Math.max(...data.map((d) => d.value), 0));
  const plotH = height - 32;
  const colour = SERIES[tone % SERIES.length];
  const gid = `grad-${tone}-${data.length}`;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = plotH - (max === 0 ? 0 : (d.value / max) * plotH) + 8;
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L100,${plotH + 8} L0,${plotH + 8} Z`;

  return (
    <figure className={cn("w-full", className)}>
      <div
        role="img"
        aria-label={
          label ?? `Line chart: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`
        }
      >
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity="0.26" />
              <stop offset="100%" stopColor={colour} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1="0"
              x2="100"
              y1={8 + f * plotH}
              y2={8 + f * plotH}
              stroke="#eef0f4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill={`url(#${gid})`} />
          <path
            d={line}
            fill="none"
            stroke={colour}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill="#fff"
              stroke={colour}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex" aria-hidden>
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center">
            <span className="block truncate text-[10px] text-ink-400">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────

export function Donut({
  data,
  size = 150,
  thickness = 18,
  centreLabel,
  centreValue,
  className,
}: {
  data: { label: string; value: number; colour?: string }[];
  size?: number;
  thickness?: number;
  centreLabel?: string;
  centreValue?: string;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const frac = total === 0 ? 0 : d.value / total;
    const arc = {
      ...d,
      colour: d.colour ?? SERIES[i % SERIES.length],
      dash: frac * c,
      offset,
    };
    offset += frac * c;
    return arc;
  });

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Breakdown: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
          className="-rotate-90"
        >
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={thickness} />
          {total > 0 &&
            arcs.map((a, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.colour}
                strokeWidth={thickness}
                strokeDasharray={`${a.dash} ${c - a.dash}`}
                strokeDashoffset={-a.offset}
                strokeLinecap="butt"
              />
            ))}
        </svg>
        {centreValue ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="nums text-xl font-semibold text-ink-900">{centreValue}</p>
              {centreLabel ? <p className="text-[11px] text-ink-500">{centreLabel}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: a.colour }} />
            <span className="min-w-0 flex-1 truncate text-ink-600">{a.label}</span>
            <span className="nums font-medium text-ink-900">{a.value}</span>
            <span className="nums w-10 text-right text-[11px] text-ink-400">
              {total === 0 ? "0%" : `${Math.round((a.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sparkline ───────────────────────────────────────────────────────────────

export function Sparkline({
  values,
  width = 90,
  height = 28,
  tone = 0,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  tone?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const colour = SERIES[tone % SERIES.length];

  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke={colour} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Horizontal meter ────────────────────────────────────────────────────────

export function Meter({
  value,
  max,
  tone = "brand",
  className,
}: {
  value: number;
  max: number;
  tone?: "brand" | "good" | "warn" | "bad";
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const tones = {
    brand: "bg-brand-500",
    good: "bg-good-500",
    warn: "bg-warn-500",
    bad: "bg-bad-500",
  };
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-200", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="grid place-items-center rounded-lg border border-dashed border-ink-200 text-[12px] text-ink-400"
      style={{ height }}
    >
      Not enough data yet
    </div>
  );
}
