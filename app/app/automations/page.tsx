import Link from "next/link";
import type { Metadata } from "next";

import {
  AutomationSettings,
  RuleForm,
  RunEngineButton,
} from "@/components/forms/automation-controls";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { IconAlert, IconCheck, IconWhatsApp, IconZap } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { TRIGGERS, TRIGGER_HELP, TRIGGER_LABELS, type Trigger } from "@/lib/constants";
import { hourLabel, relativeDayLabel } from "@/lib/dates";
import { num, plural, truncate } from "@/lib/format";
import { previewUpcoming } from "@/lib/engine";
import { describeRule } from "@/lib/provisioning";
import { monthBounds } from "@/lib/dates";

import { deleteRule, runEngineForGym, saveAutomationSettings, saveRule, toggleRule } from "./actions";

export const metadata: Metadata = { title: "Automations" };

/**
 * The automation control room.
 *
 * Shows what will be sent, to how many people, and when — before it happens.
 * An owner handing their member relationships to software needs to see it
 * working, not take it on faith.
 */
export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const { edit, new: isNew } = await searchParams;
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const month = monthBounds(new Date(), tz);

  const [rules, templates, upcoming, lastRun, sentThisMonth, queuedNow] = await Promise.all([
    db.reminderRule.findMany({
      where: { gymId: gym.id },
      orderBy: [{ trigger: "asc" }, { offsetDays: "asc" }],
      include: {
        template: { select: { name: true, body: true, active: true, id: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.waTemplate.findMany({
      where: { gymId: gym.id, active: true },
      orderBy: { name: "asc" },
      select: { key: true, name: true },
    }),
    previewUpcoming(gym.id, 7),
    db.engineRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.messageLog.count({
      where: {
        gymId: gym.id,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.count({ where: { gymId: gym.id, status: "QUEUED" } }),
  ]);

  const editing = edit ? rules.find((r) => r.id === edit) : undefined;
  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalUpcoming = upcoming.reduce((s, u) => s + u.count, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Automations"
        subtitle="The messages Astryx sends on your behalf, and exactly when."
        action={
          <Link
            href="/app/automations?new=1"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            New automation
          </Link>
        }
      />

      {!gym.autoRemindersEnabled ? (
        <div className="mb-5">
          <Alert tone="warn" title="Automations are paused">
            No reminders are going out. Members will lapse without hearing from you — turn
            the master switch back on below.
          </Alert>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active automations"
          value={`${num(enabledCount)} / ${num(rules.length)}`}
          sub="enabled rules"
          tone={enabledCount > 0 ? "good" : "warn"}
          icon={<IconZap className="size-4" />}
        />
        <Stat
          label="Queued next 7 days"
          value={num(totalUpcoming)}
          sub={`${plural(totalUpcoming, "message")} planned`}
          tone="brand"
          icon={<IconWhatsApp className="size-4" />}
        />
        <Stat label="Sent this month" value={num(sentThisMonth)} sub="delivered to members" />
        <Stat
          label="Waiting in queue"
          value={num(queuedNow)}
          sub={lastRun ? `last run ${relativeDayLabel(lastRun.startedAt, tz)}` : "engine hasn't run yet"}
        />
      </div>

      {/* New / edit form */}
      {isNew || editing ? (
        <Card className="mb-5">
          <CardHeader
            title={editing ? `Edit "${editing.name}"` : "New automation"}
            action={
              <Link
                href="/app/automations"
                className="text-[13px] font-medium text-ink-500 hover:text-ink-800"
              >
                Close
              </Link>
            }
          />
          <div className="mt-4">
            <RuleForm
              action={saveRule.bind(null, editing?.id ?? null)}
              templates={templates}
              triggers={TRIGGERS}
              triggerLabels={TRIGGER_LABELS}
              triggerHelp={TRIGGER_HELP}
              submitLabel={editing ? "Save automation" : "Create automation"}
              values={
                editing
                  ? {
                      name: editing.name,
                      trigger: editing.trigger,
                      offsetDays: editing.offsetDays,
                      templateKey: editing.templateKey,
                      enabled: editing.enabled,
                      sendHour: editing.sendHour,
                    }
                  : undefined
              }
            />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card pad={false}>
            <div className="p-5 pb-3">
              <CardHeader
                title="Your automation library"
                subtitle="Toggle any rule on or off. Changes apply to the next run."
              />
            </div>

            {rules.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  icon={<IconZap className="size-8" />}
                  title="No automations configured"
                  body="Astryx normally ships ten ready-made rules. Create one to get started."
                />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {rules.map((rule) => (
                  <li key={rule.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              rule.enabled
                                ? "text-[14px] font-semibold text-ink-900"
                                : "text-[14px] font-semibold text-ink-400"
                            }
                          >
                            {rule.name}
                          </span>
                          {rule.enabled ? (
                            <Badge className="bg-good-50 text-good-700 ring-good-500/20" dot="bg-good-500">
                              on
                            </Badge>
                          ) : (
                            <Badge className="bg-ink-100 text-ink-500 ring-ink-400/20">off</Badge>
                          )}
                          {!rule.template?.active ? (
                            <Badge className="bg-bad-50 text-bad-700 ring-bad-500/20">
                              template inactive
                            </Badge>
                          ) : null}
                        </div>

                        <p className="mt-1 text-[12.5px] text-ink-600">
                          {describeRule(rule.trigger, rule.offsetDays)} ·{" "}
                          {hourLabel(rule.sendHour ?? gym.reminderSendHour)} · sent{" "}
                          {num(rule._count.messages)} {plural(rule._count.messages, "time")}
                        </p>

                        {rule.template ? (
                          <p className="mt-1.5 line-clamp-2 rounded-md bg-ink-50 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-ink-500">
                            {truncate(rule.template.body.replace(/\n+/g, " "), 150)}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11.5px] text-bad-600">
                            Template <code className="font-mono">{rule.templateKey}</code> is
                            missing — this rule will not fire.
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <form action={toggleRule}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            {rule.enabled ? "Turn off" : "Turn on"}
                          </Button>
                        </form>
                        <Link
                          href={`/app/automations?edit=${rule.id}`}
                          className="rounded-md px-2 py-1 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          Edit
                        </Link>
                        <form action={deleteRule}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-400 transition-colors hover:bg-bad-50 hover:text-bad-600"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <AutomationSettings
            action={saveAutomationSettings}
            enabled={gym.autoRemindersEnabled}
            sendHour={gym.reminderSendHour}
            quietStart={gym.quietHoursStart}
            quietEnd={gym.quietHoursEnd}
            timezone={gym.timezone}
          />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="What's going out next"
              subtitle="A dry run of your rules against today's member list."
            />
            {upcoming.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Nothing queued"
                  body="No member matches your rules over the next 7 days."
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {upcoming.map((u, i) => (
                  <li
                    key={`${u.ruleName}-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                      {u.date.getUTCDate()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink-900">{u.ruleName}</p>
                      <p className="text-[11px] text-ink-500">{relativeDayLabel(u.date, tz)}</p>
                    </div>
                    <span className="nums shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {u.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Divider className="my-4" />
            <RunEngineButton action={runEngineForGym} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
              Normally a scheduler runs this every 15 minutes. Use the button to send
              today&apos;s batch right now.
            </p>
          </Card>

          <Card>
            <CardHeader title="How the engine protects you" />
            <ul className="mt-3 space-y-2.5">
              {[
                ["One message per occurrence", "A member can't be messaged twice for the same expiry, even if the engine runs 100 times."],
                ["Quiet hours enforced", `Nothing sends between ${hourLabel(gym.quietHoursStart)} and ${hourLabel(gym.quietHoursEnd)}.`],
                ["Opt-outs always honoured", "A member who opts out is skipped in every rule and broadcast, permanently."],
                ["Failures retried, then logged", "Three attempts with backoff. Anything that still fails shows up in your message log."],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-good-100">
                    <IconCheck className="size-2.5 text-good-700" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold text-ink-800">{t}</span>
                    <span className="block text-[11.5px] leading-relaxed text-ink-500">{b}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {lastRun ? (
            <Card>
              <CardHeader title="Last engine run" subtitle={relativeDayLabel(lastRun.startedAt, tz)} />
              <dl className="nums mt-3 grid grid-cols-2 gap-3 text-[13px]">
                {[
                  ["Sent", lastRun.sent],
                  ["Queued", lastRun.queued],
                  ["Skipped", lastRun.skipped],
                  ["Failed", lastRun.failed],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg bg-ink-50 px-3 py-2">
                    <dt className="text-[11px] text-ink-500">{k}</dt>
                    <dd className="font-semibold text-ink-900">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              {lastRun.errorText ? (
                <div className="mt-3 flex gap-2 rounded-lg bg-bad-50 p-2.5 text-[11.5px] text-bad-700">
                  <IconAlert className="size-3.5 shrink-0" />
                  <span className="line-clamp-3">{lastRun.errorText}</span>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
