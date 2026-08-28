import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';

export const GET: RequestHandler = async ({ platform }) => {
  const db = getDatabase(platform);

  if (!db) {
    return json({ ok: false, database: 'unavailable' }, { status: 503 });
  }

  try {
    await db.prepare('SELECT 1 AS ok').first();
    return json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('D1 health check failed', error);
    return json({ ok: false, database: 'unavailable' }, { status: 503 });
  }
};
