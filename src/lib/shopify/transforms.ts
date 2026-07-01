// ============================================================
//  Transforms — flatten Shopify edges/node envelopes into the
//  clean domain shapes defined in types.ts.
// ============================================================
import type {
  BundleComponent,
  BundleConfig,
  BundleProduct,
  Cart,
  CartLine,
  Collection,
  Money,
  PageInfo,
  Paginated,
  Product,
  ProductCard,
  ProductVariant,
} from './types';

interface Edge<T> {
  cursor?: string;
  node: T;
}
interface Connection<T> {
  edges?: Edge<T>[];
  pageInfo?: PageInfo;
}

/** Pull the node list out of a Relay-style connection. */
export function nodes<T>(connection?: Connection<T> | null): T[] {
  return connection?.edges?.map((e) => e.node) ?? [];
}

const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

// Last-resort fallbacks. Shopify marks price/priceRange non-nullable, but a
// missing token scope or a partial GraphQL response (which client.ts tolerates)
// can still deliver null — without a guard that null reaches money() as NaN.
const ZERO_MONEY: Money = { amount: '0.0', currencyCode: 'USD' };
const ZERO_PRICE_RANGE = { minVariantPrice: ZERO_MONEY, maxVariantPrice: ZERO_MONEY };

/** Flatten a connection into { items, pageInfo }. */
export function paginate<TRaw, TOut>(
  connection: Connection<TRaw> | null | undefined,
  map: (node: TRaw) => TOut,
): Paginated<TOut> {
  return {
    items: nodes(connection).map(map),
    pageInfo: connection?.pageInfo ?? EMPTY_PAGE_INFO,
  };
}

// Raw shapes only need the connection-ish bits typed loosely.
type Raw = Record<string, any>;

// "New" if recently published or explicitly tagged.
const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
// Fallback hex for common colour names when Shopify has no swatch value.
const COLOR_MAP: Record<string, string> = {
  black: '#111827', white: '#F3F4F6', silver: '#C0C5CE', gray: '#9CA3AF', grey: '#9CA3AF',
  blue: '#2563EB', navy: '#1E3A8A', red: '#DC2626', green: '#16A34A', yellow: '#FACC15',
  orange: '#EA580C', purple: '#7C3AED', pink: '#EC4899', gold: '#D4AF37', rose: '#F43F5E',
  beige: '#E7DCC8', brown: '#92400E', graphite: '#374151', titanium: '#878681',
};

const COLOR_OPTION_NAMES = new Set(['color', 'colour']);

function deriveSwatches(p: Raw): { name: string; color: string }[] {
  const opt = (p.options ?? []).find((o: Raw) => COLOR_OPTION_NAMES.has(String(o?.name).toLowerCase()));
  if (!opt) return [];
  return (opt.optionValues ?? [])
    .map((v: Raw) => {
      const color = v?.swatch?.color || COLOR_MAP[String(v?.name).toLowerCase()];
      return color ? { name: v.name, color } : null;
    })
    .filter(Boolean)
    .slice(0, 4) as { name: string; color: string }[];
}

function deriveIsNew(p: Raw): boolean {
  const tagged = (p.tags ?? []).some((t: string) => t.toLowerCase() === 'new');
  if (tagged) return true;
  if (!p.createdAt) return false;
  return Date.now() - new Date(p.createdAt).getTime() < NEW_WINDOW_MS;
}

/**
 * Parse the `reviews.rating` metafield. Shopify's `rating` type stores a
 * JSON string `{"value":"4.7","scale_min":"1.0","scale_max":"5.0"}`, but
 * some apps write a plain number — handle both.
 */
function parseRating(raw?: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const n = Number(typeof parsed === 'object' && parsed ? parsed.value : parsed);
    return Number.isFinite(n) ? n : null;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
}

function parseIntOrNull(raw?: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Parse a `list.*`/`json` metafield into a string[] (empty on absence/error). */
function parseStringList(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    /* not JSON — treat as a single value */
    return raw.trim() ? [raw.trim()] : [];
  }
  return [];
}

/**
 * Parse an individual-reviews metafield (JSON array). Tolerant of common
 * field names used by review apps (author/name, body/content/text, etc).
 */
