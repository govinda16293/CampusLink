import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { formatGoalWhen, formatPostedAt } from '../lib/formatGoal';

export function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', goal: null, error: null });
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    goalsApi
      .byId(id)
      .then(({ goal }) => !cancelled && setState({ status: 'ready', goal, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', goal: null, error }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await goalsApi.cancel(id);
      navigate('/', { replace: true });
    } catch (error) {
      setState((s) => ({ ...s, error }));
      setCancelling(false);
    }
  }

  if (state.status === 'loading') {
    return <p className="py-16 text-center text-sm text-white/45">Loading…</p>;
  }
  if (state.status === 'error') {
    return (
      <Alert variant="dark" tone="error">
        {state.error.message}
      </Alert>
    );
  }

  const { goal } = state;
  const { poster } = goal;
  const full = goal.spotsLeft === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/" className="inline-block text-sm text-white/50 hover:text-white">
        ← Back to feed
      </Link>

      <section className="frost-panel rounded-3xl p-7 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-amber-400/12 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/20">
            {GOAL_CATEGORY_LABEL[goal.category]}
          </span>
          <span className="text-xs text-white/40">Posted {formatPostedAt(goal.createdAt)}</span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">{goal.title}</h1>
        <p className="mt-3 whitespace-pre-line text-white/70">{goal.description}</p>

        <dl className="mt-7 grid gap-5 border-t border-white/8 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">When</dt>
            <dd className="mt-1 text-white">{formatGoalWhen(goal.dateTime)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">Spots</dt>
            <dd className={`mt-1 ${full ? 'text-white/50' : 'text-amber-300'}`}>
              {goal.acceptedCount} of {goal.headcount} joined
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-white/40">Joining</dt>
            <dd className="mt-1 text-white">
              {goal.genderPreference === 'ANY'
                ? 'Open to anyone'
                : goal.genderPreference === 'FEMALE_ONLY'
                  ? 'Women only'
                  : 'Men only'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="frost-panel rounded-3xl p-7 sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Posted by
        </h2>

        <div className="mt-4 flex items-center gap-4">
          {poster.isAnonymous ? (
            <>
              <span
                aria-hidden="true"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white/8 text-lg text-white/50"
              >
                ?
              </span>
              <div>
                <p className="font-medium text-white">Anonymous student</p>
                <p className="text-sm text-white/50">
                  Their name is revealed to you if they accept your request.
                </p>
              </div>
            </>
          ) : (
            <>
              <Avatar name={poster.name} id={poster.id} photoUrl={poster.photoUrl} size="md" />
              <div>
                <p className="font-medium text-white">{goal.isOwnGoal ? 'You' : poster.name}</p>
                <p className="text-sm text-white/50">
                  {poster.branch ?? 'Branch not set'}
                  {poster.year ? ` · Year ${poster.year}` : ''}
                </p>
              </div>
            </>
          )}

          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-wide text-white/40">Reliability</p>
            <p className="text-lg font-semibold text-white">{poster.reliabilityScore}</p>
          </div>
        </div>
      </section>

      <section className="frost-panel rounded-3xl p-7 sm:p-8">
        {goal.isOwnGoal ? (
          <>
            <p className="text-sm text-white/60">
              This is your goal. Requests to join will appear here in the next step.
            </p>
            <Button
              variant="darkGhost"
              loading={cancelling}
              onClick={handleCancel}
              className="mt-4"
            >
              Cancel this goal
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-white/60">
              Requesting to join arrives in Step 4 — the poster will approve or decline, and a lobby
              forms once enough people are in.
            </p>
            <Button variant="amber" disabled className="mt-4">
              {full ? 'Full' : 'Request to join'}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
