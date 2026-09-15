/*
 * Tinted glass: a pale wash of the tone over the panel. A thin tint alone turned grey-lilac over
 * the blue top of the auth card, so the light appearance washes the tone over white; the dark
 * appearance (signed-out screens) swaps in translucent tints that sit on dark glass. Both are
 * defined as --alert-*-bg in index.css. The text uses the darkened `-text` variants — the bright
 * system red and green are fine as a wash but fall below a readable ratio as small text.
 */
const TONES = {
  error: 'bg-[var(--alert-error-bg)] text-danger-text ring-danger/30',
  success: 'bg-[var(--alert-success-bg)] text-positive-text ring-positive/35',
  info: 'bg-[var(--alert-info-bg)] text-link ring-accent/25',
};

/**
 * Form-level messaging — errors belonging to the submission as a whole rather than to one field
 * ("incorrect email or password", "that code has expired").
 *
 * `role="alert"` so it is announced when it appears; without it a screen-reader user submitting
 * a form gets no feedback that anything went wrong.
 */
export function Alert({ tone = 'info', children, className = '' }) {
  // Multiple children arrive as an array, and `[undefined, false]` is itself truthy — so a
  // plain `if (!children)` guard would render an empty coloured bar whenever there is no error
  // to show. Check for actually-renderable content instead.
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  if (!hasContent) return null;

  return (
    <div
      role="alert"
      className={`rounded-2xl px-4 py-3 text-sm font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
