# D1 个人博客基础框架设计

## 文档状态

待用户复核。本文档确认后，才进入实现阶段。

## 1. 目标与范围

### 目标

从零搭建一个适合个人博客的 Cloudflare 原生基础框架：

- 使用 Cloudflare Pages 托管网站和部署代码。
- 使用 Cloudflare D1 保存文章、分类和网站设置。
- 使用 GitHub 保存源代码，并作为 Cloudflare Pages 的自动部署来源。
- 先放一个足够简单的静态占位界面，重点验证完整的“代码 → Pages → D1 → 页面”的链路。
- 后续可以在这个基础上增加文章管理后台、登录、图片存储等功能。

### 本阶段明确不做

以下内容不属于第一版基础框架：

- 复杂视觉设计、动画和响应式细节。
- 用户注册、登录、会员或 VIP 功能。
- 管理员后台和文章编辑器。
- CRM、邮件通知、积分或支付。
- 自动抓取外部网页标题、图标或元数据。
- 复制参考项目的代码、文字、图片、种子数据或品牌结构。

参考项目只用于理解“一个内容型网站通常有哪些层次”，本项目从零编写自己的目录、数据表和路由。

## 2. 技术方案

### 已选方案：Cloudflare Pages + SvelteKit + D1

项目采用以下组合：

- 前端与路由：SvelteKit + TypeScript。
- Cloudflare 运行适配：`@sveltejs/adapter-cloudflare`。
- 托管与部署：Cloudflare Pages。
- 动态服务端逻辑：Cloudflare Pages Functions，由 SvelteKit 页面服务端代码承载。
- 数据库：Cloudflare D1，绑定名称统一使用 `DB`。
- 代码仓库：GitHub。

GitHub 只保存代码；D1 保存运行时内容。用户访问网站时，服务端从 D1 查询已发布文章，而不是把全部文章直接打包成公开 JSON 文件。

### 为什么第一版采用 D1

这个博客后续需要文章、分类和可能的后台管理。现在就把数据访问集中在 D1，可以避免先做一套 JSON/Markdown 方案，之后再整体迁移数据库。第一版虽然没有后台，但数据模型已经为后续后台预留位置。

### 文章内容格式

文章正文先存放在 D1 的 `content_markdown` 字段中。第一版只做安全、简单的内容展示，不加入复杂 Markdown 编辑器和扩展插件；真正的 Markdown 渲染、图片上传和编辑器放到后续版本。

这样可以先验证数据链路，又不会因为编辑器、HTML 清洗和上传系统把基础框架做复杂。

## 3. 最小数据模型

第一版只建立三张表。字段名称使用英文，方便代码和 SQL 维护；界面显示文字以后可以使用中文。

### `categories`：文章分类

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `slug` | TEXT | URL 中使用的唯一标识 |
| `name` | TEXT | 分类名称 |
| `description` | TEXT | 分类简介，可为空字符串 |
| `sort_order` | INTEGER | 排序值，默认 100 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

`slug` 必须唯一，例如 `notes`、`life`。第一版一个文章只属于一个分类，不建立复杂的多对多关系表。

### `posts`：文章

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `slug` | TEXT | 文章 URL 标识，必须唯一 |
| `title` | TEXT | 标题 |
| `excerpt` | TEXT | 摘要 |
| `content_markdown` | TEXT | 正文原始内容 |
| `cover_url` | TEXT | 封面地址，可为空 |
| `status` | TEXT | `draft` 或 `published` |
| `category_id` | INTEGER | 所属分类，可为空 |
| `published_at` | TEXT | 发布时间，可为空 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

对 `status` 和 `published_at` 建索引，保证首页只查询已发布文章。`slug` 建唯一约束，避免两个文章使用同一个地址。

### `site_settings`：网站设置

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | TEXT | 设置名称，主键 |
| `value` | TEXT | 设置值 |
| `updated_at` | TEXT | 更新时间 |

第一版可以放置网站名称、简介等基础设置。后续增加设置时只需要增加数据，不需要频繁修改表结构。

### 初始化数据

迁移文件会创建一条示例分类和一篇示例文章，用于验证页面是否能够真正从 D1 读取数据。示例内容会是本项目自己的通用占位内容，不复制参考项目数据。

## 4. 页面和接口结构

### 页面路由

#### `/`

首页只做基础占位界面：

- 显示网站名称和简单说明。
- 从 D1 读取已发布文章列表。
- 显示文章标题、摘要、分类和发布时间。
- 点击文章进入文章详情页。
- 没有文章时显示友好的空状态提示。

#### `/posts/[slug]`

文章详情页：

- 根据 URL 中的 `slug` 从 D1 查询一篇已发布文章。
- 显示标题、摘要、分类、发布时间和正文。
- 找不到文章时返回标准 404 页面。

