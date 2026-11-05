import type { Metadata } from "next";

import { BarChart } from "@/components/charts";
import { RunAllEnginesButton } from "@/components/forms/admin-forms";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pill,
  Stat,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { IconAlert, IconClock, IconZap } from "@/components/icons";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, relativeDayLabel } from "@/lib/dates";
import { num } from "@/lib/format";

import { runEngineAllTenants } from "../../actions";

export const metadata: Metadata = { title: "Engine runs" };

/**
 * Engine observability.
 *
 * When an owner asks "did my reminders go out last night?", this page is the
 * answer — without guessing, and without reading logs.
 */
export default async function AdminEnginePage() {
  const { user } = await requirePlatform();

  const [runs, totals, lastRun, failedRuns] = await Promise.all([
    db.engineRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 }),
    db.engineRun.aggregate({
      _sum: { sent: true, queued: true, failed: true, skipped: true },
      _count: true,
    }),
    db.engineRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.engineRun.count({ where: { errorText: { not: null } } }),
  ]);

  const series = runs
    .slice(0, 20)
    .reverse()
    .map((r, i) => ({ label: String(i + 1), value: r.sent }));

  // A healthy deployment runs this every 15 minutes. Anything over an hour
  // means the scheduler is broken and reminders are silently not going out.
  const minutesSinceLastRun = lastRun
    ? Math.round((Date.now() - lastRun.startedAt.getTime()) / 60_000)
    : null;
  const schedulerStale = minutesSinceLastRun !== null && minutesSinceLastRun > 60;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Engine runs"
        subtitle="Every execution of the reminder engine, so delivery is never a mystery."
      />

      {schedulerStale ? (
        <div className="mb-5">
          <Alert tone="bad" title="The scheduler may not be running">
            The last engine run was {minutesSinceLastRun} minutes ago. A healthy deployment
            runs every 15 minutes. Check that your cron is calling{" "}
            <code className="font-mono">POST /api/cron/run</code> with the{" "}
            <code className="font-mono">CRON_SECRET</code> bearer token.
          </Alert>
        </div>
      ) : lastRun === null ? (
        <div className="mb-5">
          <Alert tone="warn" title="The engine has never run">
            No reminders will be delivered until the scheduler calls{" "}
            <code className="font-mono">POST /api/cron/run</code>, or someone runs it manually
            below.
          </Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Last run"
          value={
            minutesSinceLastRun === null
              ? "never"
              : minutesSinceLastRun < 60
                ? `${minutesSinceLastRun}m ago`
                : `${Math.round(minutesSinceLastRun / 60)}h ago`
          }
          sub={lastRun ? `${num(lastRun.gymsProcessed)} gyms processed` : "scheduler not configured"}
          tone={schedulerStale || lastRun === null ? "bad" : "good"}
          icon={<IconClock className="size-4" />}
        />
        <Stat
          label="Messages sent"
          value={num(totals._sum.sent ?? 0)}
          sub={`across ${num(totals._count)} runs`}
          tone="good"
          icon={<IconZap className="size-4" />}
        />
        <Stat
          label="Failures"
          value={num(totals._sum.failed ?? 0)}
          sub={`${num(totals._sum.skipped ?? 0)} deliberately skipped`}
          tone={(totals._sum.failed ?? 0) > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="Runs with errors"
          value={num(failedRuns)}
          sub="engine-level exceptions"
          tone={failedRuns > 0 ? "bad" : "neutral"}
          icon={<IconAlert className="size-4" />}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Messages sent per run" subtitle="Last 20 runs, oldest first" />
          <div className="mt-4">
            <BarChart data={series} height={160} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Run the engine now"
            subtitle="Processes every tenant. Safe to run at any time — the engine is idempotent."
          />
          <div className="mt-4">
            {user.role === "SUPERADMIN" ? (
              <RunAllEnginesButton action={runEngineAllTenants} />
            ) : (
              <Alert tone="info">Support accounts can view runs but not trigger them.</Alert>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-ink-50 p-3 text-[11.5px] leading-relaxed text-ink-600">
            <p className="font-semibold text-ink-700">Recommended schedule</p>
            <p className="mt-1">
              Every 15 minutes. Each run reconciles member statuses, queues any reminders
              due today, and dispatches whatever has reached its send window.
            </p>
          </div>
        </Card>
      </div>

      <Card pad={false}>
        <div className="p-5 pb-2">
          <CardHeader title="Run history" subtitle="Most recent first" />
        </div>
        {runs.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No runs recorded yet" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Started</Th>
                <Th>Trigger</Th>
                <Th align="right">Gyms</Th>
                <Th align="right">Statuses</Th>
                <Th align="right">Queued</Th>
                <Th align="right">Sent</Th>
                <Th align="right">Skipped</Th>
                <Th align="right">Failed</Th>
                <Th align="right">Duration</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const ms = r.finishedAt
                  ? r.finishedAt.getTime() - r.startedAt.getTime()
                  : null;
                return (
                  <Tr key={r.id} className={r.errorText ? "bg-bad-50/40" : undefined}>
                    <Td>
                      <span className="block text-[12.5px] text-ink-800">
                        {relativeDayLabel(r.startedAt)}
                      </span>
                      <span className="block text-[10.5px] text-ink-400">
                        {fmtDateTime(r.startedAt)}
                      </span>
                      {r.errorText ? (
                        <span className="mt-0.5 block max-w-xs truncate text-[10.5px] font-medium text-bad-600">
                          {r.errorText.split("\n")[0]}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge
                        className={
                          r.trigger === "CRON"
                            ? "bg-ink-100 text-ink-700 ring-ink-400/20"
                            : "bg-brand-50 text-brand-700 ring-brand-500/20"
                        }
                      >
                        {r.trigger.toLowerCase()}
                      </Badge>
                    </Td>
                    <Td align="right" className="nums text-[12.5px]">{num(r.gymsProcessed)}</Td>
                    <Td align="right" className="nums text-[12.5px] text-ink-500">
                      {num(r.statusSynced)}
                    </Td>
                    <Td align="right" className="nums text-[12.5px]">{num(r.queued)}</Td>
                    <Td align="right" className="nums text-[12.5px] font-semibold text-good-700">
                      {num(r.sent)}
                    </Td>
                    <Td align="right" className="nums text-[12.5px] text-ink-500">
                      {num(r.skipped)}
                    </Td>
                    <Td align="right" className="nums text-[12.5px]">
                      {r.failed > 0 ? (
                        <span className="font-semibold text-bad-600">{num(r.failed)}</span>
                      ) : (
                        <span className="text-ink-300">0</span>
                      )}
                    </Td>
                    <Td align="right" className="nums text-[12px] text-ink-500">
                      {ms === null ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
