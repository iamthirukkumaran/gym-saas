/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from an icon package: the app needs ~40
 * glyphs, and shipping a whole library for that is dead weight on a product
 * whose buyers are often on slow mobile connections. All icons are 24×24,
 * stroke-based, and inherit `currentColor`.
 */
type IconProps = { className?: string; strokeWidth?: number };

function svg(path: React.ReactNode, { className = "size-5", strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
    p,
  );

export const IconUsers = (p: IconProps) =>
  svg(
    <>
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 19v-1.5a4 4 0 0 0-3-3.87M16.5 3.6a3.5 3.5 0 0 1 0 6.8" />
    </>,
    p,
  );

export const IconUserPlus = (p: IconProps) =>
  svg(
    <>
      <path d="M15 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="8.5" cy="7" r="3.5" />
      <path d="M19 8v6M22 11h-6" />
    </>,
    p,
  );

export const IconRenew = (p: IconProps) =>
  svg(
    <>
      <path d="M21 12a9 9 0 1 1-3.2-6.9" />
      <path d="M21 4v5h-5" />
    </>,
    p,
  );

export const IconWallet = (p: IconProps) =>
  svg(
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19M17 14.5h1.5" />
    </>,
    p,
  );

export const IconRupee = (p: IconProps) =>
  svg(
    <>
      <path d="M7 4h10M7 8.5h10M15.5 4c0 4-3 4.5-6 4.5h-.5l6.5 7.5" />
      <path d="M7 20h4" />
    </>,
    p,
  );

export const IconCalendarCheck = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4" />
    </>,
    p,
  );

export const IconWhatsApp = (p: IconProps) =>
  svg(
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.9A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.8 8.3c.3-.6 1.2-.5 1.5.1l.5 1.1c.2.4 0 .8-.3 1-.3.3-.3.5-.1.8.5.8 1.2 1.4 2 1.8.3.2.6.1.8-.2.2-.3.6-.5 1-.3l1.1.5c.6.3.7 1.2.1 1.5-1.6.9-3.6.3-5.3-1.4-1.7-1.7-2.3-3.7-1.3-4.9Z" />
    </>,
    p,
  );

export const IconMegaphone = (p: IconProps) =>
  svg(
    <>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 3.5V6.5L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8.5a5 5 0 0 1 0 7M17 6a8.5 8.5 0 0 1 0 12M7 17.5V21" />
    </>,
    p,
  );

export const IconChart = (p: IconProps) =>
  svg(
    <>
      <path d="M3 21h18" />
      <rect x="4" y="12" width="4" height="7" rx="1" />
      <rect x="10" y="7" width="4" height="12" rx="1" />
      <rect x="16" y="4" width="4" height="15" rx="1" />
    </>,
    p,
  );

export const IconSettings = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V20a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 18.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4 12.6H4a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5.7 5.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11.4 4V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
    p,
  );

export const IconPlus = (p: IconProps) => svg(<path d="M12 5v14M5 12h14" />, p);
export const IconCheck = (p: IconProps) => svg(<path d="M4.5 12.5l5 5 10-11" />, p);
export const IconX = (p: IconProps) => svg(<path d="M6 6l12 12M18 6L6 18" />, p);

export const IconSearch = (p: IconProps) =>
  svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.2-4.2" />
    </>,
    p,
  );

export const IconFilter = (p: IconProps) =>
  svg(<path d="M4 5h16l-6.5 8v6l-3-2v-4L4 5Z" />, p);

export const IconDownload = (p: IconProps) =>
  svg(
    <>
      <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 18.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5" />
    </>,
    p,
  );

export const IconUpload = (p: IconProps) =>
  svg(
    <>
      <path d="M12 16V4M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 18.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5" />
    </>,
    p,
  );

export const IconAlert = (p: IconProps) =>
  svg(
    <>
      <path d="M10.3 3.9 2.4 17.2A1.9 1.9 0 0 0 4 20h16a1.9 1.9 0 0 0 1.6-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 16.5h.01" />
    </>,
    p,
  );

export const IconClock = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>,
    p,
  );

export const IconTrendUp = (p: IconProps) =>
  svg(
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>,
    p,
  );

