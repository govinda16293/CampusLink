import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

/**
 * A labelled input with an optional leading icon and inline validation messaging.
 *
 * The input is a well of lighter glass (`.glass-field` in index.css). Errors are wired up with
 * `aria-describedby` and `aria-invalid` rather than shown as loose red text, so a screen reader
 * announces the message with the field it belongs to — and the red ring is keyed off the same
 * `aria-invalid`, so what is announced and what is shown cannot disagree.
 *
 * With `hideLabel` (the auth screens) the label is visually hidden — the design places a
 * placeholder inside the input instead of a label above it — but it stays in the DOM, because a
 * placeholder is not a label and disappears the moment someone types.
 */
export function Field({
  label,
  hideLabel = false,
  error,
  hint,
  icon: Icon,
  className = '',
  type = 'text',
  ...inputProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          hideLabel ? 'sr-only' : 'block pl-1 text-[13px] font-semibold text-label-secondary'
        }
      >
        {label}
      </label>

      <div className={hideLabel ? 'relative' : 'relative mt-1.5'}>
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-label-tertiary" />
        )}

        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'glass-field block w-full rounded-2xl border-0 py-3.5 text-[15px]',
            Icon ? 'pl-12' : 'pl-4',
            isPassword ? 'pr-12' : 'pr-4',
          ].join(' ')}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-label-tertiary transition-colors hover:text-label focus-visible:outline-2 focus-visible:outline-accent"
          >
            {revealed ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </button>
        )}
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
