import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/**/*.{test,spec}.{js,ts}', 'packages/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
    },
  },
});
