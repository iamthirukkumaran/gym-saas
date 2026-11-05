import { SettingsTabsClient } from "@/components/settings-tabs";
import { requireStaff } from "@/lib/auth";

/** Shared chrome for the settings area. Tabs are role-aware. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();

  const tabs = [
    { href: "/app/settings", label: "Gym profile" },
    { href: "/app/settings/plans", label: "Membership plans" },
    ...(staff.role === "OWNER" ? [{ href: "/app/settings/staff", label: "Staff & access" }] : []),
    { href: "/app/settings/whatsapp", label: "WhatsApp" },
    { href: "/app/settings/billing", label: "Subscription" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your gym, your plans, your team and your WhatsApp connection.
        </p>
      </div>
      <SettingsTabsClient tabs={tabs} />
      {children}
    </div>
  );
}
