import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Creates the test database once, before any test file runs.
 *
 * Integration tests run against a real SQLite database rather than a mocked Prisma client,
 * because the things most worth testing here — the unique constraint on email, transactional
 * OTP consumption — only exist in the database. Mocking them out would test the mock.
 *
 * `--force-reset` guarantees a clean schema every run, so a stale test.db from an older schema
 * can never produce a confusing failure.
 */
export default function setup() {
  execFileSync('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}
