const TONES = {
  error: 'bg-red-500/20 text-red-50 ring-red-300/40',
  success: 'bg-emerald-500/20 text-emerald-50 ring-emerald-300/40',
  info: 'bg-white/15 text-white ring-white/30',
};

const SOLID_TONES = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-100',
};

/**
 * Form-level messaging — errors belonging to the submission as a whole rather than to one field
 * ("incorrect email or password", "that code has expired").
 *
 * `role="alert"` so it is announced when it appears; without it a screen-reader user submitting
 * a form gets no feedback that anything went wrong.
 */
export function Alert({ tone = 'info', variant = 'glass', children, className = '' }) {
  // Multiple children arrive as an array, and `[undefined, false]` is itself truthy — so a
  // plain `if (!children)` guard would render an empty coloured bar whenever there is no error
  // to show. Check for actually-renderable content instead.
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!hasContent) return null;

  const palette = variant === 'glass' ? TONES : SOLID_TONES;

  return (
    <div
      role="alert"
      className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${palette[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
