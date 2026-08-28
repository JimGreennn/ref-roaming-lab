import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Home from './+page.svelte';

describe('home page', () => {
  it('shows a setup message when D1 is unavailable', () => {
    const { body } = render(Home, {
      props: {
        data: {
          status: 'database-unavailable',
          posts: [],
          categories: [],
          settings: {}
        }
      }
    });

    expect(body).toContain('数据库尚未配置');
  });

  it('renders a published post link', () => {
    const { body } = render(Home, {
      props: {
        data: {
          status: 'ok',
          posts: [
            {
              id: 1,
              slug: 'welcome',
              title: '欢迎',
              excerpt: '第一篇文章',
              categoryName: '笔记',
              publishedAt: '2026-08-29T00:00:00Z'
            }
          ],
          categories: [],
          settings: {}
        }
      }
    });

    expect(body).toContain('href="/posts/welcome"');
    expect(body).toContain('欢迎');
  });
});
