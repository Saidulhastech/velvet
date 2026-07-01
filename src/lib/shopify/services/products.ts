// ============================================================
//  Product services — fetch + transform
// ============================================================
import { shopifyFetch } from '../client';
import type { Market } from '~/lib/market';
import {
  BUNDLE_BY_HANDLE_QUERY,
  BUNDLE_PRODUCTS_QUERY,
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from '../graphql/products';
import { cursorVars } from '../pagination';
import {
  mapBundleConfig,
  mapBundleProduct,
  mapProduct,
  mapProductCard,
  nodes,
  paginate,
} from '../transforms';
import type { BundleConfig, BundleProduct, Paginated, Product, ProductCard } from '../types';

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

/**
 * Fixed-price bundle products for the home "Bundle & Save" section — pure
 * Shopify standard, no app. Each is an ordinary product tagged `bundle` whose
 * contents live in the `custom.bundle_items` metafield. We keep only bundles
 * with an actual variant + listed contents. Adding to cart = the single variant.
 */
export async function getBundleProducts(
  query = 'tag:bundle',
  first = 6,
  market?: Market,
): Promise<BundleProduct[]> {
  const data = await shopifyFetch<{ products: any }>(
    BUNDLE_PRODUCTS_QUERY,
    { query, first },
    { inContext: market },
  );
  return nodes(data.products)
    .map(mapBundleProduct)
    .filter((b) => b.variantId !== null && b.components.length > 0);
}

/**
 * One build-your-own bundle by handle, with each component's variants/options
 * for the configurator. Null if the handle isn't a bundle or has no contents.
 */
export async function getBundleConfig(
  handle: string,
  market?: Market,
): Promise<BundleConfig | null> {
  const data = await shopifyFetch<{ product: any | null }>(
    BUNDLE_BY_HANDLE_QUERY,
    { handle },
    { inContext: market },
  );
  if (!data.product) return null;
  const bundle = mapBundleConfig(data.product);
  return bundle.components.length > 0 ? bundle : null;
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
