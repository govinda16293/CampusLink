import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { goalsApi } from '../api/goals';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { CalendarIcon, ChevronLeftIcon, PeopleIcon, ShieldIcon } from '../components/ui/icons';
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
    return <p className="py-16 text-center text-sm text-label-secondary">Loading…</p>;
  }
  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }

  const { goal } = state;
  const { poster } = goal;
  const full = goal.spotsLeft === 0;

  // The three facts that decide whether to join, as tiles in the manner of Control Center.
  const facts = [
    { icon: CalendarIcon, label: 'When', value: formatGoalWhen(goal.dateTime) },
    {
      icon: PeopleIcon,
      label: 'Spots',
      value: `${goal.acceptedCount} of ${goal.headcount} joined`,
      emphasis: !full,
    },
    {
      icon: ShieldIcon,
      label: 'Joining',
      value:
        goal.genderPreference === 'ANY'
          ? 'Open to anyone'
          : goal.genderPreference === 'FEMALE_ONLY'
            ? 'Women only'
            : 'Men only',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/"
        aria-label="Back to feed"
        className="glass-control inline-flex size-11 items-center justify-center rounded-full text-label transition duration-300 ease-spring active:scale-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ChevronLeftIcon className="size-5" />
      </Link>

      <section className="glass rounded-4xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryBadge category={goal.category} />
          <span className="text-xs font-medium text-label-secondary">
            Posted {formatPostedAt(goal.createdAt)}
          </span>
        </div>

        <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-label">
          {goal.title}
        </h1>
        <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-label-secondary">
          {goal.description}
        </p>

        <dl className="mt-7 grid gap-3 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value, emphasis }) => (
            <div key={label} className="glass-control rounded-[1.25rem] p-4">
              <dt className="text-xs font-medium text-label-secondary">
                <span
                  aria-hidden="true"
                  className="mb-3 flex size-9 items-center justify-center rounded-full bg-accent/12 text-accent"
                >
                  <Icon className="size-4.5" />
                </span>
                {label}
              </dt>
              <dd
                className={`mt-0.5 text-[15px] font-semibold ${emphasis ? 'text-link' : 'text-label'}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass rounded-4xl p-6 sm:p-8">
        <h2 className="text-[13px] font-semibold text-label-secondary">Posted by</h2>

        <div className="mt-4 flex items-center gap-4">
          {poster.isAnonymous ? (
            <>
              <span
                aria-hidden="true"
                className="glass-control inline-flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-label-secondary"
              >
                ?
              </span>
              <div>
                <p className="font-semibold text-label">Anonymous student</p>
                <p className="text-sm text-label-secondary">
                  Their name is revealed to you if they accept your request.
                </p>
              </div>
            </>
          ) : (
            <>
              <Avatar name={poster.name} id={poster.id} photoUrl={poster.photoUrl} size="md" />
              <div>
                <p className="font-semibold text-label">{goal.isOwnGoal ? 'You' : poster.name}</p>
                <p className="text-sm text-label-secondary">
                  {poster.branch ?? 'Branch not set'}
                  {poster.year ? ` · Year ${poster.year}` : ''}
                </p>
              </div>
            </>
          )}

          <div className="ml-auto text-right">
            <p className="text-xs font-medium text-label-secondary">Reliability</p>
            <p className="text-2xl font-bold tabular-nums tracking-[-0.02em] text-label">
              {poster.reliabilityScore}
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-4xl p-6 sm:p-8">
        {goal.isOwnGoal ? (
          <>
            <p className="text-[15px] text-label-secondary">
              This is your goal. Requests to join will appear here in the next step.
            </p>
            <Button
              variant="secondary"
              loading={cancelling}
              onClick={handleCancel}
              className="mt-4"
            >
              Cancel this goal
            </Button>
          </>
        ) : (
          <>
            <p className="text-[15px] text-label-secondary">
              Requesting to join arrives in Step 4 — the poster will approve or decline, and a lobby
              forms once enough people are in.
            </p>
            <Button disabled className="mt-4">
              {full ? 'Full' : 'Request to join'}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
