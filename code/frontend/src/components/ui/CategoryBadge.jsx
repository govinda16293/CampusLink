import { GOAL_CATEGORY_LABEL } from '@campuslink/shared';
import {
  BookIcon,
  CarIcon,
  DocIcon,
  DotsCircleIcon,
  DumbbellIcon,
  ForkKnifeIcon,
  BallIcon,
  TicketIcon,
} from './icons';

/**
 * The symbol for each category, exported so the feed's filter row can show the same glyph the
 * cards do. Drawn line icons rather than emoji: emoji render differently on every platform and
 * read as clip art beside SF text.
 */
export const CATEGORY_ICON = {
  SPORTS: BallIcon,
  GYM: DumbbellIcon,
  STUDY: BookIcon,
  TRAVEL: CarIcon,
  FOOD: ForkKnifeIcon,
  EVENTS: TicketIcon,
  NOTES: DocIcon,
  OTHER: DotsCircleIcon,
};

/*
 * One system colour per category, the way Apple tints its own tags. The colour carries the glyph
 * and a faint wash, in a shade deep enough to read at 14px; the label stays in the label colour,
 * because orange or yellow text on light glass is unreadable. Class names are written out in
 * full so Tailwind can find them.
 */
const TINTS = {
  SPORTS: 'bg-[#34c759]/14 text-[#1f7a35] ring-[#34c759]/30',
  GYM: 'bg-[#ff9500]/14 text-[#a35a00] ring-[#ff9500]/30',
  STUDY: 'bg-[#007aff]/12 text-[#0057b8] ring-[#007aff]/25',
  TRAVEL: 'bg-[#30b0c7]/14 text-[#0f6d80] ring-[#30b0c7]/30',
  FOOD: 'bg-[#ff2d55]/12 text-[#b3103a] ring-[#ff2d55]/25',
  EVENTS: 'bg-[#af52de]/12 text-[#7a2ba8] ring-[#af52de]/25',
  NOTES: 'bg-[#5856d6]/12 text-[#3f3ea8] ring-[#5856d6]/25',
  OTHER: 'bg-[#8e8e93]/14 text-[#5c5c61] ring-[#8e8e93]/30',
};

/** A goal's category as a tinted capsule with its symbol. */
export function CategoryBadge({ category }) {
  const Icon = CATEGORY_ICON[category] ?? DotsCircleIcon;
  const tint = TINTS[category] ?? TINTS.OTHER;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 text-xs font-semibold ring-1 ring-inset ${tint}`}
    >
      <Icon className="size-3.5" />
      <span className="text-label">{GOAL_CATEGORY_LABEL[category]}</span>
    </span>
  );
}
