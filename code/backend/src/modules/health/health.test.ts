import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

/*
 * One listening server for the whole file, not one per request.
 *
 * `request(server)` makes supertest bind a fresh ephemeral server for every single call, and this
 * suite makes thousands of them. That churn produced an intermittent "socket hang up" on a random
 * test roughly one run in five — never reproducible for a file on its own. Handing supertest a
 * server that is already listening reuses one socket for the file instead.
 */
const app = createApp();
const server = app.listen(0);
afterAll(() => {
  server.close();
});

describe('GET /api/health', () => {
  it('reports the service as reachable', async () => {
    const response = await request(server).get('/api/health');

    expect(response.body.service).toBe('campuslink-api');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('returns the uniform JSON error envelope for unknown routes', async () => {
    // The web client's ApiError depends on this exact shape, so it is worth pinning down.
    const response = await request(server).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toContain('/api/does-not-exist');
  });
});
