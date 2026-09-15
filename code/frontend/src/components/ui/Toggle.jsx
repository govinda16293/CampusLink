/**
 * A labelled switch, drawn as the iOS 26 switch: a green capsule track and a wide capsule knob
 * that swells while it is being pressed.
 *
 * Built on a real checkbox so it is keyboard operable and announced correctly. The description
 * sits inside the label, which makes the whole block a click target — these two options
 * (anonymity, auto-accept) carry real consequences, so the explanation should be as easy to hit
 * as the switch.
 */
export function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="group flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={[
          'relative mt-0.5 inline-flex h-7 w-14.5 shrink-0 rounded-full transition-colors duration-300',
          'shadow-[inset_0_1px_2px_rgb(20_36_70/0.14)]',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-positive' : 'bg-black/9',
        ].join(' ')}
      >
        {/* The knob is positioned from React state, not `peer-checked:`. Tailwind's peer variants
            only match siblings of the checkbox, and this span is a descendant of one — the class
            would compile but never apply, leaving the knob stuck. */}
        <span
          className={[
            'absolute left-0.5 top-0.5 h-6 w-9 rounded-full bg-white',
            'shadow-[0_2px_6px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.04)]',
            'transition duration-300 ease-spring group-active:scale-110',
            checked ? 'translate-x-4.5' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-label">{label}</span>
        {description && (
          <span className="mt-1 block text-sm text-label-secondary">{description}</span>
        )}
      </span>
    </label>
  );
}
