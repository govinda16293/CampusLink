import { Link, useLocation } from 'react-router-dom';
import { useSlidingIndicator } from '../hooks/useSlidingIndicator';
import { PeopleIcon, TargetIcon } from './ui/icons';

/*
 * A goal's detail page belongs to the feed, so Feed stays selected while you are inside one —
 * the way an iOS tab stays lit as you drill into it. Posting a goal has its own button.
 */
const TABS = [
  {
    to: '/',
    label: 'Feed',
    icon: TargetIcon,
    matches: (path) => path === '/' || (path.startsWith('/goals/') && path !== '/goals/new'),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: PeopleIcon,
    matches: (path) => path === '/profile' || path.startsWith('/profile/'),
  },
];

/**
 * The floating tab bar, after iOS 26: a glass capsule whose selection thumb slides between tabs.
 *
 * It lives at the foot of the screen because that is where a thumb reaches on a phone, which is
 * where the proposal expects most use.
 *
 * It carries navigation only. A round "+" button used to sit beside it, but the feed already
 * offers posting twice — once under the greeting and once in its empty state — and a third
 * entry point to the same screen read as clutter rather than convenience.
 *
 * The selected tab takes the terracotta of every other control in the app.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const activeIndex = TABS.findIndex((tab) => tab.matches(pathname));
  const { containerRef, thumbRef, thumbStyle } = useSlidingIndicator(activeIndex);

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div ref={containerRef} className="glass-bar pointer-events-auto rounded-full p-1">
        <span
          ref={thumbRef}
          aria-hidden="true"
          style={thumbStyle}
          className="glass-thumb absolute inset-y-1 left-0 rounded-full transition-[translate,width,opacity] duration-500 ease-spring"
        />

        <ul className="flex">
          {TABS.map(({ to, label, icon: Icon }, index) => {
            const active = index === activeIndex;
            return (
              <li key={to}>
                <Link
                  to={to}
                  data-active={active}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'relative flex w-20 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition-colors duration-200',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                    active ? 'text-action' : 'text-label-secondary hover:text-label',
                  ].join(' ')}
                >
                  <Icon className="size-6" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
