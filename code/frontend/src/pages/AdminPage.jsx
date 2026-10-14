import { useCallback, useEffect, useState } from 'react';
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from '@campuslink/shared';
import { adminApi } from '../api/safety';
import { useAuthStore } from '../store/authStore';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ShieldIcon } from '../components/ui/icons';

/**
 * The moderator's queue.
 *
 * Two things about this page are the point of Step 8, not decoration:
 *
 * An anonymous student's name is **not** on it. Working through reports does not require knowing
 * who somebody is, so the name is not handed over as a side effect of doing the job — a moderator
 * has to press Reveal, and pressing it is what writes the audit entry.
 *
 * The audit trail is on the same page, below the queue. A log a moderator has to go looking for is
 * a log nobody reads; one sitting under their own work is a standing reminder that unmasking is
 * recorded and attributable.
 */
const TABS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'ACTIONED', label: 'Actioned' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ALL', label: 'All' },
];

export function AdminPage() {
  const role = useAuthStore((state) => state.user?.role);
  const [tab, setTab] = useState('OPEN');
  const [state, setState] = useState({ status: 'loading', reports: [], error: null });
  const [audit, setAudit] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const [{ reports }, { entries }] = await Promise.all([
        adminApi.reports(tab === 'ALL' ? undefined : tab),
        adminApi.audit(),
      ]);
      setState({ status: 'ready', reports, error: null });
      setAudit(entries);
    } catch (error) {
      setState({ status: 'error', reports: [], error });
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReveal(reportId) {
    setBusy(reportId);
    try {
      const { subject } = await adminApi.unmask(reportId);
      setRevealed((current) => ({ ...current, [reportId]: subject }));
      // Reload so the new audit entry appears straight away, under the moderator's own eyes.
      const { entries } = await adminApi.audit();
      setAudit(entries);
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(null);
    }
  }

  async function handleReview(reportId, status) {
    setBusy(reportId);
    try {
      await adminApi.review(reportId, status);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error }));
    } finally {
      setBusy(null);
    }
  }

  if (role && role !== 'ADMIN') {
    // The API refuses regardless — this only avoids showing an empty page and a 403 banner.
    return <Alert tone="error">That area is for moderators.</Alert>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold tracking-[-0.03em] text-label sm:text-5xl">Moderation</h1>
        <p className="mt-2 text-[15px] text-label-on-backdrop">
          Reports from students. Revealing who is behind an anonymous goal is recorded below.
        </p>
      </header>

      <SegmentedControl label="Filter reports" options={TABS} value={tab} onChange={setTab} />

      {state.error && <Alert tone="error">{state.error.message}</Alert>}
      {state.status === 'loading' && (
        <p className="py-10 text-center text-sm text-label-secondary">Loading…</p>
      )}

      {state.status === 'ready' && state.reports.length === 0 && (
        <div className="glass rounded-[1.75rem] p-10 text-center">
          <p className="text-[17px] font-semibold text-label">Nothing here.</p>
          <p className="mt-1 text-sm text-label-secondary">
            {tab === 'OPEN' ? 'No reports are waiting.' : 'No reports with that status.'}
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {state.reports.map((report) => (
          <li key={report.id} className="glass rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-action px-3 py-1 text-[11px] font-semibold text-white">
                {REPORT_REASON_LABEL[report.reason] ?? report.reason}
              </span>
              <span className="text-xs font-medium text-label-secondary">
                {REPORT_STATUS_LABEL[report.status] ?? report.status} ·{' '}
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>

            {report.detail && (
              <p className="mt-3 whitespace-pre-line rounded-2xl bg-white/40 px-3.5 py-2.5 text-[14px] leading-relaxed text-label">
                {report.detail}
              </p>
            )}

            {report.goal && (
              <p className="mt-3 text-[14px] text-label-secondary">
                On <span className="font-semibold text-label">{report.goal.title}</span> ·{' '}
                {report.goal.category}
              </p>
            )}

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="glass-control rounded-[1.25rem] p-4">
                <dt className="text-xs font-medium text-label-secondary">Reported student</dt>
                <dd className="mt-1 text-[15px] font-semibold text-label">
                  {revealed[report.id]?.name ?? report.subject.name ?? 'Anonymous'}
                </dd>
                <dd className="mt-1 text-[13px] text-label-secondary">
                  Reliability {report.subject.reliabilityScore} · {report.subject.reportsAgainst}{' '}
                  report{report.subject.reportsAgainst === 1 ? '' : 's'} in total
                </dd>
                {revealed[report.id] && (
                  <dd className="mt-1 text-[13px] font-medium text-label">
                    {revealed[report.id].email}
                  </dd>
                )}
              </div>
              <div className="glass-control rounded-[1.25rem] p-4">
                <dt className="text-xs font-medium text-label-secondary">Reported by</dt>
                <dd className="mt-1 text-[15px] font-semibold text-label">
                  {report.reporter.name}
                </dd>
                <dd className="mt-1 text-[13px] text-label-secondary">
                  {report.reporter.branch ?? 'Branch not set'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {report.subject.isAnonymous && !revealed[report.id] && (
                <Button
                  size="sm"
                  loading={busy === report.id}
                  onClick={() => handleReveal(report.id)}
                >
                  Reveal identity
                </Button>
              )}
              {report.status === 'OPEN' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === report.id}
                    onClick={() => handleReview(report.id, 'ACTIONED')}
                  >
                    Action taken
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === report.id}
                    onClick={() => handleReview(report.id, 'DISMISSED')}
                  >
                    Dismiss
                  </Button>
                </>
              )}
            </div>

            {report.subject.isAnonymous && !revealed[report.id] && (
              <p className="mt-3 text-[12px] text-label-secondary">
                Revealing is permanently recorded against your account.
              </p>
            )}
          </li>
        ))}
      </ul>

      <section className="glass rounded-4xl p-6 sm:p-8">
        <h2 className="inline-flex items-center gap-2 text-[17px] font-semibold text-label">
          <ShieldIcon className="size-5 text-label-secondary" />
          Audit trail
        </h2>
        <p className="mt-1 text-[13px] text-label-secondary">
          Every reveal and every decision, permanently. Nothing here can be edited or deleted.
        </p>

        {audit.length === 0 ? (
          <p className="mt-4 text-[15px] text-label-secondary">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="glass-control rounded-[1.25rem] px-4 py-3">
                <p className="text-[14px] text-label">{entry.detail}</p>
                <p className="mt-0.5 text-[12px] text-label-secondary">
                  {entry.actor.name} · {new Date(entry.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
