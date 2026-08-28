import type { PageServerLoad } from './$types';
import {
  getDatabase,
  getSiteSettings,
  listCategories,
  listPublishedPosts
} from '$lib/server/db';
import type { SiteSettings } from '$lib/types';

const emptySettings: SiteSettings = {};

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDatabase(platform);

  if (!db) {
    return {
      status: 'database-unavailable' as const,
      posts: [],
      categories: [],
      settings: emptySettings
    };
  }

  try {
    const [posts, categories, settings] = await Promise.all([
      listPublishedPosts(db),
      listCategories(db),
      getSiteSettings(db)
    ]);

    return { status: 'ok' as const, posts, categories, settings };
  } catch (error) {
    console.error('Failed to load public blog data', error);
    return {
      status: 'database-error' as const,
      posts: [],
      categories: [],
      settings: emptySettings
    };
  }
};