function parseReviews(raw?: string | null): {
  author: string;
  rating: number;
  title?: string;
  body?: string;
  date?: string;
}[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.reviews) ? parsed.reviews : [];
    return list
      .map((r: Record<string, unknown>) => ({
        author: String(r.author ?? r.name ?? r.reviewer ?? 'Verified buyer'),
        rating: Number(r.rating ?? r.score ?? r.stars ?? 0),
        title: r.title ? String(r.title) : undefined,
        body: r.body ? String(r.body) : r.content ? String(r.content) : r.text ? String(r.text) : undefined,
        date: r.date ? String(r.date) : r.created_at ? String(r.created_at) : undefined,
      }))
      .filter((r: { rating: number }) => Number.isFinite(r.rating) && r.rating > 0);
  } catch {
    return [];
  }
}

/** Count reviews per star [5★,4★,3★,2★,1★]; null when there are no reviews. */
function deriveDistribution(reviews: { rating: number }[]): number[] | null {
  if (!reviews.length) return null;
  const buckets = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    buckets[5 - star]++;
  }
  return buckets;
}

/**
 * Parse a `custom.specifications` metafield into label/value rows. Accepts a
 * JSON array of `{label,value}` objects OR an array of "Label: Value" strings.
 */
function parseSpecs(raw?: string | null): { label: string; value: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (row && typeof row === 'object' && 'label' in row) {
          return { label: String(row.label), value: String(row.value ?? '') };
        }
        const [label, ...rest] = String(row).split(':');
        return { label: label.trim(), value: rest.join(':').trim() };
      })
      .filter((r) => r.label);
  } catch {
    return [];
  }
}

export function mapProductCard(p: Raw): ProductCard {
  const variantList = nodes(p.variants).map(mapVariant);
  const firstVariant = variantList[0];
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    productType: p.productType ?? '',
    tags: p.tags ?? [],
    availableForSale: p.availableForSale ?? true,
    featuredImage: p.featuredImage ?? null,
    priceRange: p.priceRange ?? ZERO_PRICE_RANGE,
    compareAtPriceRange: p.compareAtPriceRange ?? ZERO_PRICE_RANGE,
    firstVariantId: firstVariant?.id ?? null,
    // If there are no variants we can't add anything — default unavailable so
    // grid "Quick Add" never promises stock it can't deliver (was `?? true`).
    firstVariantAvailable: firstVariant?.availableForSale ?? false,
    variants: variantList,
    options: p.options ?? [],
    description: p.description ?? '',
    isNew: deriveIsNew(p),
    swatches: deriveSwatches(p),
    rating: parseRating(p.ratingMetafield?.value),
    ratingCount: parseIntOrNull(p.ratingCountMetafield?.value),
    totalInventory: typeof p.totalInventory === 'number' ? p.totalInventory : null,
    stockGoal: parseIntOrNull(p.stockGoalMetafield?.value),
  };
}

export function mapVariant(v: Raw): ProductVariant {
  return {
    id: v.id,
    title: v.title,
    sku: v.sku ?? null,
    availableForSale: v.availableForSale ?? false,
    quantityAvailable: v.quantityAvailable ?? null,
    selectedOptions: v.selectedOptions ?? [],
    price: v.price ?? ZERO_MONEY,
    compareAtPrice: v.compareAtPrice ?? null,
    image: v.image ?? null,
    // Present only on the PDP query; cards omit the field → [] (no extra cost).
    storeAvailability: nodes(v.storeAvailability).map((s: Raw) => ({
      available: s.available ?? false,
      pickUpTime: s.pickUpTime ?? null,
      locationName: s.location?.name ?? '',
      city: s.location?.address?.city ?? null,
    })),
  };
}

export function mapProduct(p: Raw): Product {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description ?? '',
    descriptionHtml: p.descriptionHtml ?? '',
    vendor: p.vendor ?? '',
    productType: p.productType ?? '',
    tags: p.tags ?? [],
    createdAt: p.createdAt ?? null,
    availableForSale: p.availableForSale ?? false,
    featuredImage: p.featuredImage ?? null,
    images: nodes(p.images),
    priceRange: p.priceRange ?? ZERO_PRICE_RANGE,
    compareAtPriceRange: p.compareAtPriceRange ?? ZERO_PRICE_RANGE,
    options: p.options ?? [],
    variants: nodes(p.variants).map(mapVariant),
    seo: p.seo ?? {},
    totalInventory: typeof p.totalInventory === 'number' ? p.totalInventory : null,
    rating: parseRating(p.ratingMetafield?.value),
    ratingCount: parseIntOrNull(p.ratingCountMetafield?.value),
    specs: parseSpecs(p.specsMetafield?.value),
    highlights: parseStringList(p.highlightsMetafield?.value),
    // Parse the reviews metafield once, reuse for both the list and the
    // star-distribution (was parsed twice per product).
    ...(() => {
      const reviews = parseReviews(p.reviewsMetafield?.value ?? p.reviewsAltMetafield?.value);
      return { reviews, ratingDistribution: deriveDistribution(reviews) };
    })(),
  };
}

