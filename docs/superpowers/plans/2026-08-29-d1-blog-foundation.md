# D1 个人博客基础框架实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 实现一个可在 Cloudflare Pages 运行、从 Cloudflare D1 读取公开文章的个人博客最小基础框架。

**Architecture:** 使用 SvelteKit 的服务端路由承载页面数据查询，通过 @sveltejs/adapter-cloudflare 生成 Cloudflare Pages 构建产物。GitHub 只保存源代码，Cloudflare Pages 负责部署，Pages 的 D1 binding DB 提供运行时数据库；所有 SQL 查询集中在一个服务端数据访问模块中。

**Tech Stack:** SvelteKit、Svelte、TypeScript、Vite、@sveltejs/adapter-cloudflare、Cloudflare Pages Functions、Cloudflare D1、Wrangler、Vitest。

**Spec:** docs/superpowers/specs/2026-08-29-d1-blog-foundation-design.md

## Global Constraints

- Cloudflare Pages 构建命令固定为 npm run build，输出目录固定为 .svelte-kit/cloudflare。
- D1 binding 名称固定为 DB；公共页面只读取 status = 'published' 的文章。
- 文章正文存储在 posts.content_markdown，第一版使用安全的纯文本块展示，不执行未经处理的 HTML。
- 第一版只建立 categories、posts、site_settings 三张表；一个文章最多属于一个分类。
- 第一版不加入登录、管理员后台、会员、CRM、支付、外部元数据抓取或 R2 图片上传。
- 首页、文章详情页和健康检查接口必须在 D1 未配置时返回清楚的用户提示，不暴露堆栈、SQL 或密钥。
- 数据库查询必须使用参数绑定；D1 凭据、Cloudflare API Token 和其他真实秘密不得进入 Git 仓库。
- 不复制参考项目的源代码、文案、图片、品牌名称、样式细节或业务数据。
- 每个任务完成后单独运行该任务的验证命令，并只提交本任务涉及的文件。

---

## 文件地图

| 文件 | 职责 |
|---|---|
| package.json | 项目名称、构建、检查、测试和 D1 操作脚本 |
| svelte.config.js | SvelteKit 的 Cloudflare adapter 配置 |
| vite.config.ts | SvelteKit/Vite 插件和 Vitest 测试匹配规则 |
| tsconfig.json | SvelteKit 生成类型和严格 TypeScript 检查 |
| src/app.d.ts | platform.env.DB 的 Cloudflare 类型声明 |
| src/app.html | 页面 HTML 外壳和语言设置 |
| src/app.css | 第一版最小全局样式 |
| src/routes/+layout.svelte | 加载全局样式并渲染页面插槽 |
| src/lib/types.ts | 分类、文章和网站设置的共享类型 |
| src/lib/server/db.ts | D1 绑定读取、查询、参数绑定和行数据转换 |
| src/lib/server/db.test.ts | 数据访问模块的单元测试，使用假的 D1 binding |
| migrations/0001_initial.sql | 三张 D1 表、索引和本项目自己的示例数据 |
| src/routes/api/health/+server.ts | 检查 Pages Functions 和 D1 状态 |
| src/routes/api/health/health.test.ts | 健康接口的成功和未配置测试 |
| src/routes/+page.server.ts | 首页读取文章、分类和网站设置 |
| src/routes/+page.svelte | 首页占位界面和数据库错误状态 |
| src/routes/posts/[slug]/+page.server.ts | 文章详情查询和 404 处理 |
| src/routes/posts/[slug]/+page.svelte | 文章详情占位界面 |
| wrangler.toml | Pages 本地运行所需的最小 Wrangler 配置 |
| .gitignore | 忽略构建产物、本地 D1 状态和本地秘密配置 |
| README.md | 面向新手的本地运行、D1 创建和 Pages 部署说明 |

真实 D1 数据库 ID 在用户创建 Cloudflare D1 后才存在，因此基础仓库先在根 wrangler.toml 中使用明确标注的本地 ID local。创建远程 D1 后，用 Cloudflare 返回的真实 ID 替换 local，再进行远程 migration 和生产部署；生产环境的 binding 名称统一为 DB。

## 任务分解

### Task 1: 建立 SvelteKit Cloudflare 项目骨架

**Files:**

- Create: package.json
- Create: svelte.config.js
- Create: vite.config.ts
- Create: tsconfig.json
- Create: src/app.d.ts
- Create: src/app.html
- Create: src/routes/+page.svelte
- Create: wrangler.toml
- Create: .gitignore
- Create: pnpm-lock.yaml（当前工作区由 pnpm 生成）

