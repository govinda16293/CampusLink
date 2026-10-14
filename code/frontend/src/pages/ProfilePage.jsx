import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BRANCH_LABEL, reliabilityLabel } from '@campuslink/shared';
import { usersApi } from '../api/users';
import { safetyApi } from '../api/safety';
import { Button } from '../components/ui/Button';
import { ReportDialog } from '../components/ReportDialog';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { ButtonLink } from '../components/ui/Button';
import { ClockIcon, MailIcon, ShieldIcon, TargetIcon, UserIcon } from '../components/ui/icons';

/**
 * A student's profile.
 *
 * The layout is a portfolio hero, so its slots are mapped to what CampusLink actually knows about
 * a student: the eyebrow is their branch, the huge headline is their name, and the tile grid
 * holds the four attributes that matter when deciding whether to join someone's goal.
 *
 * Always fetches rather than reading the cached store user, because this same component renders
 * other students' profiles and the server decides what a viewer may see — email is present on
 * your own profile and absent on everyone else's, enforced server-side.
 */
export function ProfilePage() {
  const { id } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const isOwnProfile = !id || id === currentUser?.id;

  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', user: null, error: null });

    const request = id ? usersApi.byId(id) : usersApi.me();
    request
      .then(({ user }) => !cancelled && setState({ status: 'ready', user, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', user: null, error }));

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return <p className="py-16 text-center text-sm text-label-secondary">Loading profile…</p>;
  }

  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }

  const { user } = state;

  // Each tile's icon sits on a disc tinted in its own system colour, as Control Center does.
  const attributes = [
    isOwnProfile && {
      icon: MailIcon,
      label: 'Email',
      value: user.email,
      tint: 'bg-[#0071e3]/12 text-[#0071e3]',
    },
    {
      icon: UserIcon,
      label: 'Year of study',
      value: user.year ? `Year ${user.year}` : 'Not set',
      tint: 'bg-[#5856d6]/12 text-[#5856d6]',
    },
    {
      icon: ShieldIcon,
      label: 'Reliability',
      // The number and the words come from one place, so they cannot disagree.
      value: `${user.reliabilityScore} · ${reliabilityLabel(user.reliabilityScore)}`,
      tint: 'bg-[#34c759]/15 text-[#1f9a45]',
    },
    {
      icon: TargetIcon,
      label: 'Turned up to',
      value:
        user.goalsCompleted === 1 ? '1 finished goal' : `${user.goalsCompleted} finished goals`,
      tint: 'bg-[#ff9500]/15 text-[#e07000]',
    },
    // Only once there is one. A row reading "0 missed" on every new profile is noise, and it
    // invites a reader to go looking for a number that means nothing yet.
    user.noShowCount > 0 && {
      icon: ClockIcon,
      label: 'Missed',
      value: user.noShowCount === 1 ? '1 goal' : `${user.noShowCount} goals`,
      tint: 'bg-[#ff3b30]/12 text-[#c62d24]',
    },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <section className="glass relative rounded-4xl p-6 sm:p-10">
        {/* Status pill and primary action across the top row. */}
        <div className="flex items-start justify-between gap-4">
          <span className="glass-control inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-label">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${user.isVerified === false ? 'bg-[#ff9500]' : 'bg-positive'}`}
            />
            {isOwnProfile && user.isVerified === false ? 'Unverified' : 'Verified student'}
          </span>

          {isOwnProfile && (
            <ButtonLink to="/profile/edit" size="sm">
              Edit profile
            </ButtonLink>
          )}
        </div>

        <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-link">
              {user.branch ? BRANCH_LABEL[user.branch] : 'Branch not set'}
            </p>

            {/* The name is the headline. wrap-break-word so a long name cannot overflow the panel
                on a narrow screen. */}
            <h1 className="mt-2 wrap-break-word text-5xl font-bold leading-[0.98] tracking-[-0.035em] text-label sm:text-6xl">
              {user.name}
            </h1>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              {attributes.map(({ icon: Icon, label, value, tint }) => (
                <div key={label} className="glass-control min-w-0 rounded-[1.25rem] p-4">
                  <dt className="text-xs font-medium text-label-secondary">
                    <span
                      aria-hidden="true"
                      className={`mb-3 flex size-9 items-center justify-center rounded-full ${tint}`}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    {label}
                  </dt>
                  <dd className="mt-0.5 truncate text-[15px] font-semibold text-label">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Avatar name={user.name} id={user.id} photoUrl={user.photoUrl} size="xl" halo />
          </div>
        </div>
      </section>

      <section className="glass rounded-4xl p-6 sm:p-8">
        <h2 className="text-[13px] font-semibold text-label-secondary">Interests</h2>
        {user.interests.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <li
                key={interest}
                className="glass-control rounded-full px-4 py-1.5 text-sm font-medium text-label"
              >
                {interest}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-label-secondary">
            {isOwnProfile
              ? 'No interests yet — adding a few helps us suggest goals you would actually join.'
              : 'This student has not added any interests yet.'}
          </p>
        )}
      </section>

      {!isOwnProfile && <SafetySection userId={user.id} name={user.name} />}
    </div>
  );
}

/**
 * Reporting and blocking another student.
 *
 * Kept to the foot of their profile and in low-emphasis glass, because these are the two actions
 * on CampusLink that should be easy to find when wanted and impossible to hit by accident. The
 * copy says plainly what each one does: a report goes to a moderator, a block is silent and
 * mutual, and neither tells the other student anything.
 */
function SafetySection({ userId, name }) {
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function toggleBlock() {
    setBusy(true);
    setError(null);
    try {
      if (blocked) await safetyApi.unblock(userId);
      else await safetyApi.block(userId);
      setBlocked(!blocked);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  const firstName = name?.split(' ')[0] ?? 'this student';

  return (
    <section className="glass rounded-4xl p-6 sm:p-8">
      <h2 className="text-[17px] font-semibold text-label">Safety</h2>
      <p className="mt-1 text-[13px] text-label-secondary">
        {blocked
          ? `You and ${firstName} are hidden from each other. Neither of you will see the other’s goals.`
          : `Blocking is silent — ${firstName} is not told, and you stop seeing each other’s goals.`}
      </p>

      <Alert tone="error" className="mt-4">
        {error?.message}
      </Alert>

      {reporting ? (
        <ReportDialog target={{ userId }} onClose={() => setReporting(false)} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" loading={busy} onClick={toggleBlock}>
            {blocked ? `Unblock ${firstName}` : `Block ${firstName}`}
          </Button>
          <Button variant="secondary" onClick={() => setReporting(true)}>
            Report
          </Button>
        </div>
      )}

      {blocked && (
        <p className="mt-4 text-[13px] text-label-secondary">
          Blocking does not remove you from a group you have already joined together — leave that
          yourself from the goal if you want out.
        </p>
      )}
    </section>
  );
}
