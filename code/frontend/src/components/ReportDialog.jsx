import { useState } from 'react';
import { REPORT_DETAIL_MAX, REPORT_REASONS, REPORT_REASON_LABEL } from '@campuslink/shared';
import { safetyApi } from '../api/safety';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Select } from './ui/Select';

const REASON_OPTIONS = REPORT_REASONS.map((value) => ({
  value,
  label: REPORT_REASON_LABEL[value],
}));

/**
 * Reporting somebody, from wherever you came across them.
 *
 * `target` is context — `{ goalId }`, `{ messageId }` or `{ userId }` — and never a person: the
 * server works out who is actually being reported. That is what lets an anonymous poster be
 * reported by a student who has no way of knowing who they are.
 *
 * Once sent, the panel says only that it arrived. There is nothing else honest to say: telling a
 * reporter what happened next, or that this person has been reported before, would make the form
 * a way to learn about other students rather than a way to flag a problem.
 */
export function ReportDialog({ target, onClose }) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await safetyApi.report({ ...target, reason, detail: detail.trim() });
      setSent(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-4">
        <Alert tone="success">
          Thanks — this has gone to the moderators. We will not tell you what happens next, and the
          student is not told who reported them.
        </Alert>
        <Button variant="secondary" onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Select
        label="What is wrong?"
        options={REASON_OPTIONS}
        placeholder="Pick a reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Field
        className="mt-4"
        label="Anything else the moderators should know (optional)"
        name="detail"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        maxLength={REPORT_DETAIL_MAX}
        placeholder="What happened"
        hint={`${detail.length} of ${REPORT_DETAIL_MAX}`}
      />

      <Alert tone="error" className="mt-4">
        {error?.message}
      </Alert>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button loading={sending} disabled={!reason} onClick={handleSend}>
          Send report
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
