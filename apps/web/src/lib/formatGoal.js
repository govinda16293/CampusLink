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

export { UNDATED_GOAL_TTL_HOURS };
