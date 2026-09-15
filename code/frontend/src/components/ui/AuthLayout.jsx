import { Brand } from './Brand';
import { PeopleIcon, ShieldIcon, TargetIcon } from './icons';

/**
 * The full-screen frame around signup, verification and login.
 *
 * The front door keeps the campus photograph and its scrim. The panels are the same clear, light
 * glass as the rest of the app, so the labels inside them stay dark; the only white type is what
 * sits on the photograph itself (`text-label-on-photo`, plus `.on-photo` for the shadow that
 * holds it against the busiest parts of the picture).
 *
 * Composition: brand and the three-step loop across the top, headline down the left, the glass
 * auth card on the right, and the value strip along the bottom as three glass capsules — each an
 * icon button beside a two-line label, like the modules in the design reference.
 *
 * Pages supply only their card contents — nothing below knows which screen it is wrapping, so
 * all three auth screens stay visually identical for free.
 */

/** The core loop from the proposal, as the top strip. Labels, not links: there is nowhere to go
 *  before signing in, and a nav item that does nothing is worse than one that is not there. */
const LOOP_STEPS = ['Post', 'Discover', 'Connect'];

const VALUE_PROPS = [
  { icon: PeopleIcon, title: 'People', copy: 'Beyond your friend circle', tint: 'text-[#0071e3]' },
  {
    icon: TargetIcon,
    title: 'Goals',
    copy: 'Turn plans into plans that happen',
    tint: 'text-[#e0325c]',
  },
  {
    icon: ShieldIcon,
    title: 'Trust',
    copy: 'Reliability you can actually see',
    tint: 'text-[#1f9a45]',
  },
];

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-backdrop relative min-h-full w-full overflow-hidden">
      {/* Everything sits above the readability scrim painted by .auth-backdrop::before. */}
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 lg:px-14">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Brand />

            <ul className="on-photo hidden items-center gap-2.5 text-[13px] font-semibold text-label-on-photo md:flex">
              {LOOP_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-label-on-photo/50">
                      ·
                    </span>
                  )}
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </header>

        <main className="flex flex-1 items-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero. Hidden on small screens, where the card should own the viewport rather
                than be pushed below a fold. */}
            <div className="hidden lg:block">
              <h1 className="on-photo text-7xl font-bold leading-[0.98] tracking-[-0.035em] text-label-on-photo xl:text-[5.5rem]">
                Find your
                <br />
                people.
              </h1>
              <p className="on-photo mt-6 max-w-lg text-2xl leading-snug text-balance text-label-on-photo">
                Beyond your friend circle, someone wants the same thing.
              </p>
            </div>

            {/* Auth card. */}
            <div className="mx-auto w-full max-w-md lg:justify-self-end">
              <div className="glass glass-bright rounded-4xl p-7 sm:p-9">
                <h2 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-label">
                  {title}
                </h2>
                {subtitle && <p className="mt-2 text-[15px] text-label-secondary">{subtitle}</p>}

                <div className="mt-7">{children}</div>

                {footer && (
                  <div className="mt-7 text-center text-[15px] text-label-secondary">{footer}</div>
                )}

                {/* The hero is hidden on small screens, so the tagline rides inside the card
                    instead of under it — the page should still say what CampusLink is on a phone,
                    and on the photograph at that height there is no scrim left to make white text
                    readable. */}
                <p className="mt-7 border-t border-separator pt-5 text-center text-[13px] font-semibold text-label-secondary lg:hidden">
                  Find your people — beyond your friend circle.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 sm:px-10 lg:px-14">
          <ul className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, title: heading, copy, tint }) => (
              <li
                key={heading}
                className="glass glass-bright flex items-center gap-3 rounded-full p-2 pr-5"
              >
                <span
                  className={`glass-control flex size-11 shrink-0 items-center justify-center rounded-full ${tint}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-tight text-label">{heading}</p>
                  <p className="truncate text-[13px] text-label-secondary">{copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
