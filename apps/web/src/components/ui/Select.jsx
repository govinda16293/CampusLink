import { useId } from 'react';

/**
 * A labelled <select>, matching Field's solid variant.
 *
 * A native select rather than a custom dropdown on purpose: it is keyboard accessible for free,
 * and on a phone it opens the OS picker, which is a far better experience than a scrolling div —
 * the proposal commits to working well on average student phones.
 */
export function Select({ label, error, hint, options, placeholder, className = '', ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          'mt-1.5 block w-full rounded-xl border-0 bg-white py-3 pl-3 pr-10 text-slate-900 shadow-sm',
          'ring-1 ring-inset focus:ring-2 focus:ring-inset focus:outline-none',
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
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
