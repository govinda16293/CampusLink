import { useId } from 'react';
import { ChevronUpDownIcon } from './icons';

/**
 * A labelled <select>, matching Field.
 *
 * A native select rather than a custom dropdown on purpose: it is keyboard accessible for free,
 * and on a phone it opens the OS picker, which is a far better experience than a scrolling div —
 * the proposal commits to working well on average student phones. Only the closed control is
 * restyled (as a glass well with Apple's up-down chevron); the open list stays the system's own.
 */
export function Select({ label, error, hint, options, placeholder, className = '', ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // While the placeholder is showing, draw it in the placeholder colour like an empty input.
  const showingPlaceholder = Boolean(placeholder) && (props.value === '' || props.value == null);

  return (
    <div className={className}>
      <label htmlFor={id} className="block pl-1 text-[13px] font-semibold text-label-secondary">
        {label}
      </label>

      <div className="relative mt-1.5">
        <select
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'glass-field block w-full appearance-none rounded-2xl border-0 py-3.5 pl-4 pr-11 text-[15px]',
            // A native select clips a long option instead of ellipsing it, so the longest branch
            // name broke off mid-word ("…Computer Engineerin") and read as a rendering fault.
            'overflow-hidden text-ellipsis whitespace-nowrap',
            // Some platforms paint the open list with the select's own colour, so the options
            // are pinned to the label colour rather than inheriting the placeholder grey.
            '[&>option]:text-label',
            showingPlaceholder ? 'text-label-tertiary' : '',
          ].join(' ')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(({ value, label: optionLabel }) => (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          ))}
        </select>

        <ChevronUpDownIcon className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-label-secondary" />
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 pl-1 text-[13px] font-medium text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 pl-1 text-[13px] text-label-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
