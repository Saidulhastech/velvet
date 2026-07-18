// ============================================================
//  Product services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import type { Market } from '~/lib/market';
import {
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from '../graphql/products';
import { cursorVars } from '../pagination';
import {
  mapProduct,
  mapProductCard,
  paginate,
} from '../transforms';
import type { Paginated, Product, ProductCard } from '../types';

export interface ProductListParams {
  pageSize?: number;
  after?: string | null;
  before?: string | null;
  sortKey?: string;
  reverse?: boolean;
  query?: string | null;
}

/** Paginated storefront product list, localized to `market` when given. */
export async function getProducts(
  params: ProductListParams = {},
  market?: Market,
): Promise<Paginated<ProductCard>> {
  const data = await shopifyFetch<{ products: any }>(
    PRODUCTS_QUERY,
    {
      ...cursorVars({ pageSize: params.pageSize ?? 12, after: params.after, before: params.before }),
      sortKey: params.sortKey ?? 'BEST_SELLING',
      reverse: params.reverse ?? false,
      query: params.query ?? null,
    },
    { inContext: market },
  );
  return paginate(data.products, mapProductCard);
}

/** Full product detail by handle, or null if not found. */
export async function getProduct(handle: string, market?: Market): Promise<Product | null> {
  const data = await shopifyFetch<{ product: any | null }>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle },
    { inContext: market },
  );
  return data.product ? mapProduct(data.product) : null;
}

/** Related products for a PDP. */
export async function getProductRecommendations(
  productId: string,
  limit = 4,
  market?: Market,
): Promise<ProductCard[]> {
  const data = await shopifyFetch<{ productRecommendations: any[] | null }>(
    PRODUCT_RECOMMENDATIONS_QUERY,
    { productId },
    { inContext: market },
  );
  return (data.productRecommendations ?? []).slice(0, limit).map(mapProductCard);
}