**Interfaces:**

- Produces: npm run check、npm run build、npm run test 三个稳定脚本；Cloudflare Pages 构建输出目录 .svelte-kit/cloudflare；App.Platform.env.DB 的类型入口。
- Consumes: 无，作为后续所有任务的项目运行时基础。

- [ ] **Step 1: 写入项目配置和最小页面**

创建 package.json 时保留下面的项目元数据和 scripts；依赖版本由执行时的 pnpm 解析并写入 pnpm-lock.yaml，不手工复制参考项目的依赖配置。

~~~json
{
  "name": "personal-blog",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest --passWithNoTests",
    "db:migrate:local": "wrangler d1 migrations apply personal-blog-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply personal-blog-db --remote"
  }
}
~~~

安装运行时和开发依赖：

~~~powershell
pnpm add -D @sveltejs/kit @sveltejs/adapter-cloudflare @sveltejs/vite-plugin-svelte @cloudflare/workers-types @types/node svelte svelte-check typescript vite vitest wrangler
~~~

创建 svelte.config.js：

~~~js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
~~~

创建 vite.config.ts：

~~~ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
~~~

创建 tsconfig.json：

~~~json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
~~~

创建 src/app.d.ts，让服务端页面能够安全访问 Cloudflare 的 D1 binding：

~~~ts
declare global {
  namespace App {
    interface Platform {
      env: {
        DB?: D1Database;
      };
    }
  }
}

export {};
~~~

创建 wrangler.toml，声明 Pages 构建配置和本地 D1 binding；local 只用于本地运行，远程部署前必须替换为 Cloudflare 返回的真实 database_id：

~~~toml
name = "personal-blog"
compatibility_date = "2026-08-26"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "personal-blog-db"
database_id = "local"
migrations_dir = "migrations"
~~~

创建 .gitignore：

~~~gitignore
node_modules/
.svelte-kit/
build/
.wrangler/
.env
.env.*
!.env.example
.dev.vars
~~~

创建 src/app.html 和最小首页，使项目在数据库功能加入前也能启动：

~~~html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
~~~

~~~svelte
<svelte:head>
  <title>Personal Blog</title>
</svelte:head>

<main>
  <h1>Personal Blog</h1>
  <p>博客基础框架已启动。</p>
</main>
~~~

- [ ] **Step 2: 运行骨架检查**

运行：

~~~powershell
npm run check
npm run build
npm run test
~~~

预期：三个命令都成功；build 在 .svelte-kit/cloudflare 生成 Pages 构建产物；test 因当前没有测试文件而正常退出，不应出现 TypeScript 或 adapter 错误。

- [ ] **Step 3: 提交骨架**

~~~powershell
git add package.json pnpm-lock.yaml pnpm-workspace.yaml svelte.config.js vite.config.ts tsconfig.json src/app.d.ts src/app.html src/routes/+page.svelte wrangler.toml .gitignore
git commit -m "build: scaffold cloudflare pages blog"
~~~

### Task 2: 建立类型安全的 D1 数据访问边界

**Files:**

- Create: src/lib/types.ts
- Create: src/lib/server/db.ts
- Create: src/lib/server/db.test.ts

**Interfaces:**

- Consumes: Task 1 提供的 App.Platform 和 D1Database 类型。
- Produces: getDatabase(platform)、listPublishedPosts(db)、getPublishedPostBySlug(db, slug)、listCategories(db)、getSiteSettings(db)。

- [ ] **Step 1: 先写 D1 数据访问失败测试**

在 src/lib/server/db.test.ts 中先写下面的测试契约。假的 binding 只实现测试所需的 prepare、bind、all 和 first，再通过类型断言转成 D1Database，不引入第二套数据库驱动。

~~~ts
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
~~~

运行：

~~~powershell
npm run test -- src/lib/server/db.test.ts
~~~

预期：测试先因 src/lib/server/db.ts 不存在而失败。

- [ ] **Step 2: 写共享类型和最小查询实现**

创建 src/lib/types.ts：

~~~ts
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
~~~

创建 src/lib/server/db.ts。查询必须固定使用 published 条件；slug 使用 bind(slug)，不得用字符串拼接：

~~~ts
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
~~~

- [ ] **Step 3: 重新运行数据访问测试**

~~~powershell
npm run test -- src/lib/server/db.test.ts
npm run check
~~~

