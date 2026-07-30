// Minimal dependency-free icon set used across the dashboards.
// All icons inherit color via currentColor so they can be styled with CSS.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const HexIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
    <path d="M12 8 16 10.3v4.4L12 17 8 14.7v-4.4L12 8Z" />
  </svg>
);

export const CodeIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M9 8 4 12l5 4" />
    <path d="M15 8l5 4-5 4" />
  </svg>
);

export const ChartIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 20V10" />
    <path d="M11 20V4" />
    <path d="M18 20v-7" />
  </svg>
);

export const BookIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);

export const PlusIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
    <path d="M19 6l-.8 13.3A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.7L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const SparkIcon = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
  </svg>
);

export const ArrowRightIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const LogoutIcon = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const ClipboardIcon = (p) => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
    <path d="M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

export const TargetIcon = (p) => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </svg>
);

export const TrophyIcon = (p) => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M8 21h8M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 5H4a3 3 0 0 0 3 5.5M17 5h3a3 3 0 0 1-3 5.5" />
  </svg>
);

export const TrendIcon = (p) => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M3 17l6-6 4 4 8-9" />
    <path d="M15 6h6v6" />
  </svg>
);

export const SchoolIcon = (p) => (
  <svg width="48" height="48" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 3 2 8l10 5 10-5-10-5Z" />
    <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
  </svg>
);

export const SearchIcon = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const LayersIcon = (p) => (
  <svg width="48" height="48" viewBox="0 0 24 24" {...base} {...p}>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="M2 12l10 5 10-5" />
    <path d="M2 17l10 5 10-5" />
  </svg>
);