import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('reports the service as reachable', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body.service).toBe('campuslink-api');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('returns the uniform JSON error envelope for unknown routes', async () => {
    // The web client's ApiError depends on this exact shape, so it is worth pinning down.
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toContain('/api/does-not-exist');
  });
});
