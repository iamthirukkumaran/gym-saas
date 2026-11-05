import Link from "next/link";

import { cn, inputClass, Select } from "./ui";
import { IconChevronLeft, IconChevronRight, IconSearch } from "./icons";

/**
 * List controls built as plain GET forms.
 *
 * No client JavaScript: filters are URL state, which means every filtered
 * view is shareable, bookmarkable and back-button friendly. A front-desk
 * laptop with a flaky connection still gets a working filter.
 */

export function SearchFilters({
  action,
  q,
  placeholder = "Search…",
  children,
  hidden,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  children?: React.ReactNode;
  /** Values preserved across submissions (e.g. the active tab). */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}

      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className={cn(inputClass, "pl-9")}
          aria-label="Search"
        />
      </div>

      {children}

      <button
        type="submit"
        className="h-10 shrink-0 rounded-lg bg-ink-900 px-4 text-sm font-medium text-white transition-colors hover:bg-ink-800"
      >
        Apply
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
  label,
}: {
  name: string;
  value?: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select name={name} defaultValue={value ?? ""} aria-label={label} className="h-10 w-auto shrink-0">
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Builds a URL with the given params merged over the current ones. */
export function buildUrl(
  base: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...overrides })) {
    if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function Pagination({
  base,
  params,
  page,
  pageSize,
  total,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Compact window around the current page, so 40 pages don't wrap the row.
  const window: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i++) window.push(i);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 px-4 py-3"
    >
      <p className="nums text-[12.5px] text-ink-500">
        Showing <strong className="font-semibold text-ink-700">{from}–{to}</strong> of{" "}
        <strong className="font-semibold text-ink-700">{total}</strong>
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={buildUrl(base, params, { page: page - 1 })}
          disabled={page <= 1}
          label="Previous page"
        >
          <IconChevronLeft className="size-4" />
        </PageLink>

        {window[0] > 1 ? <span className="px-1 text-ink-400">…</span> : null}

        {window.map((p) => (
          <Link
            key={p}
            href={buildUrl(base, params, { page: p })}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "nums grid size-8 place-items-center rounded-md text-[13px] font-medium transition-colors",
              p === page
                ? "bg-brand-600 text-white"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            {p}
          </Link>
        ))}

        {window[window.length - 1] < pages ? <span className="px-1 text-ink-400">…</span> : null}

        <PageLink
          href={buildUrl(base, params, { page: page + 1 })}
          disabled={page >= pages}
          label="Next page"
        >
          <IconChevronRight className="size-4" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="grid size-8 cursor-not-allowed place-items-center rounded-md text-ink-300"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-8 place-items-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
    >
      {children}
    </Link>
  );
}