export const IconTrendDown = (p: IconProps) =>
  svg(
    <>
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M21 17v-6h-6" />
    </>,
    p,
  );

export const IconLogout = (p: IconProps) =>
  svg(
    <>
      <path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </>,
    p,
  );

export const IconBuilding = (p: IconProps) =>
  svg(
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
    </>,
    p,
  );

export const IconShield = (p: IconProps) =>
  svg(
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.1-7.5 9.5-4.4-1.4-7.5-4.9-7.5-9.5V6L12 3Z" />
      <path d="M9.5 12l2 2 3.5-3.5" />
    </>,
    p,
  );

export const IconZap = (p: IconProps) =>
  svg(<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />, p);

export const IconBell = (p: IconProps) =>
  svg(
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </>,
    p,
  );

export const IconPhone = (p: IconProps) =>
  svg(
    <path d="M21.5 16.9v2.6a1.9 1.9 0 0 1-2.1 1.9 18.9 18.9 0 0 1-8.2-2.9 18.6 18.6 0 0 1-5.7-5.7A18.9 18.9 0 0 1 2.6 4.6 1.9 1.9 0 0 1 4.5 2.5h2.6a1.9 1.9 0 0 1 1.9 1.6c.1 1 .4 1.9.7 2.8a1.9 1.9 0 0 1-.4 2L8.2 10a15.3 15.3 0 0 0 5.8 5.8l1.1-1.1a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.8.7a1.9 1.9 0 0 1 1.6 1.9Z" />,
    p,
  );

export const IconMail = (p: IconProps) =>
  svg(
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>,
    p,
  );

export const IconEdit = (p: IconProps) =>
  svg(
    <>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="M14.5 5.5 18.5 9.5" />
    </>,
    p,
  );

export const IconTrash = (p: IconProps) =>
  svg(
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>,
    p,
  );

export const IconChevronRight = (p: IconProps) => svg(<path d="M9 5l7 7-7 7" />, p);
export const IconChevronLeft = (p: IconProps) => svg(<path d="M15 5l-7 7 7 7" />, p);
export const IconChevronDown = (p: IconProps) => svg(<path d="M5 9l7 7 7-7" />, p);

export const IconExternal = (p: IconProps) =>
  svg(
    <>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>,
    p,
  );

export const IconSnowflake = (p: IconProps) =>
  svg(
    <>
      <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" />
      <path d="M9 4.5 12 7l3-2.5M9 19.5 12 17l3 2.5" />
    </>,
    p,
  );

export const IconFile = (p: IconProps) =>
  svg(
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h5" />
    </>,
    p,
  );

export const IconPlay = (p: IconProps) => svg(<path d="M7 4.5v15l12-7.5-12-7.5Z" />, p);

export const IconSparkles = (p: IconProps) =>
  svg(
    <>
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
      <path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
    </>,
    p,
  );

export const IconLock = (p: IconProps) =>
  svg(
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>,
    p,
  );

export const IconMenu = (p: IconProps) => svg(<path d="M4 7h16M4 12h16M4 17h16" />, p);

export const IconTarget = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>,
    p,
  );

export const IconFlame = (p: IconProps) =>
  svg(
    <path d="M12 2.5s5.5 4.5 5.5 10a5.5 5.5 0 0 1-11 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3s1.5-1 1.5-2.5c0-2.5-1-4-1-6Z" />,
    p,
  );

export const IconInbox = (p: IconProps) =>
  svg(
    <>
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
      <path d="M5.5 4h13l2.5 9v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l2.5-9Z" />
    </>,
    p,
  );

export const IconHistory = (p: IconProps) =>
  svg(
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10h5" />
      <path d="M12 8v4.5l3 1.5" />
    </>,
    p,
  );

export const IconPin = (p: IconProps) =>
  svg(
    <>
      <path d="M9 4h6l-.6 5.2a3 3 0 0 0 1.1 2.7l1.7 1.4a1 1 0 0 1-.6 1.7H7.4a1 1 0 0 1-.6-1.7l1.7-1.4a3 3 0 0 0 1.1-2.7L9 4Z" />
      <path d="M12 15v5" />
    </>,
    p,
  );

export const IconPanelLeft = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9.5 4v16" />
    </>,
    p,
  );