预期：数据访问测试全部通过；TypeScript 不再报告 snake_case 行类型到 camelCase 公共类型的转换错误。

- [ ] **Step 4: 提交数据访问边界**

~~~powershell
git add src/lib/types.ts src/lib/server/db.ts src/lib/server/db.test.ts
git commit -m "feat: add typed d1 data access"
~~~

### Task 3: 创建 D1 表结构和本地迁移验证

**Files:**

- Create: migrations/0001_initial.sql
- Modify: package.json（本地 migration 和 Pages 预览使用根目录 wrangler.toml）

**Interfaces:**

- Consumes: Task 2 约定的 posts、categories、site_settings 字段和查询名称。
- Produces: 可重复执行的初始 D1 migration，以及 slug 为 welcome 的已发布示例文章。

- [ ] **Step 1: 写入初始 migration**

创建 migrations/0001_initial.sql：

~~~sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content_markdown TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  category_id INTEGER,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published_at
  ON posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category_id
  ON posts (category_id);

INSERT OR IGNORE INTO categories (slug, name, description, sort_order)
VALUES ('notes', '笔记', '记录想法与学习过程', 1);

INSERT OR IGNORE INTO posts (
  slug,
  title,
  excerpt,
  content_markdown,
  status,
  category_id,
  published_at
)
SELECT
  'welcome',
  '博客基础框架已启动',
  '这是一篇用于验证 D1 数据链路的示例文章。',
  '这是本项目自己的占位内容。后续可以从 D1 管理文章。',
  'published',
  id,
  CURRENT_TIMESTAMP
FROM categories
WHERE slug = 'notes';

INSERT OR IGNORE INTO site_settings (key, value)
VALUES
  ('site_title', '我的个人博客'),
  ('site_description', '记录、思考与分享');
~~~

- [ ] **Step 2: 应用本地 migration 并检查结构**

运行：

~~~powershell
npm run db:migrate:local
npx wrangler d1 execute personal-blog-db --local --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'posts', 'site_settings') ORDER BY name;"
npx wrangler d1 execute personal-blog-db --local --command "SELECT slug, status, title FROM posts WHERE slug = 'welcome';"
~~~

预期：第一条查询返回 categories、posts、site_settings 三张表；第二条查询返回一条 welcome / published 记录。再次执行 migration 不得产生重复示例数据或唯一键错误。

- [ ] **Step 3: 运行完整静态检查并提交 migration**

~~~powershell
npm run check
npm run build
git add migrations/0001_initial.sql wrangler.toml package.json
git commit -m "feat: add initial d1 schema"
~~~

### Task 4: 接入健康接口和服务端页面加载

**Files:**

- Create: src/routes/api/health/+server.ts
- Create: src/routes/api/health/health.test.ts
- Create: src/routes/+page.server.ts
- Create: src/routes/posts/[slug]/+page.server.ts

**Interfaces:**

- Consumes: Task 2 的五个 D1 函数，以及 Task 3 的表结构。
- Produces: /api/health；首页 data.status、data.posts、data.categories、data.settings；文章页 data.status 和 data.post。

- [ ] **Step 1: 先写健康接口的失败和成功测试**

创建 src/routes/api/health/health.test.ts：

~~~ts
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
  }) as unknown as D1Database;
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
~~~

运行：

~~~powershell
npm run test -- src/routes/api/health/health.test.ts
~~~

预期：测试先因接口文件不存在而失败。

- [ ] **Step 2: 实现健康接口**

创建 src/routes/api/health/+server.ts：

~~~ts
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
~~~

- [ ] **Step 3: 实现首页服务端 load**

创建 src/routes/+page.server.ts：

~~~ts
import type { PageServerLoad } from './$types';
import {
  getDatabase,
  getSiteSettings,
  listCategories,
  listPublishedPosts
} from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
  const db = getDatabase(platform);

  if (!db) {
    return {
      status: 'database-unavailable' as const,
      posts: [],
      categories: [],
      settings: {}
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
      settings: {}
    };
  }
};
~~~

- [ ] **Step 4: 实现文章详情服务端 load**

创建 src/routes/posts/[slug]/+page.server.ts：

~~~ts
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
~~~

- [ ] **Step 5: 运行接口和类型验证**

~~~powershell
npm run test -- src/routes/api/health/health.test.ts
npm run check
npm run build
~~~

预期：健康接口测试通过；首页和文章页的服务端 load 通过严格类型检查；构建产物继续生成到 .svelte-kit/cloudflare。

- [ ] **Step 6: 提交服务端数据链路**

