/**
 * Inline SVG icons.
 *
 * Kept inline rather than pulled from an icon package: there are only a handful, they inherit
 * `currentColor` so they follow the surrounding text, and it avoids shipping an icon library for
 * a few glyphs on the average student phone the proposal targets.
 *
 * All carry aria-hidden. Each one either sits next to a visible text label, or is the only
 * content of a control that names itself with aria-label (the back and post buttons).
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

export function ChevronLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronUpDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
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

/*
 * Category symbols. Line glyphs in the same weight as the rest of the set, drawn rather than
 * borrowed from the emoji font: emoji render differently on every platform and read as clip art
 * next to SF text.
 */
export function BallIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17" />
      <path d="M6.2 5.8a11 11 0 0 1 0 12.4M17.8 5.8a11 11 0 0 0 0 12.4" />
    </svg>
  );
}

export function DumbbellIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.8 7.8v8.4M17.2 7.8v8.4" strokeWidth="2.6" />
      <path d="M3.6 10.4v3.2M20.4 10.4v3.2M6.8 12h10.4" />
    </svg>
  );
}

export function BookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 7.8v11.9" />
      <path d="M12 7.8C10.6 6.3 8.7 5.8 5 5.8v11c3.7 0 5.6.5 7 2 1.4-1.5 3.3-2 7-2v-11c-3.7 0-5.6.5-7 2Z" />
    </svg>
  );
}

export function CarIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.6 16.4v-3.1l1.9-4.5A1.6 1.6 0 0 1 7 7.8h10a1.6 1.6 0 0 1 1.5 1l1.9 4.5v3.1" />
      <path d="M3.6 13.3h16.8" />
      <circle cx="7.6" cy="16.6" r="1.7" />
      <circle cx="16.4" cy="16.6" r="1.7" />
    </svg>
  );
}

export function ForkKnifeIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5v5.2a2.2 2.2 0 0 0 4.4 0V3.5M9.2 10.9V20.5M7 3.5v3.4M11.4 3.5v3.4" />
      <path d="M16.6 20.5v-7.4c1.6-.5 2.6-2.2 2.6-4.6 0-2.8-1.2-5-2.6-5S14 5.7 14 8.5c0 2.4 1 4.1 2.6 4.6Z" />
    </svg>
  );
}

export function TicketIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="7" width="17" height="10" rx="2.2" />
      <path d="M14 7v1.6M14 11.2v1.6M14 15.4V17" />
    </svg>
  );
}

export function DocIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M13 3.5V9h5M8.5 13.5h7M8.5 17h4.5" />
    </svg>
  );
}

export function DotsCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.3 12h.01M12 12h.01M15.7 12h.01" strokeWidth="2.4" />
    </svg>
  );
}

export function GridIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="2.2" />
      <rect x="13" y="4" width="7" height="7" rx="2.2" />
      <rect x="4" y="13" width="7" height="7" rx="2.2" />
      <rect x="13" y="13" width="7" height="7" rx="2.2" />
    </svg>
  );
}
