import type { Metadata } from "next";

import { GymProfileForm } from "@/components/forms/settings-forms";
import { Card, CardHeader, Row } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { num } from "@/lib/format";

import { saveGymProfile } from "./actions";

export const metadata: Metadata = { title: "Gym profile" };

export default async function GymProfileSettingsPage() {
  const { gym, staff } = await requireStaff();

  const [memberCount, staffCount, planCount] = await Promise.all([
    db.member.count({ where: { gymId: gym.id, status: { not: "CANCELLED" } } }),
    db.staffUser.count({ where: { gymId: gym.id, active: true } }),
    db.membershipPlan.count({ where: { gymId: gym.id, active: true } }),
  ]);

  const canEdit = staff.role === "OWNER" || staff.role === "MANAGER";

  return (
    <div className="space-y-5">
      <GymProfileForm
        action={saveGymProfile}
        canEdit={canEdit}
        values={{
          name: gym.name,
          ownerName: gym.ownerName,
          phone: gym.phone,
          addressLine: gym.addressLine ?? "",
          city: gym.city ?? "",
          state: gym.state ?? "",
          pincode: gym.pincode ?? "",
          gstin: gym.gstin ?? "",
          upiId: gym.upiId ?? "",
          timezone: gym.timezone,
        }}
      />

      <Card>
        <CardHeader title="Account" subtitle="Read-only details for support." />
        <dl className="mt-3">
          <Row label="Gym ID" value={<code className="font-mono text-[12px]">{gym.slug}</code>} />
          <Row label="Login email" value={gym.email} />
          <Row label="Account status" value={gym.status.replace("_", " ").toLowerCase()} />
          <Row label="Created" value={fmtDate(gym.createdAt)} />
          <Row label="Active members" value={num(memberCount)} />
          <Row label="Staff logins" value={num(staffCount)} />
          <Row label="Active plans" value={num(planCount)} />
        </dl>
        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-500">
          The login email is tied to your subscription and can only be changed by Astryx
          support, so that billing and your account can never drift apart.
        </p>
      </Card>
    </div>
  );
}
