import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['{backend,frontend,shared}/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./backend/src/test/globalSetup.ts'],
    // Integration tests share one SQLite file, so they must not run concurrently — a parallel
    // pool would have two files truncating each other's rows mid-test.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-value-not-used-in-production',
      MAIL_TRANSPORT: 'console',
    },
  },
});
