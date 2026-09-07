/**
 * A labelled switch.
 *
 * Built on a real checkbox so it is keyboard operable and announced correctly; the visual switch
 * is drawn from the peer state. The description sits inside the label, which makes the whole
 * block a click target — these two options (anonymity, auto-accept) carry real consequences, so
 * the explanation should be as easy to hit as the switch.
 */
export function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full bg-white/12 ring-1 ring-inset ring-white/15 transition-colors peer-checked:bg-amber-400 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-300"
      >
        {/* The knob is positioned from React state, not `peer-checked:`. Tailwind's peer variants
            only match siblings of the checkbox, and this span is a descendant of one — the class
            would compile but never apply, leaving the knob stuck. */}
        <span
          className={[
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white/85">{label}</span>
        {description && <span className="mt-1 block text-sm text-white/35">{description}</span>}
      </span>
    </label>
  );
}
