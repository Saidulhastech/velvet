// ============================================================
//  Blog services — Shopify Blog/Article (2026-04)
// ============================================================
import { shopifyFetch } from '../client';
import { ARTICLES_QUERY, ARTICLE_QUERY } from '../graphql/blog';
import { BLOG_HANDLE } from '~/config/velvet';
import type { Article, Paginated } from '../types';
import type { Market } from '~/lib/market';

/** Paginated articles for the store's blog, newest first. Empty list on failure. */
export async function getArticles(
  opts: { first?: number; after?: string } = {},
  market?: Market,
): Promise<Paginated<Article>> {
  const empty: Paginated<Article> = { items: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
  try {
    const data = await shopifyFetch<{ blog: { articles: { edges: { node: Article }[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } } } | null }>(
      ARTICLES_QUERY,
      { blogHandle: BLOG_HANDLE, first: opts.first ?? 24, after: opts.after },
      { inContext: market },
    );
    const connection = data.blog?.articles;
    if (!connection) return empty;
    return {
      items: connection.edges.map((e) => e.node),
      pageInfo: { hasNextPage: connection.pageInfo.hasNextPage, hasPreviousPage: false, endCursor: connection.pageInfo.endCursor },
    };
  } catch (error) {
    console.error('Failed to fetch Shopify articles:', error);
    return empty;
  }
}

/** A single article by handle, or null if it doesn't exist / the fetch fails. */
export async function getArticle(articleHandle: string, market?: Market): Promise<Article | null> {
  try {
    const data = await shopifyFetch<{ blog: { articleByHandle: Article | null } | null }>(
      ARTICLE_QUERY,
      { blogHandle: BLOG_HANDLE, articleHandle },
      { inContext: market },
    );
    return data.blog?.articleByHandle ?? null;
  } catch (error) {
    console.error(`Failed to fetch Shopify article "${articleHandle}":`, error);
    return null;
  }
}
