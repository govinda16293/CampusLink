import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BRANCH_LABEL } from '@campuslink/shared';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

/**
 * A student's profile. Shows your own when no id is in the URL.
 *
 * Always fetches rather than reading the cached store user, because the same component renders
 * other students' profiles — and because the server decides what a viewer may see. The email is
 * present on your own profile and absent on everyone else's, and that is enforced server-side.
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
    return <p className="py-12 text-center text-sm text-slate-500">Loading profile…</p>;
  }

  if (state.status === 'error') {
    return (
      <Alert variant="solid" tone="error">
        {state.error.message}
      </Alert>
    );
  }

  const { user } = state;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={user.name} id={user.id} photoUrl={user.photoUrl} size="lg" />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{user.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {[
                user.branch ? BRANCH_LABEL[user.branch] : null,
                user.year ? `Year ${user.year}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'No branch or year set yet'}
            </p>
            {isOwnProfile && <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>}
          </div>

          {isOwnProfile && (
            <Link to="/profile/edit">
              <Button variant="secondary">Edit profile</Button>
            </Link>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Reliability
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{user.reliabilityScore}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Goals completed
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{user.goalsCompleted}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Member since
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Interests</h2>
        {user.interests.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
              >
                {interest}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            {isOwnProfile
              ? 'No interests yet — adding a few helps us suggest goals you would actually join.'
              : 'This student has not added any interests yet.'}
          </p>
        )}
      </section>
    </div>
  );
}
