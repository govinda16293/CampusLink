import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BRANCH_LABEL } from '@campuslink/shared';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { MailIcon, ShieldIcon, TargetIcon, UserIcon } from '../components/ui/icons';

/**
 * A student's profile, laid out to the supplied design.
 *
 * The design is a portfolio hero, so its slots are mapped to what CampusLink actually knows about
 * a student: the amber eyebrow is their branch, the huge headline is their name, and the contact
 * grid becomes the four attributes that matter when deciding whether to join someone's goal.
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
    return <p className="py-16 text-center text-sm text-white/50">Loading profile…</p>;
  }

  if (state.status === 'error') {
    return (
      <Alert variant="dark" tone="error">
        {state.error.message}
      </Alert>
    );
  }

  const { user } = state;

  const attributes = [
    isOwnProfile && { icon: MailIcon, label: 'Email', value: user.email },
    { icon: UserIcon, label: 'Year of study', value: user.year ? `Year ${user.year}` : 'Not set' },
    { icon: ShieldIcon, label: 'Reliability', value: `${user.reliabilityScore} / 100` },
    { icon: TargetIcon, label: 'Goals completed', value: String(user.goalsCompleted) },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="frost-panel relative overflow-hidden rounded-3xl p-7 sm:p-10">
        {/* Status pill and primary action, mirroring the design's top row. */}
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-sm text-white/70">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${user.isVerified === false ? 'bg-amber-400' : 'bg-emerald-400'}`}
            />
            {isOwnProfile && user.isVerified === false ? 'Unverified' : 'Verified student'}
          </span>

          {isOwnProfile && (
            <Link to="/profile/edit">
              <Button variant="amber" className="px-5 py-2.5 text-sm">
                Edit profile
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-lg font-bold text-amber-400">
              {user.branch ? BRANCH_LABEL[user.branch] : 'Branch not set'}
            </p>

            {/* The name is the design's headline. break-words so a long name cannot overflow
                the panel on a narrow screen. */}
            <h1 className="mt-2 break-words text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
              {user.name}
            </h1>

            <dl className="mt-9 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {attributes.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="size-5 shrink-0 text-amber-400" />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-wide text-white/45">{label}</dt>
                    <dd className="truncate text-[0.95rem] text-white">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Avatar
              name={user.name}
              id={user.id}
              photoUrl={user.photoUrl}
              size="xl"
              halo
              className="ring-1 ring-white/10"
            />
          </div>
        </div>
      </section>

      <section className="frost-panel rounded-3xl p-7 sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Interests
        </h2>
        {user.interests.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-amber-400/12 px-4 py-1.5 text-sm font-medium text-amber-200 ring-1 ring-inset ring-amber-300/20"
              >
                {interest}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            {isOwnProfile
              ? 'No interests yet — adding a few helps us suggest goals you would actually join.'
              : 'This student has not added any interests yet.'}
          </p>
        )}
      </section>
    </div>
  );
}
