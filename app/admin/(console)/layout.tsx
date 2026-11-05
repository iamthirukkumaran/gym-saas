import { AppShell } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/nav-config";
import { Badge } from "@/components/ui";
import { requirePlatform } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, todayInZone } from "@/lib/dates";

import { logoutPlatform } from "../login/actions";

/**
 * Platform admin chrome.
 *
 * Lives inside the `(console)` route group so that it wraps only the
 * authenticated admin pages. /admin/login sits outside the group — if it were
 * nested here, `requirePlatform()` would redirect the login page to itself.
 * Route groups don't appear in URLs, so /admin still resolves to
 * (console)/page.tsx.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatform();

  const today = todayInZone();
  const [failed, pastDue] = await Promise.all([
    db.messageLog.count({
      where: { status: "FAILED", createdAt: { gte: addDays(today, -7) } },
    }),
    db.gym.count({ where: { status: { in: ["PAST_DUE", "SUSPENDED"] } } }),
  ]);

  return (
    <AppShell
      sections={ADMIN_NAV}
      counts={{ failed, dues: pastDue }}
      role={user.role}
      brandHref="/admin"
      title="Astryx platform"
      subtitle={`${user.role === "SUPERADMIN" ? "Superadmin" : "Support (read-only)"} · all tenants`}
      badge={
        <Badge className="bg-ink-900 text-white ring-ink-900/20">internal</Badge>
      }
      userName={user.name}
      userMeta={user.email}
      logoutAction={logoutPlatform}
    >
      {children}
    </AppShell>
  );
}
