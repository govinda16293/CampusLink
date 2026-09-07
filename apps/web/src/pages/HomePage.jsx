import { GOAL_CATEGORIES, GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { useAuthStore } from '../store/authStore';
import { ProfileNudge } from '../components/ProfileNudge';

/**
 * Placeholder home screen for a signed-in student.
 *
 * Step 3 replaces the lower half with the real feed. The header and sign-out now live in
 * AppLayout, so this page holds only its own content.
 */
export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hey {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Post a goal, or join one someone else has posted.
        </p>
      </header>

      <ProfileNudge />

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
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
