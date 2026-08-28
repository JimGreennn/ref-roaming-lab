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
