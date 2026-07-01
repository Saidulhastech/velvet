// ============================================================
//  Search services — full + predictive (2026-04)
// ============================================================
import { shopifyFetch } from '../client';
import type { Market } from '~/lib/market';
import { SEARCH_QUERY, PREDICTIVE_SEARCH_QUERY } from '../graphql/search';
import { cursorVars } from '../pagination';
import { mapProductCard, paginate } from '../transforms';
import type { Paginated, ProductCard } from '../types';

export interface SearchParams {
  query: string;
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
}

export interface SearchResult extends Paginated<ProductCard> {
  totalCount: number;
}

/** Full product search results page. */
export async function searchProducts(
  params: SearchParams,
  market?: Market,
): Promise<SearchResult> {
  const data = await shopifyFetch<{ search: any }>(
    SEARCH_QUERY,
    {
      query: params.query,
      ...cursorVars({ pageSize: params.pageSize ?? 24, after: params.after, before: params.before }),
      sortKey: params.sortKey ?? 'RELEVANCE',
      reverse: params.reverse ?? false,
      types: ['PRODUCT'],
    },
    { inContext: market },
  );
  const page = paginate<any, ProductCard>(data.search, mapProductCard);
  return { ...page, totalCount: data.search?.totalCount ?? page.items.length };
}

export interface PredictiveResult {
  queries: { text: string; styledText: string }[];
  products: Array<{
    id: string;
    title: string;
    handle: string;
    featuredImage?: { url: string; altText?: string | null } | null;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  }>;
  collections: Array<{
    id: string;
    title: string;
    handle: string;
    image?: { url: string; altText?: string | null } | null;
  }>;
}

/** Instant search for the header autocomplete. */
export async function predictiveSearch(
  query: string,
  market?: Market,
): Promise<PredictiveResult> {
  const data = await shopifyFetch<{ predictiveSearch: PredictiveResult }>(
    PREDICTIVE_SEARCH_QUERY,
    { query },
    { inContext: market },
  );
  return {
    queries: data.predictiveSearch?.queries ?? [],
    products: data.predictiveSearch?.products ?? [],
    collections: data.predictiveSearch?.collections ?? [],
  };
}
