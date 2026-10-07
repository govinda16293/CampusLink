import { UNDATED_GOAL_TTL_HOURS } from '@campuslink/shared';

/**
 * Human-readable timing for a goal card.
 *
 * "Tomorrow, 6:00 am" reads better than a raw date on a feed someone is skimming, and a goal
 * without a date needs to say so rather than showing a blank.
 */
export function formatGoalWhen(dateTime) {
  if (!dateTime) return 'Anytime';

  const when = new Date(dateTime);
  const today = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(when) - startOfDay(today)) / 86_400_000);

  const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days > 1 && days < 7) {
    return `${when.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`;
  }
  return `${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${time}`;
}

/** How long an undated goal has left, so the feed shows why it will disappear. */
export function formatPostedAt(createdAt) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * What to say about a goal's remaining spots, which depends on where it is in its life.
 *
 * "1 spot left" is only true while a goal is still taking people. Once the poster has confirmed
 * the group or marked it done, the same sentence would be an invitation to join something that
 * is no longer open, so each later state gets its own phrasing.
 */
export function spotsLabel(goal) {
  switch (goal.status) {
    case 'COMPLETED':
      return 'Done';
    case 'CANCELLED':
      return 'Cancelled';
    case 'CLOSED':
      return `${goal.acceptedCount} going`;
    default:
      return goal.spotsLeft === 0
        ? 'Full'
        : `${goal.spotsLeft} spot${goal.spotsLeft === 1 ? '' : 's'} left`;
  }
}

/** The lobby's state in words, for the heading above the roster. */
export const LOBBY_STATE_LABEL = {
  FORMING: 'Still forming',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Done',
  CANCELLED: 'Called off',
};

export { UNDATED_GOAL_TTL_HOURS };
