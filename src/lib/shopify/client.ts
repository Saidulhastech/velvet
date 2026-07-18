// ============================================================
//  Shopify Storefront API client (server-side, private token)
// ============================================================
// All Shopify traffic flows through here. It is imported only by
// server code (Astro frontmatter + /api routes), so the private
// token never reaches the browser.

// Secrets are read at request time via getSecret(): Cloudflare Workers exposes
// them per-request (no process.env, and non-PUBLIC vars aren't inlined). Reading
// at module top-level would yield undefined on the edge, so resolve lazily.
import { getSecret } from 'astro:env/server';

const getDomain = () => getSecret('SHOPIFY_SHOP_DOMAIN');
const getVersion = () => getSecret('SHOPIFY_API_VERSION') ?? '2026-04';
const getToken = () => getSecret('SHOPIFY_STOREFRONT_PRIVATE_TOKEN');
const getEndpoint = () => `https://${getDomain()}/api/${getVersion()}/graphql.json`;

export class ShopifyError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ShopifyError';
    this.status = status;
    this.details = details;
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface ShopifyFetchOptions {
  /** Real buyer IP — forwarded so Shopify's bot rate-limiting attributes correctly. */
  buyerIp?: string;
  /** Per-request timeout in ms (default 10s). */
  timeoutMs?: number;
  /** Max attempts on 429/5xx/network (default 3, i.e. 2 retries). */
  retries?: number;
  /**
   * Active localized market. When set, `country`/`language` are merged into the
   * operation's variables so a query declaring `@inContext(country: $country,
   * language: $language)` returns market-localized prices + translations. Only
   * pass this for queries that declare those variables (catalogue queries).
   */
  inContext?: { country?: string | null; language?: string | null };
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Retry on transient transport failures: rate limit + server errors. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 430 || (status >= 500 && status <= 599);
}

/**
 * Execute a Storefront GraphQL operation. Throws ShopifyError on
 * transport or GraphQL errors; otherwise returns the typed `data`.
 */
export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: ShopifyFetchOptions = {},
): Promise<T> {
  const domain = getDomain();
  const token = getToken();
  if (!domain || !token) {
    throw new ShopifyError(
      'Missing Shopify config. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_STOREFRONT_PRIVATE_TOKEN in .env',
    );
  }

  const endpoint = getEndpoint();
  // Merge the active market into the variables so @inContext localizes the
  // operation. Caller-supplied country/language win; null values are dropped
  // (a null variable == "use the shop default" for the @inContext directive).
  const ctx = options.inContext;
  const vars: Record<string, unknown> = ctx
    ? {
        ...variables,
        ...(ctx.country ? { country: ctx.country } : {}),
        ...(ctx.language ? { language: ctx.language } : {}),
      }
    : variables;
  const body = JSON.stringify({ query, variables: vars });
  const headers = {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': token,
    ...(options.buyerIp ? { 'Shopify-Storefront-Buyer-IP': options.buyerIp } : {}),
  };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.retries ?? DEFAULT_RETRIES);

  let res: Response | undefined;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        // Abort a hung connection so a slow Shopify can't block the SSR render
        // until the platform kills the Worker.
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      // Network failure or timeout — retry with backoff, then give up.
      lastErr = cause;
      if (attempt < maxAttempts) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      const timedOut = (cause as Error)?.name === 'TimeoutError';
      throw new ShopifyError(
        timedOut ? `Shopify request timed out after ${timeoutMs}ms` : 'Network error talking to Shopify',
        undefined,
        cause,
      );
    }

    // Retry transient HTTP statuses, honouring Retry-After when present.
    if (isRetryableStatus(res.status) && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** (attempt - 1);
      await sleep(wait);
      continue;
    }
    break;
  }

  if (!res) {
    throw new ShopifyError('Network error talking to Shopify', undefined, lastErr);
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await res.json()) as GraphQLResponse<T>;
  } catch (cause) {
    throw new ShopifyError(`Invalid JSON from Shopify (HTTP ${res.status})`, res.status, cause);
  }

  if (!res.ok) {
    throw new ShopifyError(`Shopify HTTP ${res.status} ${res.statusText}`, res.status, json);
  }
  // GraphQL can return partial `data` alongside field-level `errors` — e.g. a
  // field the token isn't scoped for (`totalInventory` needs the inventory
  // scope) comes back null while the rest of the query succeeds. Honour that:
  // only throw when there is no usable data; otherwise log and return what we got.
  const hasData =
    json.data != null && Object.values(json.data as Record<string, unknown>).some((v) => v != null);
  if (json.errors?.length) {
    const message = json.errors.map((e) => e.message).join('; ');
    if (!hasData) {
      throw new ShopifyError(message, res.status, json.errors);
    }
    console.warn('[shopify] partial GraphQL errors (returning partial data):', message);
  }
  if (!json.data) {
    throw new ShopifyError('Empty response from Shopify', res.status);
  }
  return json.data;
}

