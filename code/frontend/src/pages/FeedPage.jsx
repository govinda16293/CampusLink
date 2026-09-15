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
 * The filter row is one segmented control. "All", each category and "My goals" are mutually
 * exclusive, so a single value describes the whole state.
 */
const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  ...GOAL_CATEGORIES.map((category) => ({
    value: category,
    label: GOAL_CATEGORY_LABEL[category],
    icon: CATEGORY_ICON[category],
  })),
  { value: 'MINE', label: 'My goals' },
];

/**
 * The public campus feed.
 *
 * Filters live in component state rather than the URL for now; when goal sharing arrives they
 * should move to search params so a filtered feed can be linked.
 */
export function FeedPage() {
  const user = useAuthStore((state) => state.user);
  const [filters, setFilters] = useState({ category: '', mine: false });
  const [state, setState] = useState({
    status: 'loading',
    goals: [],
    nextCursor: null,
    error: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await goalsApi.list({
        category: filters.category || undefined,
        mine: filters.mine ? 'true' : undefined,
      });
      setState({ status: 'ready', goals: data.goals, nextCursor: data.nextCursor, error: null });
    } catch (error) {
      setState({ status: 'error', goals: [], nextCursor: null, error });
    }
  }, [filters.category, filters.mine]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await goalsApi.list({
        category: filters.category || undefined,
        mine: filters.mine ? 'true' : undefined,
        cursor: state.nextCursor,
      });
      setState((s) => ({
        ...s,
        goals: [...s.goals, ...data.goals],
        nextCursor: data.nextCursor,
      }));
    } finally {
      setLoadingMore(false);
    }
  }

  // Choosing "My goals" again switches it back off, as the old toggle chip did.
  function handleFilter(value) {
    if (value === 'MINE') setFilters({ category: '', mine: !filters.mine });
    else setFilters({ category: value === 'ALL' ? '' : value, mine: false });
  }

  const filterValue = filters.mine ? 'MINE' : filters.category || 'ALL';

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
        value={filterValue}
        onChange={handleFilter}
      />

      {state.status === 'error' && <Alert tone="error">{state.error.message}</Alert>}

      {state.status === 'loading' && (
        <p className="py-12 text-center text-sm text-label-secondary">Loading the feed…</p>
      )}

      {state.status === 'ready' && state.goals.length === 0 && (
        <div className="glass rounded-[1.75rem] p-10 text-center">
          <p className="text-[17px] font-semibold text-label">
            {filters.mine ? 'You have not posted any goals yet.' : 'Nothing on the feed right now.'}
          </p>
          <p className="mt-1 text-sm text-label-secondary">Be the first to post one.</p>
          <ButtonLink to="/goals/new" className="mt-5">
            Post a goal
          </ButtonLink>
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
