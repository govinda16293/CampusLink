import { useEffect } from 'react';
import { useSlidingIndicator } from '../../hooks/useSlidingIndicator';

/**
 * Mutually exclusive options on a glass capsule, with a thumb that slides to the chosen one —
 * the "Years | Months | All" control from the design reference.
 *
 * Built from ordinary buttons with aria-pressed rather than a radio group: each option stays its
 * own tab stop and announces whether it is on, without roving-focus machinery. When the options
 * outrun the screen the capsule scrolls sideways, and the chosen one is kept in view.
 */
export function SegmentedControl({ label, options, value, onChange, className = '' }) {
  const { containerRef, thumbRef, thumbStyle } = useSlidingIndicator(value);

  // Bring the chosen option into view inside the row. Scrolls the row only — never the page,
  // which `scrollIntoView` would also do if the control sat partly off screen.
  useEffect(() => {
    const row = containerRef.current;
    const active = row?.querySelector('[data-active="true"]');
    if (!row || !active) return;

    const start = active.offsetLeft;
    const end = start + active.offsetWidth;
    if (start < row.scrollLeft) {
      row.scrollTo({ left: start - 12, behavior: 'smooth' });
    } else if (end > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: end - row.clientWidth + 12, behavior: 'smooth' });
    }
  }, [value, containerRef]);

  return (
    <div role="group" aria-label={label} className={`glass rounded-full p-1 ${className}`}>
      {/* The right edge fades out, so a row that runs off a phone screen reads as scrollable
          rather than cut off; the end padding lets the last option scroll clear of the fade.
          On wider screens the options end well short of it. */}
      <div
        ref={containerRef}
        className="scrollbar-none relative flex overflow-x-auto rounded-full pr-7 [mask-image:linear-gradient(to_right,#000_calc(100%-1.75rem),transparent)]"
      >
        <span
          ref={thumbRef}
          aria-hidden="true"
          style={thumbStyle}
          className="glass-thumb absolute inset-y-0 left-0 rounded-full transition-[translate,width,opacity] duration-500 ease-spring"
        />

        {options.map((option) => {
          const active = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              data-active={active}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={[
                'relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors duration-200',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                active ? 'text-label' : 'text-label-secondary hover:text-label',
              ].join(' ')}
            >
              {Icon && <Icon className="size-3.5" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
