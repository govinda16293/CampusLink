import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogoMark } from './ui/icons';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

/**
 * The shell around every signed-in page.
 *
 * Introduced in Step 2 so the feed, goal detail and lobby pages in Steps 3–5 inherit one header
 * instead of each inventing its own — HomePage previously carried a one-off version.
 */
const NAV = [
  { to: '/', label: 'Feed', end: true },
  { to: '/profile', label: 'Profile', end: false },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900">
            <LogoMark className="size-6 text-brand-600" />
            <span className="text-sm font-semibold tracking-[0.2em]">CAMPUSLINK</span>
          </Link>

          <nav className="ml-2 flex items-center gap-1">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link to="/profile" className="hidden sm:block" aria-label="Your profile">
              <Avatar name={user?.name} id={user?.id} photoUrl={user?.photoUrl} size="sm" />
            </Link>
            <Button variant="secondary" onClick={logout} className="px-3 py-1.5 text-xs">
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
