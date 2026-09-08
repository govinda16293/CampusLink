/**
 * Inline SVG icons.
 *
 * Kept inline rather than pulled from an icon package: there are eight of them, they inherit
 * `currentColor` so they follow the surrounding text, and it avoids shipping an icon library for
 * a handful of glyphs on the average student phone the proposal targets.
 *
 * All are decorative — every one sits next to a visible text label — so they carry
 * aria-hidden and are skipped by screen readers.
 */
const base = {
  'aria-hidden': 'true',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

export function MailIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 7 8.2 5.5a1.5 1.5 0 0 0 1.6 0L21 7" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

export function KeyIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M15.5 12v2.5" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4.1M6.5 7.4A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.8-.5" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4M3 3l18 18" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function PeopleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a6 6 0 0 0-1.8-4.3" />
    </svg>
  );
}

export function TargetIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function ShieldIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 2.8v5.4c0 4.2-2.9 7.6-7 9.3-4.1-1.7-7-5.1-7-9.3V5.8L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  );
}

/** The CampusLink mark — two offset facets, echoing the logo in the design. */
export function LogoMark(props) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.4 3.2 3.6 12.1a1.6 1.6 0 0 0 0 2.4l4 3.6 9.9-8.9a1.6 1.6 0 0 0 0-2.4l-4.1-3.6Z" />
      <path d="M24.4 13.9 14.5 22.8a1.6 1.6 0 0 0 0 2.4l4 3.6 9.9-8.9a1.6 1.6 0 0 0 0-2.4l-4-3.6Z" />
    </svg>
  );
}
