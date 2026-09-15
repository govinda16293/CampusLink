import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { ButtonLink } from './ui/Button';

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
    <section className="glass rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-label">
            Your profile is {completeness}% complete
          </h2>
          <p className="mt-1 text-sm text-label-secondary">
            Add your {missing.slice(0, 2).join(' and ')} so we can suggest goals worth joining.
          </p>

          <div
            className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/8 shadow-[inset_0_1px_1px_rgb(20_36_70/0.1)]"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completeness"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-[#5ac8fa] to-accent transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <ButtonLink to="/profile/edit" variant="secondary" size="sm" className="mt-4">
            Complete your profile
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="glass-control rounded-full p-2 text-label-secondary transition duration-300 ease-spring hover:text-label active:scale-[1.06] focus-visible:outline-2 focus-visible:outline-accent"
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
