/**
 * A student's photo, or their initials on a colour derived from their id.
 *
 * Photo upload does not exist until Step 7, so almost every avatar is initials for now. Deriving
 * the colour from the id rather than picking at random means the same person is the same colour
 * everywhere in the app, which makes them recognisable in a lobby list at a glance.
 */
/*
 * Deliberately dark and desaturated. A bright disc reads as a coloured blob rather than as a
 * stand-in for a photograph, and next to the amber halo on the profile page a saturated colour
 * clashes badly. These still differ per person, which is the point — the same student is the
 * same colour everywhere, so they stay recognisable in a lobby list.
 */
const COLOURS = [
  'bg-slate-700',
  'bg-teal-800',
  'bg-indigo-800',
  'bg-stone-700',
  'bg-emerald-800',
  'bg-violet-900',
  'bg-cyan-900',
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

export function Avatar({ name, id, photoUrl, size = 'md', halo = false, className = '' }) {
  const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-20 text-xl',
    xl: 'size-40 text-4xl',
  };

  // The amber halo from the design. Purely decorative, so it never carries meaning.
  const glow = halo ? 'avatar-halo' : '';

  // A haloed avatar is the profile hero, standing in for a photograph. It gets a neutral disc:
  // the amber glow is the focal point there, and any saturated colour competes with it. The
  // per-person colours are for small avatars in lists, where they aid recognition and the name
  // is not already six times the size next to them.
  const disc = halo ? 'bg-slate-800/90 text-white/85' : `${colourFor(id)} text-white`;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizes[size]} ${glow} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} ${disc} ${glow} inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
