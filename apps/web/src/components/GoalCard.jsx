import { Link } from 'react-router-dom';
import { GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import { Avatar } from './ui/Avatar';
import { formatGoalWhen, formatPostedAt } from '../lib/formatGoal';

/**
 * One goal on the feed.
 *
 * The poster block renders whatever the server chose to send. When a goal is anonymous the API
 * omits name, photo and id entirely, so there is nothing here to accidentally reveal — this
 * component could not leak an identity even if it tried.
 */
export function GoalCard({ goal }) {
  const { poster } = goal;
  const full = goal.spotsLeft === 0;

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="frost-panel block rounded-2xl p-5 transition-colors hover:bg-white/[0.09]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-amber-400/12 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/20">
          {GOAL_CATEGORY_LABEL[goal.category]}
        </span>
        <span className="shrink-0 text-xs text-white/40">{formatPostedAt(goal.createdAt)}</span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white">{goal.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-white/60">{goal.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-white/70">{formatGoalWhen(goal.dateTime)}</span>
        <span className={full ? 'text-white/40' : 'text-amber-300'}>
          {full ? 'Full' : `${goal.spotsLeft} spot${goal.spotsLeft === 1 ? '' : 's'} left`}
        </span>
        {goal.genderPreference !== 'ANY' && (
          <span className="text-white/50">
            {goal.genderPreference === 'FEMALE_ONLY' ? 'Women only' : 'Men only'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-white/8 pt-4">
        {poster.isAnonymous ? (
          <>
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/50"
            >
              ?
            </span>
            <span className="text-sm text-white/55">Posted anonymously</span>
          </>
        ) : (
          <>
            <Avatar name={poster.name} id={poster.id} photoUrl={poster.photoUrl} size="sm" />
            <span className="text-sm text-white/75">{goal.isOwnGoal ? 'You' : poster.name}</span>
          </>
        )}

        <span className="ml-auto text-xs text-white/45">Reliability {poster.reliabilityScore}</span>
      </div>
    </Link>
  );
}
