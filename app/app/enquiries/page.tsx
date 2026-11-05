import type { Metadata } from "next";

import { Donut } from "@/components/charts";
import { LeadForm } from "@/components/forms/lead-form";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Select,
  Stat,
} from "@/components/ui";
import { IconTarget, IconWhatsApp } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_STATUS, SOURCE_LABELS } from "@/lib/constants";
import { fmtDate, relativeDayLabel, toDateInput, todayInZone } from "@/lib/dates";
import { num, pct, plural } from "@/lib/format";
import { displayPhone, waDeepLink } from "@/lib/phone";

import { convertLead, setLeadStatus, snoozeLead } from "./actions";
import { createLead } from "./actions";

export const metadata: Metadata = { title: "Enquiries" };

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-info-50 text-info-700 ring-info-500/20",
  CONTACTED: "bg-warn-50 text-warn-700 ring-warn-500/25",
  TRIAL: "bg-brand-50 text-brand-700 ring-brand-500/20",
  WON: "bg-good-50 text-good-700 ring-good-500/20",
  LOST: "bg-ink-100 text-ink-600 ring-ink-400/20",
};

/**
 * Enquiry pipeline.
 *
 * Small gyms lose walk-ins because nobody wrote the name down. This is the
 * cheapest possible fix: capture in 20 seconds, with a follow-up date that
 * surfaces itself.
 */
export default async function EnquiriesPage() {
  const { gym } = await requireStaff();
  const tz = gym.timezone;
  const today = todayInZone(tz);

  const [leads, counts, dueFollowUps, wonLast30, totalLast30] = await Promise.all([
    db.lead.findMany({
      where: { gymId: gym.id, status: { notIn: ["WON", "LOST"] } },
      orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
      take: 60,
    }),
    Promise.all(
      LEAD_STATUS.map(async (s) => ({
        status: s,
        count: await db.lead.count({ where: { gymId: gym.id, status: s } }),
      })),
    ),
    db.lead.count({
      where: { gymId: gym.id, status: { in: ["NEW", "CONTACTED"] }, followUpAt: { lte: today } },
    }),
    db.lead.count({
      where: {
        gymId: gym.id,
        status: "WON",
        createdAt: { gte: new Date(today.getTime() - 30 * 86_400_000) },
      },
    }),
    db.lead.count({
      where: { gymId: gym.id, createdAt: { gte: new Date(today.getTime() - 30 * 86_400_000) } },
    }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?.count ?? 0;
  const openCount = countFor("NEW") + countFor("CONTACTED") + countFor("TRIAL");

  const sourceMix = await db.lead.groupBy({
    by: ["source"],
    where: { gymId: gym.id },
    _count: { _all: true },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Enquiries"
        subtitle="Every walk-in and DM, tracked until they join or tell you why they didn't."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Open enquiries"
          value={num(openCount)}
          sub="still in play"
          tone={openCount > 0 ? "brand" : "neutral"}
          icon={<IconTarget className="size-4" />}
        />
        <Stat
          label="Follow-ups due"
          value={num(dueFollowUps)}
          sub="call these today"
          tone={dueFollowUps > 0 ? "warn" : "neutral"}
        />
        <Stat label="Won (30 days)" value={num(wonLast30)} sub="converted to members" tone="good" />
        <Stat
          label="Conversion rate"
          value={totalLast30 === 0 ? "—" : pct(wonLast30, totalLast30)}
          sub="last 30 days"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="New enquiry" subtitle="Capture it before they walk out." />
            <div className="mt-4">
              <LeadForm action={createLead} todayISO={toDateInput(today)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Pipeline" />
            <ul className="mt-3 space-y-1.5">
              {LEAD_STATUS.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3">
                  <Badge className={STATUS_STYLE[s]}>{s.toLowerCase()}</Badge>
                  <span className="nums text-[13px] font-semibold text-ink-900">
                    {countFor(s)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {sourceMix.length > 0 ? (
            <Card>
              <CardHeader title="Where enquiries come from" subtitle="All time" />
              <div className="mt-5">
                <Donut
                  data={sourceMix
                    .filter((s) => s._count._all > 0)
                    .map((s) => ({
                      label: s.source ? (SOURCE_LABELS[s.source] ?? s.source) : "Unknown",
                      value: s._count._all,
                    }))}
                  size={128}
                  centreValue={num(sourceMix.reduce((a, s) => a + s._count._all, 0))}
                  centreLabel="enquiries"
                />
              </div>
            </Card>
          ) : null}
        </div>

        <Card pad={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Open pipeline"
              subtitle={
                leads.length === 0
                  ? "Nothing open right now."
                  : `${num(leads.length)} ${plural(leads.length, "enquiry", "enquiries")}, most overdue first.`
              }
            />
          </div>

          {leads.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={<IconTarget className="size-8" />}
                title="No open enquiries"
                body="Add a walk-in using the form on the left and it'll appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {leads.map((lead) => {
                const overdue = lead.followUpAt ? lead.followUpAt <= today : false;
                return (
                  <li key={lead.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <Avatar name={lead.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-ink-900">
                              {lead.name}
                            </span>
                            <Badge className={STATUS_STYLE[lead.status]}>
                              {lead.status.toLowerCase()}
                            </Badge>
                            {overdue ? (
                              <Badge className="bg-bad-50 text-bad-700 ring-bad-500/20">
                                follow up
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-ink-500">
                            {displayPhone(lead.phone)}
                            {lead.interest ? ` · wants ${lead.interest}` : ""}
                            {lead.source ? ` · via ${SOURCE_LABELS[lead.source] ?? lead.source}` : ""}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-ink-400">
                            added {relativeDayLabel(lead.createdAt, tz)}
                            {lead.followUpAt
                              ? ` · follow up ${relativeDayLabel(lead.followUpAt, tz)}`
                              : ""}
                          </p>
                          {lead.notes ? (
                            <p className="mt-1.5 rounded-md bg-ink-50 px-2 py-1 text-[11.5px] text-ink-600">
                              {lead.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <a
                          href={waDeepLink(
                            lead.phone,
                            `Hi ${lead.name.split(" ")[0]}, this is ${gym.name}. Thanks for your interest! Would you like to come in for a free trial session this week?`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Message on WhatsApp"
                          className="grid size-7 place-items-center rounded-md text-good-600 transition-colors hover:bg-good-50"
                        >
                          <IconWhatsApp className="size-4" />
                        </a>

                        <form action={setLeadStatus} className="flex items-center gap-1">
                          <input type="hidden" name="leadId" value={lead.id} />
                          <Select
                            name="status"
                            defaultValue={lead.status}
                            aria-label={`Status for ${lead.name}`}
                            className="h-8 w-auto py-0 text-[12px]"
                          >
                            {LEAD_STATUS.map((s) => (
                              <option key={s} value={s}>
                                {s.toLowerCase()}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary" size="sm">
                            Set
                          </Button>
                        </form>

                        <form action={snoozeLead}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <input type="hidden" name="days" value="2" />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-[12px] font-medium text-ink-500 transition-colors hover:bg-ink-100"
                          >
                            +2 days
                          </button>
                        </form>

                        <form action={convertLead}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <button
                            type="submit"
                            className="rounded-md bg-good-50 px-2.5 py-1 text-[12px] font-semibold text-good-700 transition-colors hover:bg-good-100"
                          >
                            Make member
                          </button>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
