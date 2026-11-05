import type { ReactNode } from "react";

import {
  IconChart,
  IconCalendarCheck,
  IconDashboard,
  IconInbox,
  IconRenew,
  IconSettings,
  IconTarget,
  IconUsers,
  IconWallet,
  IconWhatsApp,
} from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Badge key resolved against counts passed from the server layout. */
  badge?: "expiring" | "dues" | "followups" | "failed";
  /** Roles allowed to see this item. Omitted = everyone. */
  roles?: readonly string[];
  exact?: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

export const GYM_NAV: NavSection[] = [
  {
    items: [
      { href: "/app", label: "Dashboard", icon: <IconDashboard className="size-[18px]" />, exact: true },
      { href: "/app/members", label: "Members", icon: <IconUsers className="size-[18px]" /> },
      { href: "/app/renewals", label: "Renewals", icon: <IconRenew className="size-[18px]" />, badge: "expiring" },
      { href: "/app/payments", label: "Payments", icon: <IconWallet className="size-[18px]" />, badge: "dues" },
      { href: "/app/attendance", label: "Attendance", icon: <IconCalendarCheck className="size-[18px]" /> },
      { href: "/app/enquiries", label: "Enquiries", icon: <IconTarget className="size-[18px]" />, badge: "followups" },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      { href: "/app/automations", label: "Automations", icon: <IconWhatsApp className="size-[18px]" /> },
      { href: "/app/templates", label: "Templates", icon: <IconInbox className="size-[18px]" /> },
      { href: "/app/outbox", label: "Message log", icon: <IconInbox className="size-[18px]" />, badge: "failed" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/app/reports", label: "Reports", icon: <IconChart className="size-[18px]" /> },
      { href: "/app/settings", label: "Settings", icon: <IconSettings className="size-[18px]" />, roles: ["OWNER", "MANAGER"] },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: <IconDashboard className="size-[18px]" />, exact: true },
      { href: "/admin/gyms", label: "Gyms", icon: <IconUsers className="size-[18px]" /> },
      { href: "/admin/billing", label: "Billing", icon: <IconWallet className="size-[18px]" /> },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/admin/plans", label: "Subscription plans", icon: <IconChart className="size-[18px]" /> },
      { href: "/admin/templates", label: "Template library", icon: <IconInbox className="size-[18px]" /> },
      { href: "/admin/messages", label: "Message delivery", icon: <IconWhatsApp className="size-[18px]" />, badge: "failed" },
      { href: "/admin/engine", label: "Engine runs", icon: <IconRenew className="size-[18px]" /> },
      { href: "/admin/audit", label: "Audit log", icon: <IconSettings className="size-[18px]" /> },
    ],
  },
];
