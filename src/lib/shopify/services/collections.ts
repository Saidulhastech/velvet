// ============================================================
//  Collection services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import type { Market } from '~/lib/market';
import {
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  COLLECTIONS_WITH_COUNTS_QUERY,
} from '../graphql/collections';
import { cursorVars } from '../pagination';
import { mapCollection, mapProductCard, paginate } from '../transforms';
import type { Collection, CollectionWithProducts } from '../types';

export interface CollectionParams {
  handle: string;
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
  filters?: unknown[];
}

/** A collection with one page of its products, or null if not found. */
export async function getCollection(
  params: CollectionParams,
  market?: Market,
): Promise<CollectionWithProducts | null> {
  const data = await shopifyFetch<{ collection: any | null }>(
    COLLECTION_BY_HANDLE_QUERY,
    {
      handle: params.handle,
      ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
      sortKey: params.sortKey ?? 'COLLECTION_DEFAULT',
      reverse: params.reverse ?? false,
      filters: params.filters ?? null,
    },
    { inContext: market },
  );
  if (!data.collection) return null;

  const products = paginate(data.collection.products, mapProductCard);
  return {
    ...mapCollection(data.collection),
    products,
    filters: data.collection.products?.filters ?? [],
  };
}

/** Every collection — for the nav and collection index. */
export async function getAllCollections(first = 50): Promise<Collection[]> {
  const data = await shopifyFetch<{ collections: any }>(COLLECTIONS_QUERY, { first });
  return (data.collections?.edges ?? []).map((e: any) => mapCollection(e.node));
}

/**
 * Collections with a capped product count — for the home category grid.
 * `countTo` bounds the per-collection products fetched purely to count them.
 */
export async function getCollectionsWithCounts(first = 8, countTo = 250): Promise<Collection[]> {
  const data = await shopifyFetch<{ collections: any }>(COLLECTIONS_WITH_COUNTS_QUERY, {
    first,
    countTo,
  });
  return (data.collections?.edges ?? []).map((e: any) => mapCollection(e.node));
}

/**
 * Home collection buckets from a single counts fetch, split by handle prefix
 * (same convention as `bundle-*`):
 *   - `lifestyle` — `for-*` collections → "Shop by lifestyle"
 *   - `categories` — everything else (excludes `for-*` and `bundle-*`) → "Shop by category"
 * Create a `for-*` collection in admin and it shows up automatically.
 */
export async function getHomeCollectionGroups(
  first = 50,
  countTo = 250,
): Promise<{ categories: Collection[]; lifestyle: Collection[] }> {
  const all = await getCollectionsWithCounts(first, countTo);
  return {
    lifestyle: all.filter((c) => c.handle.startsWith('for-')),
    categories: all.filter(
      (c) => !c.handle.startsWith('for-') && !c.handle.startsWith('bundle-'),
    ),
  };
}
