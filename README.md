# 个人博客基础框架

这是一个面向个人博客的 Cloudflare Pages + D1 最小项目。

简单理解：

- GitHub：保存项目代码。
- Cloudflare Pages：把代码变成可以访问的网站。
- Cloudflare D1：保存文章、分类和网站设置。
- 不需要购买 VPS 服务器。

当前版本已经完成基础链路验证，界面仍是简单占位界面，暂不包含登录、后台、会员、支付、CRM、图片上传或复杂 Markdown 编辑器。

## 本地运行

需要 Node.js 22 或更高版本。当前项目使用 pnpm 锁文件；如果电脑已安装 pnpm，推荐使用下面的命令：

~~~powershell
pnpm install
pnpm run check
pnpm run test
pnpm run build
~~~

如果只安装了 npm，也可以使用 npm install 和 npm run check、npm run test、npm run build。

## 本地 D1 数据库

第一次使用 Wrangler 时先登录 Cloudflare：

~~~powershell
npx wrangler login
~~~

本项目根目录的 wrangler.toml 已声明本地 D1 配置，数据库名称是 personal-blog-db，binding 名称是 DB。执行本地 migration：

~~~powershell
pnpm run db:migrate:local
~~~

这个命令只写入项目下被 Git 忽略的 .wrangler 本地状态，不会修改远程 D1。

构建后启动 Cloudflare Pages 本地预览：

~~~powershell
pnpm run build
pnpm run preview:cf
~~~

然后打开：

- http://127.0.0.1:8788/：首页
- http://127.0.0.1:8788/posts/welcome：示例文章
- http://127.0.0.1:8788/api/health：D1 健康检查

预期健康检查返回 200，并包含 database 为 connected。不存在的文章地址，例如 /posts/not-found，应返回 404。

如果不传 D1 binding 启动 Pages 预览，健康接口应返回 503，首页应显示“数据库尚未配置”。

## 连接 GitHub 和 Cloudflare Pages

### 1. 创建 GitHub 仓库

如果从零创建仓库，请使用空仓库，不要勾选自动生成 README、.gitignore 或许可证，因为本地项目已经有这些文件。本项目当前使用的仓库是 `JimGreennn/ref-roaming-lab`。

在本地项目目录执行：

~~~powershell
git remote add origin https://github.com/JimGreennn/ref-roaming-lab.git
git branch -M main
git push -u origin main
~~~

如果仓库名称不同，只需要把命令中的 `ref-roaming-lab` 改成实际仓库名称。

### 2. 创建远程 D1

在已登录 Cloudflare 的终端执行：

~~~powershell
npx wrangler d1 create personal-blog-db
~~~

命令会返回数据库 ID 和 D1 配置片段。首次配置项目时，将返回的真实 database_id 写入 wrangler.toml，并确认：

- binding 是 DB。
- database_name 是 personal-blog-db。
- database_id 使用 Cloudflare 返回的真实 ID。
- migrations_dir 是 migrations。

真实数据库 ID 只用于 Cloudflare 配置，不是密码；API Token、密码和其他秘密不能提交到 GitHub。

将 migration 应用到远程 D1：

~~~powershell
pnpm run db:migrate:remote
~~~

### 3. 创建 Cloudflare Pages 项目

在 Cloudflare 控制台进入 Workers & Pages，连接 GitHub 仓库并设置：

| 设置 | 值 |
|---|---|
| Production branch | main |
| Build command | npm run build |
| Build output directory | .svelte-kit/cloudflare |

项目部署后，在 Pages 项目的 Settings > Bindings > Add > D1 database bindings 中添加 D1：

- Variable name：DB
- D1 database：personal-blog-db

保存后重新部署。Cloudflare Pages 的生产和预览环境都应检查 binding 是否存在。

当前线上部署已经完成：

- GitHub 仓库：`JimGreennn/ref-roaming-lab`
- Cloudflare Pages 项目：`ref-roaming-lab-git`
- 生产分支：`main`
- 生产域名：[roaming-lab.com](https://roaming-lab.com)

之后提交到 `main` 分支，Cloudflare Pages 会自动构建并发布新版本。

## 项目目录

~~~text
src/
  lib/
    server/db.ts       D1 查询和数据转换
    types.ts           文章、分类、设置类型
  routes/
    +page.server.ts    首页 D1 查询
    +page.svelte       首页占位界面
    api/health/        健康检查接口
    posts/[slug]/      文章详情页
migrations/
  0001_initial.sql     D1 初始表结构和示例数据
wrangler.toml          Pages 构建和 D1 配置
~~~

## 安全边界

- 公共页面只显示 published 文章。
- 查询使用参数绑定，文章 slug 不直接拼进 SQL。
- 文章正文暂时按纯文本显示，不执行任意 HTML。
- 不把 D1 凭据、Cloudflare API Token 或 .dev.vars 提交到 GitHub。
- 参考项目只用于理解功能层次，本项目不复制其代码、文案、图片或业务数据。

## 后续开发顺序

基础链路已经确认。后续再按需要增加 Markdown 渲染、管理员登录、文章 CRUD、R2 图片上传、SEO 和 RSS。

## 官方文档

- [Cloudflare Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Deploy a SvelteKit site to Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
