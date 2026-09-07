/**
 * A student's photo, or their initials on a colour derived from their id.
 *
 * Photo upload does not exist until Step 7, so almost every avatar is initials for now. Deriving
 * the colour from the id rather than picking at random means the same person is the same colour
 * everywhere in the app, which makes them recognisable in a lobby list at a glance.
 */
const COLOURS = [
  'bg-brand-500',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
];

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colourFor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLOURS[hash % COLOURS.length];
}

export function Avatar({ name, id, photoUrl, size = 'md', className = '' }) {
  const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-20 text-xl',
  };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizes[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} ${colourFor(id)} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
