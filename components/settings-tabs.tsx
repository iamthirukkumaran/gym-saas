"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "./ui";

export function SettingsTabsClient({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="thin-scroll mb-5 flex gap-1 overflow-x-auto border-b border-ink-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
