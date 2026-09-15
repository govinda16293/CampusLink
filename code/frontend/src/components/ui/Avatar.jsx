/**
 * A student's photo, or their initials on a colour derived from their id.
 *
 * Deriving the colour from the id rather than picking at random means the same person is the
 * same colour everywhere in the app, which makes them recognisable in a lobby list at a glance.
 */
/*
 * Soft top-to-bottom gradients in the system colours, as Apple draws contact avatars. Each is
 * deep enough at the bottom to carry white initials.
 */
const GRADIENTS = [
  'from-[#5aa9ff] to-[#0a66e0]',
  'from-[#8583f0] to-[#4b48c9]',
  'from-[#52c7d8] to-[#1a8fa8]',
  'from-[#5fd07a] to-[#1f9a45]',
  'from-[#ffb04d] to-[#f07400]',
  'from-[#ff7a9c] to-[#e0325c]',
  'from-[#c47ae8] to-[#8e3fc4]',
];

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function gradientFor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function Avatar({ name, id, photoUrl, size = 'md', halo = false, className = '' }) {
  const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-20 text-xl',
    xl: 'size-40 text-4xl',
  };

  // The glass ring around the profile hero. Purely decorative, so it never carries meaning.
  const ring = halo ? 'avatar-halo' : '';

  // A haloed avatar is the profile hero, standing in for a photograph, so it gets Apple's neutral
  // graphite — the way Contacts shows someone without a picture. The per-person colours are for
  // small avatars in lists, where they aid recognition and the name is not already six times
  // the size right next to them.
  const disc = halo ? 'from-[#b4bac6] to-[#7d8491]' : gradientFor(id);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizes[size]} ${ring} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={[
        sizes[size],
        ring,
        'inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-b font-semibold text-white',
        'shadow-[inset_0_1px_1px_rgb(255_255_255/0.45),0_1px_3px_rgb(20_36_70/0.2)] [text-shadow:0_1px_1px_rgb(0_0_0/0.15)]',
        disc,
        className,
      ].join(' ')}
    >
      {initialsOf(name)}
    </span>
  );
}
