import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogoMark, PeopleIcon, TargetIcon } from './ui/icons';
import { Button } from './ui/Button';

/**
 * The shell around every signed-in page.
 *
 * Follows the supplied design: a near-transparent top bar carrying only identity and sign-out,
 * and a floating frosted pill for navigation at the foot of the screen. Introduced in Step 2 so
 * the feed, goal detail and lobby pages in Steps 3–5 inherit one shell rather than each
 * inventing its own.
 *
 * The nav lives in the bottom pill rather than the header because it is where a thumb reaches on
 * a phone, which is where the proposal expects most use.
 */
const NAV = [
  { to: '/', label: 'Feed', icon: TargetIcon, end: true },
  { to: '/profile', label: 'Profile', icon: PeopleIcon, end: false },
];

export function AppLayout() {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="app-backdrop relative min-h-full">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-80"
          >
            <LogoMark className="size-6 text-amber-400" />
            <span className="text-sm font-semibold tracking-[0.28em]">CAMPUSLINK</span>
          </Link>

          <Button variant="darkGhost" onClick={logout} className="px-4 py-2 text-xs">
            Sign out
          </Button>
        </header>

        {/* Bottom padding clears the floating nav so content never hides behind it. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-40 pt-2 sm:px-8">
          <Outlet />
        </main>

        <nav className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <ul className="frost-panel pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