界面使用简单 HTML 和少量 CSS，仅用于验证功能，不把本阶段时间花在视觉打磨上。

### 接口路由

#### `/api/health`

用于检查 Pages Functions 是否正常运行以及 D1 是否可访问。返回的信息只包含健康状态，例如数据库是否连接成功，不返回账号、密钥、SQL 内容或其他敏感信息。

数据库不可用时返回明确的失败状态和适合排查的通用提示；详细错误只写入服务端日志。

## 5. 目录职责

实现阶段预计采用以下职责划分：

```text
src/
  lib/
    server/
      db.ts              # D1 连接、查询和数据转换
    types.ts             # 文章、分类、设置的共享类型
  routes/
    +page.server.ts      # 首页服务端查询
    +page.svelte         # 首页占位界面
    api/
      health/
        +server.ts       # 健康检查接口
    posts/
      [slug]/
        +page.server.ts  # 文章详情查询
        +page.svelte     # 文章详情占位界面
migrations/
  0001_initial.sql       # D1 初始表结构和示例数据
wrangler.toml            # Cloudflare Pages / D1 配置
```

所有数据库查询集中在 `src/lib/server/db.ts`，页面不直接拼接 SQL。查询使用参数绑定，避免把用户输入直接拼进 SQL 字符串。

## 6. 配置和部署方式

### 本地配置

项目会配置 Cloudflare Pages 的构建输出目录：

- 构建命令：`npm run build`
- Pages 输出目录：`.svelte-kit/cloudflare`
- D1 绑定名称：`DB`

D1 的真实 `database_id` 由用户在 Cloudflare 创建数据库后获得。数据库 ID 不是密码，但在数据库创建前无法提前填写；实现阶段会在配置和 README 中明确标出需要替换的位置，并保证不把任何密钥提交到 GitHub。

### Cloudflare Pages 部署

部署流程设计为：

1. 在 GitHub 创建或连接个人博客代码仓库。
2. 在 Cloudflare Pages 中连接 GitHub 仓库。
3. 设置生产分支为 `main`。
4. 设置构建命令为 `npm run build`，输出目录为 `.svelte-kit/cloudflare`。
5. 在 Cloudflare Pages 项目中绑定 D1 数据库，绑定名称为 `DB`。
6. 执行 D1 迁移，创建三张表和示例数据。
7. 推送代码后由 Cloudflare Pages 自动构建和发布。

不需要购买或维护 VPS。GitHub 负责保存代码，Cloudflare Pages 负责运行网站，D1 负责保存内容。

## 7. 异常行为

基础框架需要明确处理以下情况：

- D1 未绑定：首页显示“数据库尚未配置”的友好提示，健康接口返回失败状态，不能展示堆栈信息。
- D1 查询失败：页面显示通用错误提示，详细原因只进入服务端日志。
- 没有已发布文章：显示空状态，不把草稿文章展示给访客。
- 访问不存在的文章地址：返回 404。
- 文章状态不是 `published`：公共页面不可访问。
- 缺少环境配置：构建阶段给出可读的配置提示，不在仓库里写入真实凭据。

## 8. 安全和版权边界

- 第一版不收集用户账号、密码、邮箱或支付信息，因此暂不引入登录系统。
- 所有公共查询只读取 `published` 文章。
- 不把 D1 管理凭据、Cloudflare API Token 或其他密钥提交到 GitHub。
- 页面查询使用参数化 SQL。
- 正文展示不直接执行未经处理的任意 HTML；完整 Markdown 渲染和 HTML 清洗会在后续单独设计。
- 参考项目只作为功能层次的研究对象，不复制其源代码、文案、图片、品牌名称、样式细节或业务数据。

## 9. 验收标准

进入实现阶段后，至少需要满足：

1. 新项目安装依赖后，`npm run check` 通过。
2. `npm run build` 成功生成 Cloudflare Pages 构建产物。
3. 执行 D1 迁移后，三张表能够创建，示例分类和示例文章能够写入。
4. 本地 Cloudflare 运行环境可以访问 `/api/health`，并能显示 D1 可用状态。
5. 首页能够从 D1 读取并显示示例文章。
6. `/posts/示例文章slug` 能够打开文章详情页。
7. 不存在的文章地址返回 404。
8. 未绑定 D1 时，网站仍显示清楚的配置提示，而不是暴露运行时错误。
9. Git 仓库中不存在真实凭据，也没有参考项目的受版权保护内容。

## 10. 后续迭代顺序

基础框架稳定后，建议按以下顺序增加能力：

1. 文章 Markdown 渲染和代码高亮。
2. 最小管理员登录和文章 CRUD 后台。
3. 图片上传到 Cloudflare R2。
4. SEO、RSS、站点地图和自定义域名。
5. 如确实需要，再增加用户账号、会员或其他业务模块。

## 11. 官方文档

- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare D1 入门](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare Pages Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)
