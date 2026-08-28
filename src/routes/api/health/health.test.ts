import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { GET } from './+server';

function eventWithDb(db?: D1Database) {
  return {
    platform: db ? { env: { DB: db } } : undefined
  } as Parameters<typeof GET>[0];
}

function healthyDb() {
  return {
    prepare: vi.fn(() => ({
      first: vi.fn(async () => ({ ok: 1 }))
    }))
  } as unknown as D1Database;
}

describe('GET /api/health', () => {
  it('returns 503 without a D1 binding', async () => {
    const response = await GET(eventWithDb());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      database: 'unavailable'
    });
  });

  it('returns connected when D1 responds to SELECT 1', async () => {
    const response = await GET(eventWithDb(healthyDb()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      database: 'connected'
    });
  });
});
