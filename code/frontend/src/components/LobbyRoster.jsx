import { Avatar } from './ui/Avatar';
import { ShieldIcon } from './ui/icons';

/**
 * Who is in the group.
 *
 * This is the one screen in CampusLink that shows real names and faces to people who may not
 * know each other, which is why the API refuses it to anyone outside the group — by the time
 * this renders, everyone shown has agreed to be here. It is presentational only: it draws
 * whatever roster the server was willing to send, and cannot reveal anything it was not sent.
 */
export function LobbyRoster({ lobby, viewerId }) {
  const people = [
    { ...lobby.poster, role: 'Posted this' },
    ...lobby.members.map((member) => ({ ...member, role: 'Joined' })),
  ];

  return (
    <ul className="mt-4 space-y-3">
      {people.map((person) => (
        <li key={person.id} className="glass-control flex items-center gap-3 rounded-[1.25rem] p-4">
          <Avatar name={person.name} id={person.id} photoUrl={person.photoUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-label">
              {person.id === viewerId ? 'You' : person.name}
            </p>
            <p className="truncate text-[13px] text-label-secondary">
              {person.branch ?? 'Branch not set'}
              {person.year ? ` · Year ${person.year}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-medium text-label-secondary">{person.role}</p>
            <p className="inline-flex items-center gap-1 text-[13px] font-medium text-label-secondary">
              <ShieldIcon className="size-3.5" />
              {person.reliabilityScore}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
