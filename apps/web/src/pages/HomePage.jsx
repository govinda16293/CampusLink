import { GOAL_CATEGORIES, GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

/**
 * Placeholder home screen for a signed-in student.
 *
 * Step 3 replaces this with the real feed. For now it exists to prove the session survives a
 * refresh and that a protected route actually resolves the current user from the API.
 */
export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hey {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Sign out
        </Button>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your account
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Verified</dt>
            <dd className="font-medium text-emerald-700">{user?.isVerified ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Reliability</dt>
            <dd className="font-medium text-slate-900">{user?.reliabilityScore}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Goals completed</dt>
            <dd className="font-medium text-slate-900">{user?.goalsCompleted}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-500">
          Your profile (branch, year, hostel block, interests) comes next in Step 2.
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Coming in Step 3
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The public feed, filterable by these categories:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {GOAL_CATEGORIES.map((category) => (
            <li
              key={category}
              className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
            >
              {GOAL_CATEGORY_LABEL[category]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
