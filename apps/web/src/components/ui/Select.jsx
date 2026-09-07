import { useId } from 'react';

/**
 * A labelled <select>, matching Field's solid variant.
 *
 * A native select rather than a custom dropdown on purpose: it is keyboard accessible for free,
 * and on a phone it opens the OS picker, which is a far better experience than a scrolling div —
 * the proposal commits to working well on average student phones.
 */
export function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  variant = 'solid',
  className = '',
  ...props
}) {
  const dark = variant === 'dark';
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium ${dark ? 'text-white/70' : 'text-slate-700'}`}
      >
        {label}
      </label>

      <select
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={[
          'mt-1.5 block w-full rounded-xl border-0 py-3 pl-3 pr-10 shadow-sm',
          'ring-1 ring-inset focus:ring-2 focus:ring-inset focus:outline-none',
          dark
            ? [
                // The dropdown list itself is drawn by the OS, so its options need an explicit
                // dark colour — they do not inherit the trigger's styling.
                'bg-white/6 text-white [&>option]:bg-slate-900 [&>option]:text-white',
                error
                  ? 'ring-red-400/60 focus:ring-red-400'
                  : 'ring-white/12 focus:ring-amber-400/70',
              ].join(' ')
            : [
                'bg-white text-slate-900',
                error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
              ].join(' '),
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
        <p id={errorId} className={`mt-1.5 text-sm ${dark ? 'text-red-300' : 'text-red-600'}`}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={`mt-1.5 text-sm ${dark ? 'text-white/50' : 'text-slate-500'}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