// Lazy accessors — values aren't known until a request supplies the secrets.
export const shopifyConfig = {
  get DOMAIN() {
    return getDomain();
  },
  get VERSION() {
    return getVersion();
  },
  get ENDPOINT() {
    return getEndpoint();
  },
};

// ============================================================
//  Legacy Bridge Mapper (Maison Arden local templates format)
// ============================================================
import { demoProducts as mockProducts } from '../demoCatalog';
import type { LegacyProduct } from './types';
import { getProducts as getShopifyProductsNew, getProduct as getShopifyProductNew, getProductRecommendations as getShopifyRecommendations } from './services/products';
import { getCollection as getCollectionNew, getCollectionsWithCounts as getCollectionsWithCountsNew } from './services/collections';
import { getArticles as getArticlesNew, getArticle as getArticleNew } from './services/blog';
import type { Market } from '../market';
import type { Article, LegacyArticle } from './types';

// Curated Maison Arden palette first, then the everyday colour names real
// Shopify catalogues actually use (merchants rarely configure the native
// swatch metafield — see resolveSwatchHex()). Kept flat/lowercase-keyed.
const HEX_MAP: Record<string, string> = {
  olive: '#6B705E',
  sage: '#B8BCA9',
  charcoal: '#30382C',
  stone: '#858A76',
  ecru: '#E4E6DA',
  sand: '#C2AE8E',
  oat: '#E2D3C1',
  black: '#000000',
  white: '#FFFFFF',
  red: '#C0392B',
  blue: '#2E4A6B',
  navy: '#1F2A44',
  yellow: '#E1B84B',
  mustard: '#C9A227',
  gold: '#C9A63C',
  orange: '#CC6E3A',
  bronze: '#8C5A32',
  rust: '#A6543A',
  green: '#4B6B4E',
  teal: '#2F6B65',
  turquoise: '#3FA5A0',
  purple: '#6B4E71',
  lavender: '#9B8DB3',
  pink: '#D98FA3',
  rose: '#C97B8B',
  maroon: '#6E2A32',
  burgundy: '#5E2330',
  brown: '#6B4A34',
  tan: '#C9A876',
  beige: '#D8CBB4',
  cream: '#EDE4D3',
  ivory: '#F2ECDD',
  camel: '#C19A6B',
  taupe: '#8B7D6B',
  khaki: '#8B8A5C',
  denim: '#3E5C76',
  indigo: '#3B3F6B',
  grey: '#8A8D85',
  gray: '#8A8D85',
  silver: '#B8BAB6',
  mint: '#A6C6B0',
  coral: '#D97B63',
  plum: '#5C3A52',
};

// Some catalogues name a colour with a modifier ("Bronze orange", "Dusty pink").
// Try the full name first, then fall back to any known word inside it, so a
// merchant-specific compound name still resolves to something distinct
// instead of collapsing into the same neutral grey as every other miss.
function resolveSwatchHex(name: string): string | undefined {
  if (HEX_MAP[name]) return HEX_MAP[name];
  const word = name.split(/\s+/).find((w) => HEX_MAP[w]);
  return word ? HEX_MAP[word] : undefined;
}

