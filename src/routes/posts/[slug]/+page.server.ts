import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDatabase, getPublishedPostBySlug } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = getDatabase(platform);

  if (!db) {
    return { status: 'database-unavailable' as const, post: null };
  }

  try {
    const post = await getPublishedPostBySlug(db, params.slug);

    if (!post) {
      error(404, '文章不存在');
    }

    return { status: 'ok' as const, post };
  } catch (caught) {
    if (caught && typeof caught === 'object' && 'status' in caught && caught.status === 404) {
      throw caught;
    }

    console.error('Failed to load blog post', caught);
    return { status: 'database-error' as const, post: null };
  }
};