~~~powershell
git add src/routes/api/health/+server.ts src/routes/api/health/health.test.ts src/routes/+page.server.ts src/routes/posts/[slug]/+page.server.ts
git commit -m "feat: connect public routes to d1"
~~~

### Task 5: 添加最小占位界面和安全正文展示

**Files:**

- Create: src/app.css
- Create: src/routes/+layout.svelte
- Modify: src/routes/+page.svelte
- Create: src/routes/posts/[slug]/+page.svelte

**Interfaces:**

- Consumes: Task 4 首页和文章页 load 返回的 status、posts、categories、settings、post。
- Produces: 可在浏览器中验证的首页、详情页、空状态、D1 未配置状态和 404 状态；正文以 pre 文本展示，不使用 HTML 原文注入。

- [ ] **Step 1: 写入全局样式和布局**

创建 src/app.css：

~~~css
:root {
  font-family: system-ui, sans-serif;
  color: #1f2937;
  background: #f3f4f6;
}

body {
  margin: 0;
}

main {
  width: min(760px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

a {
  color: inherit;
}

.notice,
article,
.post-card {
  padding: 20px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: white;
}

.post-list {
  display: grid;
  gap: 16px;
}

.post-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  line-height: 1.7;
}
~~~

创建 src/routes/+layout.svelte：

~~~svelte
<script lang="ts">
  import '../app.css';
</script>

<slot />
~~~

- [ ] **Step 2: 实现首页占位界面**

将 src/routes/+page.svelte 改为：

~~~svelte
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.settings.site_title ?? '我的个人博客'}</title>
  <meta
    name="description"
    content={data.settings.site_description ?? '记录、思考与分享'}
  />
</svelte:head>

