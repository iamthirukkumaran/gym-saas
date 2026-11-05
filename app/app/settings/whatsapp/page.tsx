import type { Metadata } from "next";

import { WaConnectionForm } from "@/components/forms/settings-forms";
import { Card, CardHeader, Row, Stat } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROVIDERS, getProvider } from "@/lib/whatsapp";
import { monthBounds } from "@/lib/dates";
import { money, num } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

import { saveWaConnection, sendWaTest } from "../actions";

export const metadata: Metadata = { title: "WhatsApp" };

export default async function WhatsAppSettingsPage() {
  const { gym } = await requireStaff();
  const month = monthBounds(new Date(), gym.timezone);

  const [sent, failed, cost, templateCount] = await Promise.all([
    db.messageLog.count({
      where: {
        gymId: gym.id,
        status: { in: ["SENT", "DELIVERED", "READ"] },
        createdAt: { gte: month.start, lt: month.end },
      },
    }),
    db.messageLog.count({
      where: { gymId: gym.id, status: "FAILED", createdAt: { gte: month.start, lt: month.end } },
    }),
    db.messageLog.aggregate({
      where: { gymId: gym.id, createdAt: { gte: month.start, lt: month.end } },
      _sum: { costPaise: true },
    }),
    db.waTemplate.count({ where: { gymId: gym.id, active: true } }),
  ]);

  const provider = getProvider(gym.waProvider);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Connection"
          value={gym.waConnected ? "Connected" : "Incomplete"}
          sub={provider.label}
          tone={gym.waConnected ? "good" : "warn"}
        />
        <Stat label="Sent this month" value={num(sent)} sub="delivered to members" />
        <Stat
          label="Failed this month"
          value={num(failed)}
          sub="see the message log"
          tone={failed > 0 ? "bad" : "neutral"}
        />
        <Stat
          label="Estimated cost"
          value={money(cost._sum.costPaise ?? 0)}
          sub="at provider rates"
          tone="brand"
        />
      </div>

      <WaConnectionForm
        action={saveWaConnection}
        testAction={sendWaTest}
        providers={PROVIDERS}
        gymPhone={displayPhone(gym.phone)}
        values={{
          waProvider: gym.waProvider,
          waSenderDisplay: gym.waSenderDisplay ?? gym.name,
          waPhoneNumberId: gym.waPhoneNumberId ?? "",
          waBusinessId: gym.waBusinessId ?? "",
          hasToken: Boolean(gym.waAccessToken),
          hasApiKey: Boolean(gym.waApiKey),
        }}
      />

      <Card>
        <CardHeader title="Current configuration" />
        <dl className="mt-3">
          <Row label="Provider" value={provider.label} />
          <Row label="Sender name" value={gym.waSenderDisplay ?? gym.name} />
          <Row label="Phone number ID" value={gym.waPhoneNumberId ?? "—"} />
          <Row label="Access token" value={gym.waAccessToken ? "saved" : "not set"} />
          <Row label="API key" value={gym.waApiKey ? "saved" : "not set"} />
          <Row label="Active templates" value={num(templateCount)} />
        </dl>
      </Card>
    </div>
  );
}
