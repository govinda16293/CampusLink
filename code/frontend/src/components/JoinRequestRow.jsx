import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

/**
 * One student who asked to join, as the poster sees them.
 *
 * Shows what the decision needs — who they are, how reliable they have been, what they wrote —
 * and nothing that would let the poster reach them off the platform. The API never sends an email
 * address here, so there is none to show. Actions render only while the request is pending; the
 * same row, without them, lists the people already going.
 */
export function JoinRequestRow({ request, busy, canAccept = true, onAccept, onReject }) {
  const { requester } = request;
  const pending = request.status === 'PENDING';

  return (
    <li className="glass-control rounded-[1.25rem] p-4">
      <div className="flex items-center gap-3">
        <Avatar name={requester.name} id={requester.id} photoUrl={requester.photoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-label">{requester.name}</p>
          <p className="truncate text-[13px] text-label-secondary">
            {requester.branch ?? 'Branch not set'}
            {requester.year ? ` · Year ${requester.year}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-label-secondary">Reliability</p>
          <p className="text-lg font-bold tabular-nums tracking-[-0.02em] text-label">
            {requester.reliabilityScore}
          </p>
        </div>
      </div>

      {request.message && (
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-white/40 px-3.5 py-2.5 text-[14px] leading-relaxed text-label">
          {request.message}
        </p>
      )}

      {pending && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            loading={busy === 'accept'}
            disabled={Boolean(busy) || !canAccept}
            onClick={onAccept}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={busy === 'reject'}
            disabled={Boolean(busy)}
            onClick={onReject}
          >
            Decline
          </Button>
        </div>
      )}
    </li>
  );
}