/**
 * Map a fixed-price bundle product (Shopify-standard, no app). The single
 * variant is the bundle SKU; its contents come from the `custom.bundle_items`
 * `list.product_reference` metafield. When the merchant set no compare-at,
 * fall back to the summed component prices so the card shows real savings.
 */
export function mapBundleProduct(p: Raw): BundleProduct {
  const variant = nodes(p.variants)[0] as Raw | undefined;
  const refs = nodes(p.bundleItems?.references) as Raw[];
  const components: BundleComponent[] = refs
    .filter((r) => r?.id) // skip non-Product references the union may include
    .map((r) => ({
      productId: r.id,
      title: r.title ?? '',
      vendor: r.vendor ?? '',
      image: r.featuredImage ?? null,
      price: r.priceRange?.minVariantPrice ?? null,
    }));

  const price: Money = variant?.price ?? p.priceRange?.minVariantPrice ?? ZERO_MONEY;
  const currencyCode = price?.currencyCode ?? 'USD';

  // Summed component value — the "was" when no explicit compare-at exists.
  const summed = components.reduce((sum, c) => {
    const amt = Number(c.price?.amount ?? 0);
    return sum + (Number.isFinite(amt) ? amt : 0);
  }, 0);

  let compareAtPrice: Money | null = variant?.compareAtPrice ?? p.compareAtPriceRange?.minVariantPrice ?? null;
  if (!compareAtPrice && summed > Number(price?.amount ?? 0)) {
    compareAtPrice = { amount: String(summed), currencyCode };
  }

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    variantId: variant?.id ?? null,
    availableForSale: (variant?.availableForSale ?? p.availableForSale) ?? false,
    featuredImage: p.featuredImage ?? null,
    price,
    compareAtPrice,
    components,
  };
}

/**
 * Map a build-your-own bundle: container product + its component products
 * (from the `custom.bundle_items` metafield) as full cards for the picker.
 */
export function mapBundleConfig(p: Raw): BundleConfig {
  const refs = nodes(p.bundleItems?.references) as Raw[];
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description ?? '',
    featuredImage: p.featuredImage ?? null,
    components: refs.filter((r) => r?.id).map(mapProductCard),
  };
}

export function mapCollection(c: Raw): Collection {
  const counted = c.products?.nodes?.length as number | undefined;
  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
    description: c.description ?? '',
    descriptionHtml: c.descriptionHtml ?? '',
    image: c.image ?? null,
    seo: c.seo ?? {},
    ...(counted !== undefined
      ? { productCount: counted, productCountPlus: c.products?.pageInfo?.hasNextPage ?? false }
      : {}),
  };
}

function mapCartLine(l: Raw): CartLine {
  return {
    id: l.id,
    quantity: l.quantity,
    cost: l.cost,
    merchandise: {
      id: l.merchandise?.id,
      title: l.merchandise?.title,
      availableForSale: l.merchandise?.availableForSale ?? true,
      quantityAvailable: l.merchandise?.quantityAvailable ?? null,
      selectedOptions: l.merchandise?.selectedOptions ?? [],
      price: l.merchandise?.price ?? ZERO_MONEY,
      image: l.merchandise?.image ?? null,
      product: l.merchandise?.product,
    },
  };
}

export function mapCart(c: Raw | null | undefined): Cart | null {
  if (!c) return null;
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity ?? 0,
    note: c.note ?? null,
    attributes: (c.attributes ?? []).map((a: any) => ({ key: a.key, value: a.value })),
    buyerIdentity: { countryCode: c.buyerIdentity?.countryCode ?? null },
    cost: c.cost,
    discountCodes: c.discountCodes ?? [],
    discountAllocations: c.discountAllocations ?? [],
    lines: nodes(c.lines).map(mapCartLine),
  };
}
