import { useId } from 'react';

/**
 * A labelled input with inline validation messaging.
 *
 * The error is wired up with `aria-describedby` and `aria-invalid` rather than being shown as
 * loose red text, so screen readers announce it with the field it belongs to.
 */
export function Field({ label, error, hint, className = '', ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          'mt-1.5 block w-full rounded-md border-0 px-3 py-2 text-slate-900 shadow-sm',
          'ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset',
          'disabled:bg-slate-50 disabled:text-slate-500',
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
        ].join(' ')}
        {...inputProps}
      />

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
