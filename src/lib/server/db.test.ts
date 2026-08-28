import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  getDatabase,
  getPublishedPostBySlug,
  listPublishedPosts,
  listCategories,
  getSiteSettings
} from './db';

function fakeDatabase(response: {
  rows?: unknown[];
  first?: unknown | null;
}) {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(async () => ({ results: response.rows ?? [] })),
    first: vi.fn(async () => response.first ?? null)
  };

  const db = {
    prepare: vi.fn(() => statement)
  } as unknown as D1Database;

  return { db, statement };
}

describe('getDatabase', () => {
  it('returns null when Pages has no DB binding', () => {
    expect(getDatabase(undefined)).toBeNull();
    expect(getDatabase({ env: {} })).toBeNull();
  });
});

describe('public blog queries', () => {
  it('maps published post rows to camelCase public summaries', async () => {
    const { db, statement } = fakeDatabase({
      rows: [
        {
          id: 1,
          slug: 'welcome',
          title: '欢迎',
          excerpt: '第一篇文章',
          category_name: '随笔',
          published_at: '2026-08-29T00:00:00Z'
        }
      ]
    });

    await expect(listPublishedPosts(db)).resolves.toEqual([
      {
        id: 1,
        slug: 'welcome',
        title: '欢迎',
        excerpt: '第一篇文章',
        categoryName: '随笔',
        publishedAt: '2026-08-29T00:00:00Z'
      }
    ]);
    expect(statement.all).toHaveBeenCalledOnce();
  });

  it('binds the slug and returns a full published post', async () => {
    const { db, statement } = fakeDatabase({
      first: {
        id: 1,
        slug: 'welcome',
        title: '欢迎',
        excerpt: '第一篇文章',
        content_markdown: '正文',
        cover_url: null,
        status: 'published',
        category_id: 1,
        category_name: '随笔',
        published_at: '2026-08-29T00:00:00Z',
        created_at: '2026-08-29T00:00:00Z',
        updated_at: '2026-08-29T00:00:00Z'
      }
    });

    await expect(getPublishedPostBySlug(db, 'welcome')).resolves.toMatchObject({
      slug: 'welcome',
      contentMarkdown: '正文',
      categoryName: '随笔'
    });
    expect(statement.bind).toHaveBeenCalledWith('welcome');
  });

  it('maps categories and key-value settings', async () => {
    const categoryDb = fakeDatabase({
      rows: [
        {
          id: 1,
          slug: 'notes',
          name: '笔记',
          description: '',
          sort_order: 1,
          created_at: '2026-08-29T00:00:00Z',
          updated_at: '2026-08-29T00:00:00Z'
        }
      ]
    });
    await expect(listCategories(categoryDb.db)).resolves.toEqual([
      expect.objectContaining({ slug: 'notes', sortOrder: 1 })
    ]);

    const settingsDb = fakeDatabase({
      rows: [
        { key: 'site_title', value: '我的博客' },
        { key: 'site_description', value: '记录与分享' }
      ]
    });
    await expect(getSiteSettings(settingsDb.db)).resolves.toEqual({
      site_title: '我的博客',
      site_description: '记录与分享'
    });
  });
});
