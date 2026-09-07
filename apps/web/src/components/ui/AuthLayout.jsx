import { Link } from 'react-router-dom';
import { LogoMark, PeopleIcon, ShieldIcon, TargetIcon } from './icons';

/**
 * The full-screen frame around signup, verification and login.
 *
 * Composition follows the design: campus photograph behind everything, brand and the three-step
 * loop across the top, headline down the left, frosted auth card on the right, and the value
 * strip along the bottom.
 *
 * Pages supply only their card contents — nothing below knows which screen it is wrapping, so
 * all three auth screens stay visually identical for free.
 */

/** The core loop from the proposal, as the top strip. Labels, not links: there is nowhere to go
 *  before signing in, and a nav item that does nothing is worse than one that is not there. */
const LOOP_STEPS = ['POST', 'DISCOVER', 'CONNECT'];

const VALUE_PROPS = [
  { icon: PeopleIcon, title: 'PEOPLE', copy: 'Beyond your friend circle' },
  { icon: TargetIcon, title: 'GOALS', copy: 'Turn plans into plans that happen' },
  { icon: ShieldIcon, title: 'TRUST', copy: 'Reliability you can actually see' },
];

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-backdrop relative min-h-full w-full overflow-hidden">
      {/* Everything sits above the readability scrim painted by .auth-backdrop::before. */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-14">
          <Link
            to="/"
            className="flex items-center gap-3 text-white transition-opacity hover:opacity-80"
          >
            <LogoMark className="size-7" />
            <span className="text-lg font-semibold tracking-[0.3em] sm:text-xl">CAMPUSLINK</span>
          </Link>

          <ul className="hidden items-center gap-5 text-[0.7rem] font-medium tracking-[0.2em] text-white/85 md:flex">
            {LOOP_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-5">
                {index > 0 && <span aria-hidden="true" className="h-3.5 w-px bg-white/35" />}
                {step}
              </li>
            ))}
          </ul>
        </header>

        <main className="flex flex-1 items-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Hero. Hidden on small screens, where the card should own the viewport rather
                than be pushed below a fold. */}
            <div className="hidden lg:block">
              <h1 className="text-6xl font-extrabold leading-[0.95] tracking-tight text-white xl:text-7xl">
                FIND
                <br />
                YOUR
                <br />
                PEOPLE.
              </h1>
              <p className="mt-7 text-[0.72rem] font-medium leading-[1.9] tracking-[0.22em] text-white/80">
                BEYOND YOUR FRIEND CIRCLE
                <br />
                SOMEONE WANTS THE SAME THING
              </p>
            </div>

            {/* Auth card. */}
            <div className="mx-auto w-full max-w-md lg:justify-self-end">
              <div className="glass-panel rounded-3xl p-7 sm:p-9">
                <h2 className="text-3xl font-bold tracking-tight text-white">{title}</h2>
                {subtitle && <p className="mt-2 text-sm text-white/75">{subtitle}</p>}

                <div className="mt-7">{children}</div>

                {footer && <div className="mt-7 text-center text-sm text-white/75">{footer}</div>}
              </div>

              {/* The hero is hidden on small screens, so the tagline rides under the card
                  instead — the page should still say what CampusLink is on a phone. */}
              <p className="mt-6 text-center text-[0.65rem] font-medium tracking-[0.22em] text-white/70 lg:hidden">
                FIND YOUR PEOPLE — BEYOND YOUR FRIEND CIRCLE
              </p>
            </div>
          </div>
        </main>

        <footer className="px-6 pb-8 pt-4 sm:px-10 lg:px-14">
          <ul className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:gap-0">
            {VALUE_PROPS.map(({ icon: Icon, title: heading, copy }, index) => (
              <li key={heading} className="flex flex-1 items-center gap-4">
                {index > 0 && (
                  <span aria-hidden="true" className="hidden h-9 w-px bg-white/25 sm:block" />
                )}
                <div className="flex items-center gap-3 sm:pl-6">
                  <Icon className="size-6 shrink-0 text-white/90" />
                  <div>
                    <p className="text-[0.7rem] font-bold tracking-[0.18em] text-white">
                      {heading}
                    </p>
                    <p className="text-[0.8rem] text-white/75">{copy}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
