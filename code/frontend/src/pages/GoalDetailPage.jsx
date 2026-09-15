import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { REQUEST_MESSAGE_MAX } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { requestsApi } from '../api/requests';
import { JoinRequestRow } from '../components/JoinRequestRow';
import { Avatar } from '../components/ui/Avatar';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { Field } from '../components/ui/Field';
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  PeopleIcon,
  ShieldIcon,
} from '../components/ui/icons';
import { formatGoalWhen, formatPostedAt } from '../lib/formatGoal';

/** Requests still worth showing the poster: ones to decide on, and the people already going. */
const stillRelevant = (request) => request.status === 'PENDING' || request.status === 'ACCEPTED';

export function GoalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', goal: null, error: null });
  const [actionError, setActionError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // The student's side: an optional note, and whether a request is on its way.
  const [note, setNote] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);

  // The poster's side: who asked, and which of them is mid-decision.
  const [requests, setRequests] = useState({ status: 'idle', items: [], error: null });
  const [deciding, setDeciding] = useState({});

  const isOwnGoal = state.goal?.isOwnGoal === true;

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

  // Who asked to join is the poster's business alone, and the API refuses anyone else, so only the
  // poster's copy of this page asks for the list.
  useEffect(() => {
    if (!isOwnGoal) return undefined;
    let cancelled = false;
    setRequests({ status: 'loading', items: [], error: null });
    requestsApi
      .listForGoal(id)
      .then(({ requests: items }) => {
        if (!cancelled) setRequests({ status: 'ready', items, error: null });
      })
      .catch((error) => {
        if (!cancelled) setRequests({ status: 'error', items: [], error });
      });
    return () => {
      cancelled = true;
    };
  }, [id, isOwnGoal]);

  // Every action answers with the goal as the server now sees it. Adopting that, rather than
  // adjusting spots or status here, is what keeps this page from drifting from the truth.
  function adoptGoal(goal) {
    setState((current) => ({ ...current, goal }));
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError(null);
    try {
      await goalsApi.cancel(id);
      navigate('/', { replace: true });
    } catch (error) {
      // Previously this wrote the error into page state that nothing rendered once loaded, so a
      // failed cancel looked like a button that did nothing.
      setActionError(error);
      setCancelling(false);
    }
  }

  async function handleRequest() {
    setJoinBusy(true);
    setActionError(null);
    try {
      const { goal } = await requestsApi.create(id, note.trim());
      adoptGoal(goal);
      setNote('');
    } catch (error) {
      setActionError(error);
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleWithdraw() {
    const requestId = state.goal?.viewerRequest?.id;
    if (!requestId) return;
    setJoinBusy(true);
    setActionError(null);
    try {
      const { goal } = await requestsApi.withdraw(requestId);
      adoptGoal(goal);
    } catch (error) {
      setActionError(error);
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleDecision(requestId, action) {
    setDeciding((current) => ({ ...current, [requestId]: action }));
    setActionError(null);
    try {
      const { request, goal } = await requestsApi[action](requestId);
      adoptGoal(goal);
      setRequests((current) => ({
        ...current,
        items: current.items
          .map((item) => (item.id === request.id ? request : item))
          .filter(stillRelevant),
      }));
    } catch (error) {
      setActionError(error);
    } finally {
      setDeciding((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    }
  }

  if (state.status === 'loading') {
    return <p className="py-16 text-center text-sm text-label-secondary">Loading…</p>;
  }
  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }

  const { goal } = state;
  const { poster, viewerRequest } = goal;
  const full = goal.spotsLeft === 0;
  const pending = requests.items.filter((request) => request.status === 'PENDING');
  const going = requests.items.filter((request) => request.status === 'ACCEPTED');

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

      {isOwnGoal ? (
        <>
          <section className="glass rounded-4xl p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-label">Requests to join</h2>
              {requests.status === 'ready' && (
                <span className="text-[13px] font-medium text-label-secondary">
                  {pending.length === 0 ? 'None waiting' : `${pending.length} waiting`}
                </span>
              )}
            </div>

            <Alert tone="error" className="mt-4">
              {actionError?.message}
            </Alert>
            <Alert tone="error" className="mt-4">
              {requests.error?.message}
            </Alert>

            {requests.status === 'loading' && (
              <p className="mt-3 text-[15px] text-label-secondary">Loading requests…</p>
            )}
            {requests.status === 'ready' && pending.length === 0 && (
              <p className="mt-3 text-[15px] text-label-secondary">
                {full
                  ? 'Every spot is taken, so there is nothing left to decide.'
                  : 'Nobody has asked yet. Requests appear here as they come in.'}
              </p>
            )}
            {pending.length > 0 && (
              <>
                {full && (
                  <p className="mt-3 text-[13px] text-label-secondary">
                    Every spot is taken. Someone has to leave before you can accept another.
                  </p>
                )}
                <ul className="mt-4 space-y-3">
                  {pending.map((request) => (
                    <JoinRequestRow
                      key={request.id}
                      request={request}
                      busy={deciding[request.id]}
                      canAccept={!full}
                      onAccept={() => handleDecision(request.id, 'accept')}
                      onReject={() => handleDecision(request.id, 'reject')}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="glass rounded-4xl p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-label">Going</h2>
              <span className="text-[13px] font-medium tabular-nums text-label-secondary">
                {goal.acceptedCount} of {goal.headcount}
              </span>
            </div>
            {requests.status === 'ready' &&
              (going.length === 0 ? (
                <p className="mt-3 text-[15px] text-label-secondary">
                  Nobody has been accepted yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {going.map((request) => (
                    <JoinRequestRow key={request.id} request={request} />
                  ))}
                </ul>
              ))}
            <Button
              variant="secondary"
              loading={cancelling}
              onClick={handleCancel}
              className="mt-6"
            >
              Cancel this goal
            </Button>
          </section>
        </>
      ) : (
        <section className="glass rounded-4xl p-6 sm:p-8">
          <Alert tone="error" className="mb-4">
            {actionError?.message}
          </Alert>

          {viewerRequest?.status === 'ACCEPTED' ? (
            <>
              <StatusLine icon={CheckCircleIcon} tone="positive" title="You're in">
                The poster accepted you
                {goal.anonymous ? ', so their name is now shown above' : ''}. Group chat for sorting
                out the details is on its way.
              </StatusLine>
              <Button
                variant="secondary"
                loading={joinBusy}
                onClick={handleWithdraw}
                className="mt-5"
              >
                Leave this goal
              </Button>
            </>
          ) : viewerRequest?.status === 'PENDING' ? (
            <>
              <StatusLine icon={ClockIcon} tone="accent" title="Request sent">
                The poster has not decided yet. Their answer will show here.
              </StatusLine>
              <Button
                variant="secondary"
                loading={joinBusy}
                onClick={handleWithdraw}
                className="mt-5"
              >
                Withdraw request
              </Button>
            </>
          ) : goal.viewerCanRequest ? (
            <>
              <h2 className="text-[17px] font-semibold text-label">
                {goal.autoAccept ? 'Join this goal' : 'Ask to join'}
              </h2>
              <p className="mt-1 text-[15px] text-label-secondary">
                {goal.autoAccept
                  ? 'The poster accepts automatically, so you are in the moment you join.'
                  : 'The poster sees your profile and reliability, and decides.'}
              </p>
              <Field
                className="mt-5"
                label="Note to the poster (optional)"
                name="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={REQUEST_MESSAGE_MAX}
                placeholder="Anything they should know"
                hint={`${note.length} of ${REQUEST_MESSAGE_MAX}`}
              />
              <Button loading={joinBusy} onClick={handleRequest} withArrow className="mt-5">
                {goal.autoAccept ? 'Join now' : 'Request to join'}
              </Button>
            </>
          ) : (
            <>
              {/* The reason comes from the same rule the API enforces, so it is never a guess. */}
              <p className="text-[15px] text-label-secondary">{goal.viewerRequestBlockedMessage}</p>
              <Button disabled className="mt-4">
                {full ? 'Full' : 'Request to join'}
              </Button>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** Where the student stands on this goal, with its symbol. Presentation only. */
function StatusLine({ icon: Icon, tone, title, children }) {
  const toneClass =
    tone === 'positive' ? 'bg-positive/15 text-positive-text' : 'bg-accent/12 text-accent';
  return (
    <div className="flex items-start gap-3.5">
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-[17px] font-semibold text-label">{title}</p>
        <p className="mt-0.5 text-[15px] text-label-secondary">{children}</p>
      </div>
    </div>
  );
}
