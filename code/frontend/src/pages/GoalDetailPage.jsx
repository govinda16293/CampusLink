import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { REQUEST_MESSAGE_MAX } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { requestsApi } from '../api/requests';
import { JoinRequestRow } from '../components/JoinRequestRow';
import { LobbyRoster } from '../components/LobbyRoster';
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
import { useAuthStore } from '../store/authStore';
import { formatGoalWhen, formatPostedAt, LOBBY_STATE_LABEL } from '../lib/formatGoal';

/** Requests still worth showing the poster: ones to decide on, and the people already going. */
const stillRelevant = (request) => request.status === 'PENDING' || request.status === 'ACCEPTED';

/** What the poster can do to a goal in each state, and how it is worded. */
const LIFECYCLE_ACTIONS = {
  OPEN: [{ action: 'close', label: 'Confirm the group', variant: 'primary' }],
  FULL: [{ action: 'close', label: 'Confirm the group', variant: 'primary' }],
  CLOSED: [
    { action: 'complete', label: 'Mark as done', variant: 'primary' },
    { action: 'reopen', label: 'Reopen for more people', variant: 'secondary' },
  ],
};

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

  // The group itself: who is going. Shown to the poster and to accepted members alike.
  const [lobby, setLobby] = useState(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(null);

  const viewerId = useAuthStore((store) => store.user?.id);
  const isOwnGoal = state.goal?.isOwnGoal === true;
  const isMember = state.goal?.viewerIsMember === true;

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

  // The roster is refused with a 404 to anyone outside the group, so it is only ever asked for
  // once the goal itself has said this viewer is in it.
  const loadLobby = useCallback(() => {
    if (!isMember) return;
    goalsApi
      .lobby(id)
      .then(({ lobby: next }) => setLobby(next))
      // A roster that will not load is not worth an error banner over the whole page: the goal
      // is still readable, and the next action refetches it.
      .catch(() => setLobby(null));
  }, [id, isMember]);

  useEffect(loadLobby, [loadLobby]);

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

  async function handleLifecycle(action) {
    setLifecycleBusy(action);
    setActionError(null);
    try {
      const { goal } = await goalsApi[action](id);
      adoptGoal(goal);
      loadLobby();
      // Confirming the group declines everyone still waiting, so the decision list is stale.
      if (action === 'close') {
        setRequests((current) => ({
          ...current,
          items: current.items.filter((item) => item.status !== 'PENDING'),
        }));
      }
    } catch (error) {
      setActionError(error);
    } finally {
      setLifecycleBusy(null);
    }
  }

  async function handleDecision(requestId, action) {
    setDeciding((current) => ({ ...current, [requestId]: action }));
    setActionError(null);
    try {
      const { request, goal } = await requestsApi[action](requestId);
      adoptGoal(goal);
      // Accepting somebody changes who is in the lobby, and the roster comes from the server.
      if (action === 'accept') loadLobby();
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
  const lifecycle = LIFECYCLE_ACTIONS[goal.status] ?? [];
  const over = goal.status === 'COMPLETED' || goal.status === 'CANCELLED';
  // Once the group is confirmed nothing more can arrive, so there is nothing left to decide.
  const takingRequests = goal.status === 'OPEN' || goal.status === 'FULL';

  // The three facts that decide whether to join, as tiles in the manner of Control Center.
  const facts = [
    { icon: CalendarIcon, label: 'When', value: formatGoalWhen(goal.dateTime) },
    {
      icon: PeopleIcon,
      label: 'Spots',
      value: `${goal.acceptedCount} of ${goal.headcount} joined`,
      // Highlighted only while there is genuinely room. On a confirmed or finished goal the same
      // number in the link colour reads as an invitation to join something that is shut.
      emphasis: goal.status === 'OPEN' && !full,
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
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={goal.category} />
            {/* Only once it has left the feed. "Still forming" on an open goal says nothing a
                reader cannot already see from the spots below. */}
            {goal.status !== 'OPEN' && goal.status !== 'FULL' && (
              <span className="glass-control rounded-full px-3 py-1 text-[11px] font-semibold text-label">
                {LOBBY_STATE_LABEL[goal.lobbyStatus]}
              </span>
            )}
          </div>
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

      {isOwnGoal && takingRequests && (
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
        </>
      )}

      {/* The roster, shown to the poster and to accepted members alike — one section, one source,
          so the two never describe the same group differently. */}
      {isMember && (
        <section className="glass rounded-4xl p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-label">Who is going</h2>
            {/* A count, not a fraction. The Spots tile above already says "1 of 3 joined", and
                that denominator counts joiners while this one would have to count the poster
                too — two different "of" on one page reads as a mistake even when both are right. */}
            <span className="text-[13px] font-medium tabular-nums text-label-secondary">
              {goal.acceptedCount + 1} going
            </span>
          </div>

          {lobby ? (
            <LobbyRoster lobby={lobby} viewerId={viewerId} />
          ) : (
            <p className="mt-3 text-[15px] text-label-secondary">Loading the group…</p>
          )}

          <p className="mt-4 text-[13px] text-label-secondary">
            {goal.lobbyStatus === 'FORMING'
              ? 'Still open — anyone else who joins appears here.'
              : goal.lobbyStatus === 'CONFIRMED'
                ? 'The group is set. Nobody else can join.'
                : goal.lobbyStatus === 'COMPLETED'
                  ? 'This one is done.'
                  : 'This goal was called off.'}
          </p>
        </section>
      )}

      {isOwnGoal ? (
        <section className="glass rounded-4xl p-6 sm:p-8">
          <h2 className="text-[17px] font-semibold text-label">Manage this goal</h2>

          <Alert tone="error" className="mt-4">
            {actionError?.message}
          </Alert>

          {over ? (
            <p className="mt-2 text-[15px] text-label-secondary">
              {goal.status === 'COMPLETED'
                ? 'You marked this done. It counts towards everyone who turned up.'
                : 'You called this off.'}
            </p>
          ) : (
            <>
              <p className="mt-2 text-[15px] text-label-secondary">
                {goal.status === 'CLOSED'
                  ? 'The group is confirmed. Mark it done once it has happened.'
                  : goal.acceptedCount === 0
                    ? 'Confirming locks the group in. Accept at least one person first.'
                    : 'Confirming locks the group in and declines anyone still waiting.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {lifecycle.map(({ action, label, variant }) => (
                  <Button
                    key={action}
                    variant={variant}
                    loading={lifecycleBusy === action}
                    disabled={
                      Boolean(lifecycleBusy) || (action === 'close' && goal.acceptedCount === 0)
                    }
                    onClick={() => handleLifecycle(action)}
                  >
                    {label}
                  </Button>
                ))}
                <Button variant="secondary" loading={cancelling} onClick={handleCancel}>
                  Cancel this goal
                </Button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="glass rounded-4xl p-6 sm:p-8">
          <Alert tone="error" className="mb-4">
            {actionError?.message}
          </Alert>

          {viewerRequest?.status === 'ACCEPTED' ? (
            <>
              <StatusLine
                icon={CheckCircleIcon}
                tone="positive"
                title={over ? 'You were in this' : 'You\u2019re in'}
              >
                {over
                  ? goal.status === 'COMPLETED'
                    ? 'The poster marked this done, and it counts towards your profile.'
                    : 'The poster called this off.'
                  : `The poster accepted you${
                      goal.anonymous ? ', so their name is now shown above' : ''
                    }, and you can see who else is going above. Group chat for sorting out the details is on its way.`}
              </StatusLine>
              {/* No way out of something that has already happened — the API refuses it too, and
                  a button that can only fail is worse than no button. */}
              {!over && (
                <Button
                  variant="secondary"
                  loading={joinBusy}
                  onClick={handleWithdraw}
                  className="mt-5"
                >
                  Leave this goal
                </Button>
              )}
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
