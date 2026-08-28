export type PostStatus = 'draft' | 'published';

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  categoryName: string | null;
  publishedAt: string | null;
}

export interface Post extends PostSummary {
  contentMarkdown: string;
  coverUrl: string | null;
  status: PostStatus;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type SiteSettings = Record<string, string>;
