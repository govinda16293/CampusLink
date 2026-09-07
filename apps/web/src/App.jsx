import { GOAL_CATEGORIES, GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { ApiStatusBanner } from './components/ApiStatusBanner';

/**
 * Application shell.
 *
 * Step 0 only proves the two dev servers, the shared package and the database are wired
 * together. React Router and real pages arrive in Step 1 with the auth screens.
 */
export default function App() {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">CampusLink</h1>
        <p className="mt-1 text-slate-600">
          Find people on campus to do things with — post a goal, form a lobby, get it done.
        </p>
      </header>

      <ApiStatusBanner />

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Goal categories
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Read from <code className="font-mono">@campuslink/shared</code>, the same module the API
          validates against.
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

      <footer className="mt-auto text-xs text-slate-400">
        UCS503 Software Engineering Lab · Thapar Institute of Engineering and Technology
      </footer>
    </div>
  );
}
