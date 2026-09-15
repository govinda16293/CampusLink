import { Link } from 'react-router-dom';
import { Avatar } from './ui/Avatar';
import { CategoryBadge } from './ui/CategoryBadge';
import { CalendarIcon, PeopleIcon, ShieldIcon } from './ui/icons';
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
      className="glass glass-interactive block rounded-[1.75rem] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <CategoryBadge category={goal.category} />
        <span className="shrink-0 text-xs font-medium text-label-secondary">
          {formatPostedAt(goal.createdAt)}
        </span>
      </div>

      <h3 className="mt-3.5 text-[1.1875rem] font-semibold leading-snug tracking-[-0.015em] text-label">
        {goal.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-label-secondary">
        {goal.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
        <span className="inline-flex items-center gap-1.5 text-label">
          <CalendarIcon className="size-4 text-label-secondary" />
          {formatGoalWhen(goal.dateTime)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 ${full ? 'text-label-secondary' : 'text-link'}`}
        >
          <PeopleIcon className="size-4" />
          {full ? 'Full' : `${goal.spotsLeft} spot${goal.spotsLeft === 1 ? '' : 's'} left`}
        </span>
        {goal.genderPreference !== 'ANY' && (
          <span className="text-label-secondary">
            {goal.genderPreference === 'FEMALE_ONLY' ? 'Women only' : 'Men only'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-separator pt-4">
        {poster.isAnonymous ? (
          <>
            <span
              aria-hidden="true"
              className="glass-control inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-label-secondary"
            >
              ?
            </span>
            <span className="text-sm text-label-secondary">Posted anonymously</span>
          </>
        ) : (
          <>
            <Avatar name={poster.name} id={poster.id} photoUrl={poster.photoUrl} size="sm" />
            <span className="text-sm font-medium text-label">
              {goal.isOwnGoal ? 'You' : poster.name}
            </span>
          </>
        )}

        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-label-secondary">
          <ShieldIcon className="size-3.5" />
          Reliability {poster.reliabilityScore}
        </span>
      </div>
    </Link>
  );
}
