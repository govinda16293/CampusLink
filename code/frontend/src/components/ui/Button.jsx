import { ArrowRightIcon } from './icons';

/**
 * Presentational button.
 *
 * Every visual decision for buttons lives here, so restyling is a change to this file rather
 * than a hunt through every page. Pages pass intent (`variant`, `loading`, `withArrow`), never
 * class names.
 */
const VARIANTS = {
  // The terracotta gradient from the design's primary action.
  primary: [
    'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-900/25',
    'hover:from-brand-400 hover:to-brand-600 focus-visible:outline-white',
    'disabled:from-brand-500/50 disabled:to-brand-700/50 disabled:shadow-none',
  ].join(' '),

  // Sits on the frosted card: translucent, light border, white text.
  glass: [
    'bg-white/12 text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm',
    'hover:bg-white/20 focus-visible:outline-white disabled:text-white/40',
  ].join(' '),

  ghostLight: 'text-white/85 hover:text-white focus-visible:outline-white disabled:text-white/35',

  // The signed-in app's primary action — the amber pill from the design.
  amber: [
    'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20',
    'hover:bg-amber-300 focus-visible:outline-amber-300 disabled:bg-amber-400/40 disabled:text-slate-950/50',
  ].join(' '),

  // Secondary action on a dark surface.
  darkGhost: [
    'bg-white/8 text-white ring-1 ring-inset ring-white/15',
    'hover:bg-white/14 focus-visible:outline-white/60 disabled:text-white/35',
  ].join(' '),

  // For the solid-background pages (home, and the profile screens in Step 2).
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand-600 disabled:text-slate-400',
};

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  withArrow = false,
  className = '',
  ...props
}) {
  return (
    <button
      // Defaults to "button": an unmarked button inside a form submits it, which has caused more
      // than one accidental double-submit.
      type="button"
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold',
        'transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
      {withArrow && !loading && <ArrowRightIcon className="size-4" />}
    </button>
  );
}
