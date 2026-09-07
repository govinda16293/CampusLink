const TONES = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-100',
};

/**
 * Form-level messaging — the errors that belong to the submission as a whole rather than to one
 * field ("incorrect email or password", "that code has expired").
 *
 * `role="alert"` so it is announced when it appears; without it a screen-reader user submitting
 * a form gets no feedback that anything went wrong.
 */
export function Alert({ tone = 'info', children, className = '' }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className={`rounded-md px-4 py-3 text-sm ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
