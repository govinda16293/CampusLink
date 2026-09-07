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
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Hey {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Post a goal, or join one someone else has posted.
        </p>
      </header>

      <ProfileNudge />

      <section className="frost-panel rounded-3xl p-7">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Coming in Step 3
        </h2>
        <p className="mt-2 text-sm text-white/60">
          The public feed, filterable by these categories:
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {GOAL_CATEGORIES.map((category) => (
            <li
              key={category}
              className="rounded-full bg-amber-400/12 px-4 py-1.5 text-sm font-medium text-amber-200 ring-1 ring-inset ring-amber-300/20"
            >
              {GOAL_CATEGORY_LABEL[category]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
