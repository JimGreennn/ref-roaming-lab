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
