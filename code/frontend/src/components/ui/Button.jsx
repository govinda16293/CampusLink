import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './icons';

/**
 * Presentational buttons, in the capsule shapes of the Liquid Glass design.
 *
 * Every visual decision for buttons lives here, so restyling is a change to this file rather
 * than a hunt through every page. Pages pass intent (`variant`, `size`, `loading`, `withArrow`),
 * never class names for colour or shape.
 *
 * On press a button swells slightly and springs back, the way iOS 26 glass controls answer a
 * touch, rather than sinking like a flat web button.
 */
const VARIANTS = {
  // Tinted glass in the accent colour — the one main action on a screen.
  primary: 'btn-prominent text-white disabled:opacity-45',

  // Clear glass — secondary actions, and anything sitting beside a primary.
  secondary: 'glass-control text-label hover:bg-white/30 disabled:text-label-tertiary',

  // Text only — low-emphasis actions such as "Resend code".
  plain: 'text-link hover:text-accent-hover disabled:text-label-tertiary',
};

const SIZES = {
  md: 'min-h-12 px-6 text-[15px]',
  sm: 'min-h-9 px-4 text-[13px]',
};

/** The class list for a button, shared with ButtonLink so the two can never drift apart. */
function buttonClasses({ variant = 'primary', size = 'md', className = '' }) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none',
    'transition duration-300 ease-spring active:scale-[1.04]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ');
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
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
      className={buttonClasses({ variant, size, className })}
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

/**
 * A router link dressed as a button, for actions that navigate ("Post a goal").
 *
 * A real <a>, rather than a <button> wrapped in a <Link>: nesting one interactive element in
 * another is invalid HTML and gives keyboard users two tab stops for a single action.
 */
export function ButtonLink({
  children,
  variant = 'primary',
  size = 'md',
  withArrow = false,
  className = '',
  ...props
}) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
      {withArrow && <ArrowRightIcon className="size-4" />}
    </Link>
  );
}
