import type { D1Database } from '@cloudflare/workers-types';
import type { Category, Post, PostStatus, PostSummary, SiteSettings } from '$lib/types';

export type BlogPlatform = Pick<App.Platform, 'env'> | null | undefined;

export function getDatabase(platform: BlogPlatform): D1Database | null {
  return platform?.env?.DB ?? null;
}

type PostSummaryRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category_name: string | null;
  published_at: string | null;
};

type PostRow = PostSummaryRow & {
  content_markdown: string;
  cover_url: string | null;
  status: PostStatus;
  category_id: number | null;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SettingRow = { key: string; value: string };

export async function listPublishedPosts(db: D1Database): Promise<PostSummary[]> {
  const result = await db
    .prepare(
      [
        'SELECT p.id, p.slug, p.title, p.excerpt,',
        'c.name AS category_name, p.published_at',
        'FROM posts p',
        'LEFT JOIN categories c ON c.id = p.category_id',
        "WHERE p.status = 'published'",
        'ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC'
      ].join(' ')
    )
    .all<PostSummaryRow>();

  return result.results.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    categoryName: row.category_name,
    publishedAt: row.published_at
  }));
}

export async function getPublishedPostBySlug(
  db: D1Database,
  slug: string
): Promise<Post | null> {
  const row = await db
    .prepare(
      [
        'SELECT p.id, p.slug, p.title, p.excerpt, p.content_markdown,',
        'p.cover_url, p.status, p.category_id, c.name AS category_name,',
        'p.published_at, p.created_at, p.updated_at',
        'FROM posts p',
        'LEFT JOIN categories c ON c.id = p.category_id',
        "WHERE p.slug = ? AND p.status = 'published'",
        'LIMIT 1'
      ].join(' ')
    )
    .bind(slug)
    .first<PostRow>();

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    coverUrl: row.cover_url,
    status: row.status,
    categoryId: row.category_id,
    categoryName: row.category_name,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCategories(db: D1Database): Promise<Category[]> {
  const result = await db
    .prepare(
      [
        'SELECT id, slug, name, description, sort_order, created_at, updated_at',
        'FROM categories',
        'ORDER BY sort_order ASC, name ASC'
      ].join(' ')
    )
    .all<CategoryRow>();

  return result.results.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function getSiteSettings(db: D1Database): Promise<SiteSettings> {
  const result = await db
    .prepare('SELECT key, value FROM site_settings ORDER BY key ASC')
    .all<SettingRow>();

  return Object.fromEntries(result.results.map((row) => [row.key, row.value]));
}
