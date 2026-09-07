import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const FIELD_LABEL = {
  branch: 'branch',
  year: 'year of study',
  gender: 'gender',
  interests: 'interests',
};

/**
 * Prompts a student to finish their profile.
 *
 * Deliberately dismissible and never blocking. Onboarding is optional by design: the request
 * queue in Step 10 ranks partly on profile completeness, and that signal only carries information
 * if incomplete profiles genuinely exist. Forcing everyone to 100% would make it meaningless.
 *
 * Dismissal is per-browser and deliberately not persisted to the account — it is a nudge, and it
 * is reasonable for it to come back on the next device.
 */
export function ProfileNudge() {
  const user = useAuthStore((state) => state.user);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('campuslink.nudge.dismissed') === '1';
    } catch {
      return false;
    }
  });

  const completeness = user?.profileCompleteness ?? 100;
  if (dismissed || completeness >= 100) return null;

  const missing = (user?.missingProfileFields ?? []).map((field) => FIELD_LABEL[field] ?? field);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem('campuslink.nudge.dismissed', '1');
    } catch {
      // Storage blocked — the nudge simply reappears on the next page load.
    }
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-brand-800">
            Your profile is {completeness}% complete
          </h2>
          <p className="mt-1 text-sm text-brand-700">
            Add your {missing.slice(0, 2).join(' and ')} so we can suggest goals worth joining.
          </p>

          <div
            className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-brand-200"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <Link
            to="/profile/edit"
            className="mt-4 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Complete your profile
          </Link>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-800"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
