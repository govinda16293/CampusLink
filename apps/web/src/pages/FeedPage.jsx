import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GOAL_CATEGORIES, GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { useAuthStore } from '../store/authStore';
import { GoalCard } from '../components/GoalCard';
import { ProfileNudge } from '../components/ProfileNudge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Hey {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Post a goal, or join one someone else has posted.
          </p>
        </div>
        <Link to="/goals/new">
          <Button variant="amber" withArrow>
            Post a goal
          </Button>
        </Link>
      </header>

      <ProfileNudge />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={!filters.category && !filters.mine}
          onClick={() => setFilters({ category: '', mine: false })}
        >
          All
        </FilterChip>
        {GOAL_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            active={filters.category === category}
            onClick={() => setFilters({ category, mine: false })}
          >
            {GOAL_CATEGORY_LABEL[category]}
          </FilterChip>
        ))}
        <FilterChip
          active={filters.mine}
          onClick={() => setFilters({ category: '', mine: !filters.mine })}
        >
          My goals
        </FilterChip>
      </div>

      {state.status === 'error' && (
        <Alert variant="dark" tone="error">
          {state.error.message}
        </Alert>
      )}

      {state.status === 'loading' && (
        <p className="py-12 text-center text-sm text-white/45">Loading the feed…</p>
      )}

      {state.status === 'ready' && state.goals.length === 0 && (
        <div className="frost-panel rounded-2xl p-10 text-center">
          <p className="text-white/70">
            {filters.mine ? 'You have not posted any goals yet.' : 'Nothing on the feed right now.'}
          </p>
          <p className="mt-1 text-sm text-white/45">Be the first to post one.</p>
          <Link to="/goals/new" className="mt-5 inline-block">
            <Button variant="amber">Post a goal</Button>
          </Link>
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
          <Button variant="darkGhost" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-amber-400 text-slate-950'
          : 'bg-white/6 text-white/65 ring-1 ring-inset ring-white/10 hover:bg-white/12 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
