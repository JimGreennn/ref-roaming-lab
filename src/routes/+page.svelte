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