<main>
  <header>
    <p>Personal Blog Foundation</p>
    <h1>{data.settings.site_title ?? '我的个人博客'}</h1>
    <p>{data.settings.site_description ?? '记录、思考与分享'}</p>
  </header>

  {#if data.status === 'database-unavailable'}
    <section class="notice" aria-live="polite">
      数据库尚未配置。请先在 Cloudflare Pages 中绑定名称为 DB 的 D1 数据库。
    </section>
  {:else if data.status === 'database-error'}
    <section class="notice" aria-live="polite">
      暂时无法读取文章，请稍后再试。
    </section>
  {:else if data.posts.length === 0}
    <section class="notice">
      还没有已发布的文章。
    </section>
  {:else}
    <section class="post-list" aria-label="文章列表">
      {#each data.posts as post}
        <article class="post-card">
          <p>{post.categoryName ?? '未分类'} · {post.publishedAt ?? ''}</p>
          <h2><a href={'/posts/' + post.slug}>{post.title}</a></h2>
          <p>{post.excerpt}</p>
        </article>
      {/each}
    </section>
  {/if}
</main>
~~~

- [ ] **Step 3: 实现文章详情占位界面**

创建 src/routes/posts/[slug]/+page.svelte：

~~~svelte
<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>{data.status === 'ok' ? data.post.title : '文章暂不可用'}</title>
</svelte:head>

<main>
  <p><a href="/">← 返回首页</a></p>

  {#if data.status === 'database-unavailable'}
    <section class="notice">数据库尚未配置，暂时无法读取文章。</section>
  {:else if data.status === 'database-error'}
    <section class="notice">暂时无法读取文章，请稍后再试。</section>
  {:else}
    <article>
      <p>{data.post.categoryName ?? '未分类'} · {data.post.publishedAt ?? ''}</p>
      <h1>{data.post.title}</h1>
      <p>{data.post.excerpt}</p>
      <pre class="post-content">{data.post.contentMarkdown}</pre>
    </article>
  {/if}
</main>
~~~

- [ ] **Step 4: 运行前端验证**

~~~powershell
npm run check
npm run build
~~~

预期：页面模板通过检查；构建成功；在有 D1 数据时首页显示 welcome 示例文章，点击后进入 /posts/welcome。

- [ ] **Step 5: 提交占位界面**

~~~powershell
git add src/app.css src/routes/+layout.svelte src/routes/+page.svelte src/routes/posts/[slug]/+page.svelte
git commit -m "feat: add minimal blog pages"
~~~

### Task 6: 补充新手文档并进行 Cloudflare Pages 发布前验证

**Files:**

- Create: README.md
- Modify: package.json
- Modify: wrangler.toml
- Modify: docs/superpowers/plans/2026-08-29-d1-blog-foundation.md
- Delete: wrangler.local.toml

**Interfaces:**

- Consumes: Task 1–5 的脚本、路由、migration 和配置。
- Produces: 新手可以照做的部署说明，以及本地 Pages + D1 的完整 smoke test 结果。

- [ ] **Step 1: 编写 README 的本地运行部分**

README 按以下顺序说明：

~~~text
1. 安装 Node.js 后进入项目目录。
2. 运行 npm install。
3. 运行 npm run check、npm run build。
4. 安装并登录 Wrangler：npx wrangler login。
5. 创建 D1：npx wrangler d1 create personal-blog-db（远程部署前执行）。
6. 运行本地迁移：npm run db:migrate:local。
7. 启动 Pages 本地预览：
   npx wrangler pages dev .svelte-kit/cloudflare。
8. 打开 /、/posts/welcome 和 /api/health 检查结果。
~~~

同时明确说明：本地 --local 使用 Wrangler 的本地 D1 状态；不要把 API Token、密码或 .dev.vars 提交到 GitHub；DB 是 binding 名称，不是数据库密码。

- [ ] **Step 2: 编写 Cloudflare Pages 部署部分**

README 明确写出控制台配置：

~~~text
1. 在 Cloudflare Workers & Pages 创建 Pages 项目。
2. 连接 GitHub 仓库，生产分支选择 main。
3. 构建命令填写 npm run build。
4. 构建输出目录填写 .svelte-kit/cloudflare。
5. 在 Settings > Bindings > Add > D1 database bindings 中添加绑定。
6. Variable name 填 DB，D1 database 选择 personal-blog-db。
7. 保存后重新部署。
8. 在已认证的 Wrangler 环境运行 npm run db:migrate:remote。
~~~

README 还要说明：GitHub 负责存放代码，Cloudflare Pages 负责发布网站，D1 负责保存文章；不需要购买 VPS。自定义域名属于后续配置，不影响基础框架。

- [ ] **Step 3: 运行最终本地 smoke test**

在迁移已经应用且本地 Pages 预览正在运行时，使用 PowerShell 新开一个终端执行：

~~~powershell
$health = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8788/api/health
$health.StatusCode
$health.Content

$home = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8788/
$home.StatusCode
$home.Content

$post = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8788/posts/welcome
$post.StatusCode
$post.Content

try {
  Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8788/posts/not-found
} catch {
  $_.Exception.Response.StatusCode.value__
}
~~~

预期：健康接口返回 200 且正文包含 "database":"connected"；首页和 /posts/welcome 返回 200 且包含示例文章标题；不存在的 slug 返回 404。

- [ ] **Step 4: 做一次无 D1 绑定的错误状态验证**

在移除根 wrangler.toml 中的 D1 binding 的临时测试副本里访问 /api/health 和 /，确认健康接口返回 503，首页显示“数据库尚未配置”，响应中不出现 SQL、文件路径、堆栈或环境变量值。测试结束后恢复根配置。

- [ ] **Step 5: 完成发布前静态检查并提交文档**

~~~powershell
npm run test
npm run check
npm run build
git diff --check
git add README.md package.json wrangler.toml docs/superpowers/plans/2026-08-29-d1-blog-foundation.md wrangler.local.toml
git commit -m "docs: add cloudflare deployment guide"
~~~

- [ ] **Step 6: 在 Cloudflare 账号已连接后执行远程发布检查**

只有在用户完成 Cloudflare 登录、D1 创建并连接 GitHub 后执行远程动作：

~~~powershell
npx wrangler d1 migrations apply personal-blog-db --remote
~~~

然后在 Cloudflare Pages 触发一次部署，确认生产环境的 /api/health、/、/posts/welcome 和不存在文章的 404 行为。若远程部署无法进行，应记录具体的账号或绑定错误，不把“代码构建通过”误报为“网站已经上线”。

## 实施完成判定

完成所有任务后，必须同时具备以下证据：

- npm run test、npm run check、npm run build 均通过。
- 本地 D1 migration 创建三张表并写入 welcome 示例文章。
- 本地 Pages 预览能让 /api/health 读取到 D1。
- 首页能读取文章列表，详情页能读取单篇文章，不存在 slug 返回 404。
- D1 未配置时显示友好提示且不泄露内部错误。
- Git 提交中没有加入 .skill-standardization-stage/、outputs/ 等与本项目无关的未跟踪目录。
- 只有在远程 Cloudflare 绑定和部署 smoke test 真实通过后，才能向用户说明网站已发布。
