import { useCallback, useEffect, useState } from 'react';
import { GOAL_CATEGORIES, GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { useAuthStore } from '../store/authStore';
import { GoalCard } from '../components/GoalCard';
import { ProfileNudge } from '../components/ProfileNudge';
import { Alert } from '../components/ui/Alert';
import { Button, ButtonLink } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { CATEGORY_ICON } from '../components/ui/CategoryBadge';

/*
 * The filter row is one segmented control. "All", each category, "My goals" and "Joined" are
 * mutually exclusive, so a single value describes the whole state.
 *
 * The two personal lists sit at the end, after the categories, because they answer a different
 * question: the categories narrow what is on offer, these two leave the feed entirely for the
 * goals you are already involved in.
 */
/*
 * Shorter names for the three categories whose full label is a mouthful.
 *
 * Only the filter row uses these. The create form keeps the full names from the shared enum,
 * where a student is choosing what their goal *is* and the distinction matters; here the chip
 * carries an icon and sits beside ten others, and the row has to fit on one line.
 */
const FILTER_LABEL = { STUDY: 'Study', TRAVEL: 'Travel', NOTES: 'Notes' };

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  ...GOAL_CATEGORIES.map((category) => ({
    value: category,
    label: FILTER_LABEL[category] ?? GOAL_CATEGORY_LABEL[category],
    icon: CATEGORY_ICON[category],
  })),
  { value: 'MINE', label: 'My goals' },
  { value: 'JOINED', label: 'Joined' },
];

/** What an empty list means depends on which list it is. */
const EMPTY_COPY = {
  MINE: ['You have not posted any goals yet.', 'Post one and it appears on the campus feed.'],
  JOINED: ['You have not joined anything yet.', 'Ask to join a goal and it shows up here.'],
  ALL: ['Nothing on the feed right now.', 'Be the first to post one.'],
};

/**
 * The public campus feed.
 *
 * Filters live in component state rather than the URL for now; when goal sharing arrives they
 * should move to search params so a filtered feed can be linked.
 */
export function FeedPage() {
  const user = useAuthStore((state) => state.user);
  // One of 'ALL', a category, 'MINE' or 'JOINED' — the same value the segmented control shows.
  const [filter, setFilter] = useState('ALL');
  const [state, setState] = useState({
    status: 'loading',
    goals: [],
    nextCursor: null,
    error: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  // The query the current filter stands for. One place, so the first page and "Load more" can
  // never ask for two different things.
  const query = useCallback(
    () => ({
      category: filter === 'ALL' || filter === 'MINE' || filter === 'JOINED' ? undefined : filter,
      mine: filter === 'MINE' ? 'true' : undefined,
      joined: filter === 'JOINED' ? 'true' : undefined,
    }),
    [filter],
  );

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await goalsApi.list(query());
      setState({ status: 'ready', goals: data.goals, nextCursor: data.nextCursor, error: null });
    } catch (error) {
      setState({ status: 'error', goals: [], nextCursor: null, error });
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await goalsApi.list({ ...query(), cursor: state.nextCursor });
      setState((s) => ({
        ...s,
        goals: [...s.goals, ...data.goals],
        nextCursor: data.nextCursor,
      }));
    } finally {
      setLoadingMore(false);
    }
  }

  const [emptyTitle, emptyHint] = EMPTY_COPY[filter] ?? EMPTY_COPY.ALL;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-[-0.03em] text-label sm:text-5xl">
            Hey {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-2 text-[15px] text-label-on-backdrop">
            Post a goal, or join one someone else has posted.
          </p>
        </div>
        <ButtonLink to="/goals/new" withArrow>
          Post a goal
        </ButtonLink>
      </header>

      <ProfileNudge />

      <SegmentedControl
        label="Filter goals"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
      />

      {state.status === 'error' && <Alert tone="error">{state.error.message}</Alert>}

      {state.status === 'loading' && (
        <p className="py-12 text-center text-sm text-label-secondary">Loading the feed…</p>
      )}

      {state.status === 'ready' && state.goals.length === 0 && (
        <div className="glass rounded-[1.75rem] p-10 text-center">
          <p className="text-[17px] font-semibold text-label">{emptyTitle}</p>
          <p className="mt-1 text-sm text-label-secondary">{emptyHint}</p>
          {/* "Browse the feed" cannot be a link to "/": this already is "/", and the filter
              lives in component state, so navigating here would leave the empty list on screen. */}
          {filter === 'JOINED' ? (
            <Button className="mt-5" onClick={() => setFilter('ALL')}>
              Browse the feed
            </Button>
          ) : (
            <ButtonLink to="/goals/new" className="mt-5">
              Post a goal
            </ButtonLink>
          )}
        </div>
      )}

      {state.goals.length > 0 && (
        <ul className="space-y-4">
          {state.goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} />
            </li>
          ))}
        </ul>
      )}

      {state.nextCursor && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