/** Locale-correct currency label for any market (£, $, ¥, €, …). */
export function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount}`;
  }
}

export function mapToLegacyProduct(p: any): LegacyProduct {
  const price = parseFloat(p.priceRange?.minVariantPrice?.amount || '0');
  const currencyCode = p.priceRange?.minVariantPrice?.currencyCode || 'EUR';

  const swatches: { color: string; hex: string }[] = [];
  const sizes: string[] = [];
  const materials: string[] = [];

  const optionColors = new Set<string>();
  const optionSizes = new Set<string>();

  p.variants?.forEach((v: any) => {
    v.selectedOptions?.forEach((opt: any) => {
      const name = opt.name.toLowerCase();
      if (name === 'color' || name === 'colour') {
        optionColors.add(opt.value);
      }
      if (name === 'size') {
        optionSizes.add(opt.value);
      }
    });
  });

  const rawVariants = p.variants || [];
  const colorOpt = p.options?.find((o: any) => /colou?r/i.test(o.name) || o.optionValues?.some((v: any) => v.swatch?.color));
  const colorName = colorOpt?.name || null;

  // Prefer the merchant's real swatch hex from Shopify; fall back to HEX_MAP
  // then a neutral grey. Without this, any colour outside the 9-entry map
  // rendered grey even when the store had an exact swatch configured.
  const swatchHexByColor = new Map<string, string>();
  (colorOpt?.optionValues ?? []).forEach((ov: any) => {
    const nm = (ov.name ?? ov.value ?? '').toLowerCase();
    const hex = ov.swatch?.color;
    if (nm && hex) swatchHexByColor.set(nm, hex);
  });

  optionColors.forEach(color => {
    const lower = color.toLowerCase();
    const variant = colorName
      ? rawVariants.find((v: any) => v.selectedOptions?.some((o: any) => o.name === colorName && o.value.toLowerCase() === lower))
      : undefined;
    swatches.push({
      color: lower,
      hex: swatchHexByColor.get(lower) || resolveSwatchHex(lower) || '#858A76',
      img: variant?.image?.url || null,
      variantId: variant?.id || null,
    });
  });

  optionSizes.forEach(size => {
    sizes.push(size.toLowerCase());
  });

  const tags = (p.tags || []).map((t: string) => t.toLowerCase());
  const materialList = ['linen', 'wool', 'cotton', 'denim', 'cashmere', 'silk', 'leather'];
  materialList.forEach(mat => {
    if (tags.includes(mat) || p.description?.toLowerCase().includes(mat)) {
      materials.push(mat);
    }
  });
  // No hardcoded "linen" default — if the store hasn't tagged a material and
  // none is mentioned in the description, the product genuinely has none.

  let gender = 'unisex';
  if (tags.includes('men') || tags.includes('mens')) gender = 'men';
  else if (tags.includes('women') || tags.includes('womens')) gender = 'women';

  // Shopify's `productType` field is frequently left blank by merchants —
  // don't invent a fake sub-category ("Essentials") when it's empty.
  const categoryLabel = p.productType || '';
  const genderLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
  const category = categoryLabel ? `${genderLabel} · ${categoryLabel}` : genderLabel;

  // Real rating ONLY from the `reviews.rating` metafield (written by Judge.me).
  // A `rating:` tag was previously an accepted fallback, but this catalog's
  // seed/demo products all carry one regardless of real review state — using
  // it would show a fabricated star rating on products with zero reviews.
  const rating = p.rating ?? null;
  const image = p.featuredImage?.url || p.images?.[0]?.url || '';
  const hoverImage = p.images?.[1]?.url || undefined;
  // Full gallery: featured first, then the rest, de-duped — drives the real
  // PDP thumbnail strip instead of faking 5 filtered copies of one image.
  const gallery = Array.from(
    new Set([image, ...((p.images ?? []).map((im: any) => im?.url))].filter(Boolean)),
  );

  const badge = tags.includes('new') ? 'New' : tags.includes('atelier') ? 'Atelier' : undefined;

  // Preserve the full variant matrix (same shape the PDP uses) so grids and the
  // Quick View can resolve a specific size×colour variant instead of dropping size.
  const variantMatrix = rawVariants.map((v: any) => ({
    id: v.id,
    opts: Object.fromEntries((v.selectedOptions ?? []).map((o: any) => [o.name, o.value])),
    price: Number(v.price?.amount ?? 0),
    compareAt: v.compareAtPrice ? Number(v.compareAtPrice.amount) : null,
    available: v.availableForSale ?? false,
    qty: typeof v.quantityAvailable === 'number' ? v.quantityAvailable : null,
    img: v.image?.url ?? null,
  }));
  const optionList = (p.options ?? []).map((o: any) => ({
    name: o.name,
    values: (o.optionValues ?? o.values ?? []).map((ov: any) => ({
      name: ov.name ?? ov.value ?? String(ov),
      color: ov.swatch?.color ?? null,
    })),
  }));
  // Drop the implicit single "Title / Default Title" option when counting.
  const realOptions = optionList.filter(
    (o: any) => !(o.values.length === 1 && /^title$/i.test(o.name) && /^default title$/i.test(o.values[0]?.name || '')),
  );
  // A card needs the Quick View picker when a choice can't be made inline.
  // Colour IS pickable on the card (swatches), so only a non-colour option with
  // >1 value forces the picker — this covers size-only products that would
  // otherwise silently add the first size.
  const nonColourMultiOptions = realOptions.filter(
    (o: any) => !/colou?r/i.test(o.name) && o.values.length > 1,
  );
  const needsPicker = variantMatrix.length > 1 && nonColourMultiOptions.length >= 1;

  return {
    id: p.variants?.[0]?.id || p.id,
    handle: p.handle,
    name: p.title,
    category,
    gender,
    price,
    formattedPrice: formatMoney(price, currencyCode),
    rating,
    image,
    hoverImage,
    images: gallery,
    badge,
    badgeStyle: badge === 'New' ? 'olive' : 'default',
    swatches,
    sizes,
    materials,
    stock: p.availableForSale ? 'in' : 'pre',
    filterCategory: categoryLabel.toLowerCase(),
    filterColors: Array.from(optionColors).map(c => c.toLowerCase()),
    filterSizes: Array.from(optionSizes).map(s => s.toLowerCase()),
    filterMaterials: materials,
    description: p.description || '',
    isFeatured: tags.includes('featured'),
    isNew: tags.includes('new'),
    isBestSeller: tags.includes('bestseller'),
    variants: variantMatrix,
    options: optionList,
    needsPicker,
    // Real metafield-backed content only — absent/empty means the store
    // hasn't set it, never a fabricated fallback (see mapProduct in transforms.ts).
    // Individual review TEXT comes from Judge.me (see ~/lib/judgeme), not a
    // Shopify metafield — only the aggregate count/rating are metafield-backed.
    ratingCount: p.ratingCount ?? null,
    specs: p.specs ?? [],
    highlights: p.highlights ?? [],
    materialsCare: p.materialsCare ?? [],
    shippingReturns: p.shippingReturns ?? [],
    sizeGuide: p.sizeGuide ?? [],
  };
}

const isShopifyConnected = () => {
  try {
    return !!(getDomain() && getToken());
  } catch {
    return false;
  }
};

// Warn once if a PRODUCTION deploy is silently serving the demo catalogue —
// almost always a missing/typo'd SHOPIFY_* env var rather than an intended demo.
let warnedDemo = false;
function warnIfDemoInProd() {
  if (warnedDemo || !import.meta.env.PROD || isShopifyConnected()) return;
  warnedDemo = true;
  console.warn(
    '[shopify] No Shopify credentials detected in production — serving the demo catalogue. ' +
    'Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_STOREFRONT_PRIVATE_TOKEN to use live data.',
  );
}

export async function getShopifyProducts(market?: Market): Promise<LegacyProduct[]> {
  if (!isShopifyConnected()) {
    warnIfDemoInProd();
    return mockProducts;
  }
  try {
    // Excludes internal addon SKUs (gift wrap, protection plans, etc. — tag
    // them `internal` in Shopify admin) from every general catalog listing
    // this powers (shop grid, cross-sell, homepage sections). Cart-toggle
    // lookups use getProduct(handle) directly, so they're unaffected.
    const res = await getShopifyProductsNew({ pageSize: 250, query: '-tag:internal' }, market);
    if (!res.items || res.items.length === 0) return mockProducts;
    return res.items.map(item => mapToLegacyProduct(item));
  } catch (error) {
    console.error('Failed to fetch Shopify products, falling back to mocks:', error);
    return mockProducts;
  }
}

export async function getShopifyProductByHandle(handle: string, market?: Market): Promise<LegacyProduct | undefined> {
  if (!isShopifyConnected()) {
    return mockProducts.find(p => p.handle === handle);
  }
  try {
    const p = await getShopifyProductNew(handle, market);
    if (!p) return mockProducts.find(p => p.handle === handle);
    return mapToLegacyProduct(p);
  } catch (error) {
    console.error(`Failed to fetch Shopify product "${handle}", falling back to mocks:`, error);
    return mockProducts.find(p => p.handle === handle);
  }
}

export interface VariantData {
  id: string;
  opts: Record<string, string>;
  price: number;
  compareAt: number | null;
  available: boolean;
  qty: number | null;
  img: string | null;
}

/**
 * Returns both the LegacyProduct (for the existing template) and raw variant data
 * (for the client-side variant-selection controller that drives price/stock/add-to-cart).
 */
export async function getShopifyProductWithVariants(handle: string, market?: Market): Promise<{
  product: LegacyProduct | undefined;
  variants: VariantData[];
  currency: string;
  singleVariant: boolean;
  /** Real Shopify product GID — drives server-side "related products" via recommendations. */
  productId: string | null;
}> {
  if (!isShopifyConnected()) {
    // Build variant data from mock product
    const legacyProduct = mockProducts.find(p => p.handle === handle);
    if (!legacyProduct) return { product: undefined, variants: [], currency: 'EUR', singleVariant: true, productId: null };
    const mockVariants: VariantData[] = legacyProduct.sizes.map((size) => ({
      id: legacyProduct.id,
      opts: { Size: size.toUpperCase() },
      price: legacyProduct.price,
      compareAt: null,
      available: true,
      qty: null,
      img: null,
    }));
    return {
      product: legacyProduct,
      variants: mockVariants,
      currency: 'EUR',
      singleVariant: mockVariants.length <= 1,
      productId: null,
    };
  }

  try {
    // Fetch the raw product ONCE and derive the legacy shape from it — avoids
    // the previous double Storefront query (getShopifyProductByHandle also
    // fetched the same product) on every PDP render.
    const rawProduct = await getShopifyProductNew(handle, market);
    if (!rawProduct) {
      const fallback = mockProducts.find(p => p.handle === handle);
      return { product: fallback, variants: [], currency: 'EUR', singleVariant: true, productId: null };
    }
    const legacyProduct = mapToLegacyProduct(rawProduct);

    const rawVariants: any[] = rawProduct.variants ?? [];
    const currency = rawProduct.priceRange?.minVariantPrice?.currencyCode ?? 'EUR';

    // Detect if the product only has the synthetic "Default Title" single-variant
    const isSingleDefaultVariant =
      rawVariants.length === 1 &&
      rawVariants[0].selectedOptions?.length === 1 &&
      rawVariants[0].selectedOptions[0].name === 'Title' &&
      rawVariants[0].selectedOptions[0].value === 'Default Title';

    const variants: VariantData[] = rawVariants.map((v: any) => ({
      id: v.id,
      opts: Object.fromEntries((v.selectedOptions ?? []).map((o: any) => [o.name, o.value])),
      price: Number(v.price?.amount ?? 0),
      compareAt: v.compareAtPrice ? Number(v.compareAtPrice.amount) : null,
      available: v.availableForSale ?? false,
      qty: typeof v.quantityAvailable === 'number' ? v.quantityAvailable : null,
      img: v.image?.url ?? null,
    }));

    return {
      product: legacyProduct,
      variants,
      currency,
      singleVariant: isSingleDefaultVariant,
      productId: rawProduct.id ?? null,
    };
  } catch (error) {
    console.error(`Failed to fetch variant data for "${handle}":`, error);
    const fallback = mockProducts.find(p => p.handle === handle);
    return { product: fallback, variants: [], currency: 'EUR', singleVariant: true, productId: null };
  }
}

/**
 * Server-side "related products" via Shopify's real recommendation engine.
 * Returns legacy-shaped cards for the existing PDP grid. Empty array when not
 * connected or when Shopify returns no recommendations — the caller then falls
 * back to its heuristic (same-category) related list so the grid never empties.
 */
export async function getShopifyRelatedProducts(
  productId: string | null,
  limit = 4,
  market?: Market,
): Promise<LegacyProduct[]> {
  if (!productId || !isShopifyConnected()) return [];
  try {
    const cards = await getShopifyRecommendations(productId, limit, market);
    return cards.map((c) => mapToLegacyProduct(c));
  } catch (error) {
    console.error(`Failed to fetch recommendations for "${productId}":`, error);
    return [];
  }
}

export interface LegacyCollection {
  handle: string;
  title: string;
  description: string;
  image: string | null;
  count: number;
}

/** All collections (title/handle/image/count) for the /collections index. */
export async function getShopifyCollections(market?: Market): Promise<LegacyCollection[]> {
  if (!isShopifyConnected()) return [];
  try {
    const cols = await getCollectionsWithCountsNew(50, 250, market);
    return cols.map((c: any) => ({
      handle: c.handle,
      title: c.title,
      description: c.description ?? '',
      image: c.image?.url ?? null,
      count: typeof c.productCount === 'number' ? c.productCount : 0,
    }));
  } catch (error) {
    console.error('Failed to fetch collections:', error);
    return [];
  }
}

/** A single collection + its products (legacy-shaped) for /collections/[handle]. */
export async function getShopifyCollection(
  handle: string,
  market?: Market,
): Promise<{ title: string; description: string; image: string | null; products: LegacyProduct[] } | null> {
  if (!isShopifyConnected()) {
    // Mock fallback: surface the full mock catalogue under the requested handle.
    return { title: handle.replace(/-/g, ' '), description: '', image: null, products: mockProducts };
  }
  try {
    const col = await getCollectionNew({ handle, pageSize: 48 }, market);
    if (!col) return null;
    return {
      title: col.title,
      description: col.description ?? '',
      image: (col as any).image?.url ?? null,
      products: (col.products?.items ?? []).map((p: any) => mapToLegacyProduct(p)),
    };
  } catch (error) {
    console.error(`Failed to fetch collection "${handle}":`, error);
    return null;
  }
}

// ============================================================
//  Blog legacy bridge — Shopify Article → LegacyArticle
// ============================================================

const WORDS_PER_MINUTE = 200;

function estimateReadTime(html: string): string {
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

function formatArticleDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function mapToLegacyArticle(a: Article): LegacyArticle {
  const firstTag = a.tags?.[0];
  const category = firstTag ? firstTag.charAt(0).toUpperCase() + firstTag.slice(1) : 'Journal';

  // The reusable Author metaobject (name/role/bio/avatar) wins over the
  // Shopify staff account name on authorV2 — it's the actual editorial byline.
  const authorEntry = a.author?.reference;

  return {
    handle: a.handle,
    title: a.title,
    category,
    tags: a.tags ?? [],
    date: formatArticleDate(a.publishedAt),
    readTime: estimateReadTime(a.contentHtml ?? ''),
    image: a.image?.url ?? null,
    excerpt: a.excerpt ?? '',
    contentHtml: a.contentHtml ?? '',
    author: authorEntry?.authorName?.value ?? a.authorV2?.name ?? 'Maison Arden',
    authorRole: authorEntry?.authorRole?.value ?? 'Contributor',
    authorBio: authorEntry?.authorBio?.value ?? '',
    authorImage: authorEntry?.authorImage?.reference?.image?.url ?? null,
  };
}

/** Newest-first articles for the store's blog (legacy-shaped). Empty when unconfigured/failed. */
export async function getShopifyArticles(market?: Market, first = 24): Promise<LegacyArticle[]> {
  if (!isShopifyConnected()) return [];
  const { items } = await getArticlesNew({ first }, market);
  return items.map(mapToLegacyArticle);
}

/** A single article by handle (legacy-shaped), or null if missing/unconfigured. */
export async function getShopifyArticle(handle: string, market?: Market): Promise<LegacyArticle | null> {
  if (!isShopifyConnected()) return null;
  const article = await getArticleNew(handle, market);
  return article ? mapToLegacyArticle(article) : null;
}
