import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

/**
 * A labelled input with an optional leading icon and inline validation messaging.
 *
 * Three visual treatments: `glass` for the frosted auth card, `dark` for the signed-in app, and
 * `solid` for light surfaces. Errors
 * are wired up with `aria-describedby` and `aria-invalid` rather than shown as loose red text,
 * so a screen reader announces the message with the field it belongs to.
 *
 * On the glass variant the label is visually hidden — the design places a placeholder inside the
 * input instead of a label above it — but it stays in the DOM, because a placeholder is not a
 * label and disappears the moment someone types.
 */
export function Field({
  label,
  error,
  hint,
  icon: Icon,
  variant = 'solid',
  className = '',
  type = 'text',
  ...inputProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const glass = variant === 'glass';
  const dark = variant === 'dark';

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={[
          glass ? 'sr-only' : 'block text-sm font-medium',
          glass ? '' : dark ? 'text-white/70' : 'text-slate-700',
        ].join(' ')}
      >
        {label}
      </label>

      <div className={glass ? 'relative' : 'relative mt-1.5'}>
        {Icon && (
          <Icon
            className={[
              'pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2',
              glass || dark ? 'text-white/60' : 'text-slate-400',
            ].join(' ')}
          />
        )}

        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={[
            'block w-full rounded-xl border-0 py-3.5 text-[0.95rem] transition-shadow',
            Icon ? 'pl-12' : 'pl-4',
            isPassword ? 'pr-12' : 'pr-4',
            glass
              ? [
                  'bg-white/10 text-white placeholder:text-white/60',
                  'ring-1 ring-inset ring-white/25 focus:ring-2 focus:ring-white/60',
                  error ? 'ring-red-300/70' : '',
                ].join(' ')
              : dark
                ? [
                    'bg-white/6 text-white placeholder:text-white/40',
                    'ring-1 ring-inset focus:ring-2',
                    error
                      ? 'ring-red-400/60 focus:ring-red-400'
                      : 'ring-white/12 focus:ring-amber-400/70',
                  ].join(' ')
                : [
                    'bg-white text-slate-900 shadow-sm placeholder:text-slate-400',
                    'ring-1 ring-inset focus:ring-2 focus:ring-inset',
                    error
                      ? 'ring-red-400 focus:ring-red-500'
                      : 'ring-slate-300 focus:ring-brand-600',
                  ].join(' '),
            'focus:outline-none disabled:opacity-60',
          ].join(' ')}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className={[
              'absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors',
              glass || dark
                ? 'text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'
                : 'text-slate-400 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600',
            ].join(' ')}
          >
            {revealed ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </button>
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          className={`mt-1.5 text-sm ${glass || dark ? 'text-red-300' : 'text-red-600'}`}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className={`mt-2 text-sm ${glass || dark ? 'text-white/35' : 'text-slate-500'}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
