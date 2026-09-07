import { useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Shows whether the browser can actually reach the API and its database.
 *
 * This exists so that "is the backend running?" is answerable at a glance during development,
 * which is the single most common source of confusion when two dev servers have to be up at
 * once. It is a development aid, and will be dropped once real pages fill the shell.
 */
export function ApiStatusBanner() {
  const [state, setState] = useState({ status: 'checking', detail: null });

  useEffect(() => {
    const controller = new AbortController();

    api
      .get('/health', { signal: controller.signal })
      .then((data) => setState({ status: 'ok', detail: data }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ status: 'error', detail: error.message });
      });

    return () => controller.abort();
  }, []);

  const styles = {
    checking: 'bg-slate-100 text-slate-600 border-slate-200',
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  }[state.status];

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {state.status === 'checking' && <span>Checking API connection…</span>}

      {state.status === 'ok' && (
        <span>
          <strong>API connected</strong> — database {state.detail?.database}, up for{' '}
          {state.detail?.uptimeSeconds}s
        </span>
      )}

      {state.status === 'error' && (
        <span>
          <strong>API unreachable</strong> — {state.detail}
          <br />
          <span className="text-red-700/80">
            Start it with <code className="font-mono">npm run dev</code> at the repo root.
          </span>
        </span>
      )}
    </div>
  );
}
