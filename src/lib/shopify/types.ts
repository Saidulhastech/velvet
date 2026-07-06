// ============================================================
//  Shopify Storefront API — flattened domain types (2026-04)
// ============================================================
// These describe the *clean* shapes our transforms produce, not
// the raw edges/node GraphQL envelopes.

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  id?: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

/** Per-location in-store pickup availability for a variant (Shopify Local Pickup). */
export interface PickupLocation {
  available: boolean;
  /** Human prep time from Shopify, e.g. "Usually ready in 24 hours". */
  pickUpTime?: string | null;
  locationName: string;
  city?: string | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string | null;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: SelectedOption[];
  price: Money;
  compareAtPrice?: Money | null;
  image?: Image | null;
  /** Local-pickup availability per store; [] when none queried/available (PDP only). */
  storeAvailability?: PickupLocation[];
}

export interface ProductOptionValue {
  id: string;
  name: string;
  /** Swatch colour (hex) from the option value, when the merchant sets one. */
  swatch?: { color?: string | null } | null;
}

export interface ProductOption {
  id: string;
  name: string;
  optionValues: ProductOptionValue[];
}

export interface Seo {
  title?: string | null;
  description?: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  /** ISO publish date — drives the "New" badge (recently published). */
  createdAt?: string | null;
  availableForSale: boolean;
  featuredImage?: Image | null;
  images: Image[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange?: {
    minVariantPrice: Money;
  };
  options: ProductOption[];
  variants: ProductVariant[];
  seo?: Seo;
  /** Total sellable units across variants (null when inventory not tracked). */
  totalInventory?: number | null;
  /** Review rating from the `reviews.rating` metafield; null when none. */
  rating?: number | null;
  /** Review count from `reviews.rating_count`; null when none. */
  ratingCount?: number | null;
  /** Structured spec rows from `custom.specifications` (JSON list); [] when none. */
  specs?: { label: string; value: string }[];
  /** Highlight bullets from `custom.highlights` (JSON list); [] when none. */
  highlights?: string[];
  /** Materials & care bullets from `custom.materials_care` (JSON list); [] when none. */
  materialsCare?: string[];
  /** Shipping & returns bullets from `custom.shipping_returns` (JSON list); [] when none. */
  shippingReturns?: string[];
  /** Individual reviews from a review metafield; [] when none available. */
  reviews?: ProductReview[];
  /** Star distribution [5★..1★] counts, derived from `reviews`; null when none. */
  ratingDistribution?: number[] | null;
}

export interface ProductReview {
  author: string;
  rating: number;
  title?: string;
  body?: string;
  date?: string;
}

/** Lightweight product shape used in grids/cards. */
export interface ProductCard {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  /** Shopify product type — drives the shop "Category" facet. */
  productType?: string;
  /** Product tags — drive the shop "Features" facet. */
  tags?: string[];
  availableForSale: boolean;
  featuredImage?: Image | null;
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange?: {
    minVariantPrice: Money;
  };
  /** Collections this product belongs to — dynamic category tabs/facets. */
  collections?: { title: string; handle: string }[];
  /** First variant gid — lets product grids "quick add" without a PDP fetch. */
  firstVariantId?: string | null;
  /** Whether that first variant can be purchased. */
  firstVariantAvailable?: boolean;
  /** All variants — power grid quick-add variant selection + swatch→image swap. */
  variants?: ProductVariant[];
  /** Product options (name + values) — drive grid swatches & the quick-add picker. */
  options?: ProductOption[];
  /** Short product description (truncated) — for the quick-view modal. */
  description?: string;
  /** Recently published — drives the "New" badge. */
  isNew?: boolean;
  /** Color swatches derived from the product's colour option (if any). */
  swatches?: { name: string; color: string }[];
  /** Review rating (e.g. 4.7) from the `reviews.rating` metafield; null if none. */
  rating?: number | null;
  /** Number of reviews from `reviews.rating_count`; null if none. */
  ratingCount?: number | null;
  /** Total sellable units across variants (Shopify `totalInventory`); null if untracked. */
  totalInventory?: number | null;
  /** Optional stock goal (`custom.stock_goal` metafield) for the deal stock bar. */
  stockGoal?: number | null;
}

/** One item listed inside a fixed-price bundle (a referenced product). */
export interface BundleComponent {
  /** The referenced product's gid. */
  productId: string;
  title: string;
  vendor?: string;
  image?: Image | null;
  /** Per-component price (the product's min variant price) — sums to the "was". */
  price?: Money | null;
}

/**
 * A fixed-price bundle product (Shopify-standard, no app). One variant (the
 * bundle SKU) is what we drop into the cart; `components` are the products
 * listed in the `custom.bundle_items` metafield. `price` is the bundle price;
 * `compareAtPrice` is the merchant compare-at, or the summed component prices
 * when no compare-at is set (so "Save" reflects real value).
 */
export interface BundleProduct {
  id: string;
  title: string;
  handle: string;
  /** The bundle variant gid — added to the cart. Null if the bundle has no variant. */
  variantId: string | null;
  availableForSale: boolean;
  featuredImage?: Image | null;
  price: Money;
  compareAtPrice?: Money | null;
  components: BundleComponent[];
}

/**
 * A build-your-own bundle: the container product plus each component as a full
 * ProductCard (with variants/options) so the configurator can render a variant
 * picker per item. Chosen variants are added as separate cart lines.
 */
export interface BundleConfig {
  id: string;
  title: string;
  handle: string;
  description?: string;
  featuredImage?: Image | null;
  components: ProductCard[];
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

/** A flattened paginated list. */
export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface CollectionFilterValue {
  id: string;
  label: string;
  count: number;
  input: string;
}

export interface CollectionFilter {
  id: string;
  label: string;
  type: string;
  values: CollectionFilterValue[];
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  descriptionHtml?: string;
  image?: Image | null;
  seo?: Seo;
  /** Product count (capped at the fetch limit; see productCountPlus). */
  productCount?: number;
  /** True when the collection has more products than were counted. */
  productCountPlus?: boolean;
}

export interface CollectionWithProducts extends Collection {
  products: Paginated<ProductCard>;
  filters?: CollectionFilter[];
}

// ── Cart ────────────────────────────────────────────────────

export interface CartLineMerchandise {
  id: string;
  title: string;
  availableForSale: boolean;
  /** Sellable units for this variant; null when inventory isn't tracked. */
  quantityAvailable?: number | null;
  selectedOptions: SelectedOption[];
  price: Money;
  image?: Image | null;
  product: {
    id: string;
    title: string;
    handle: string;
    featuredImage?: Image | null;
  };
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
    amountPerQuantity: Money;
  };
  merchandise: CartLineMerchandise;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  note?: string | null;
  /** Cart-level custom attributes (gift message, plan choice, etc.). */
  attributes?: { key: string; value: string }[];
  /** Market pin — the country whose currency the cart prices in. */
  buyerIdentity?: { countryCode: string | null };
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount?: Money | null;
  };
  /** Discount codes applied to the cart (with their applicable status). */
  discountCodes?: { applicable: boolean; code: string }[];
  /** Cart-level discount allocations (sum = total discount applied). */
  discountAllocations?: { discountedAmount: Money }[];
  lines: CartLine[];
}

// ── Navigation / content ────────────────────────────────────

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface Shop {
  name: string;
  description?: string;
  primaryDomain: { url: string; host: string };
}

// ── Localization (markets) ──────────────────────────────────

export interface Currency {
  isoCode: string;
  symbol: string;
  name?: string;
}

export interface Language {
  isoCode: string;
  name: string;
  endonymName?: string;
}

export interface Country {
  isoCode: string;
  name: string;
  currency: Currency;
  availableLanguages: Language[];
}

/** Shop's configured localized experiences — drives the market selector. */
export interface Localization {
  availableCountries: Country[];
  /** Active country for the query context (shop default unless @inContext set). */
  country: { isoCode: string; name: string; currency: Currency };
  /** Active language for the query context. */
  language: Language;
}

// ── Sort options surfaced in the UI ─────────────────────────

export interface SortOption {
  label: string;
  value: string;
  sortKey: string;
  reverse: boolean;
}

// ── Legacy template shape ───────────────────────────────────
// The `.astro` templates were built against a pre-Shopify "Maison Arden local
// templates" data shape. `mapToLegacyProduct()` (in client.ts) converts modern
// Shopify products into this, and the demo catalogue (demoCatalog.ts) is authored
// directly in it. Templates + ProductCard consume `LegacyProduct`.
export interface LegacyProduct {
  id: string;
  handle: string;
  name: string;
  category: string;
  gender: string;
  price: number;
  formattedPrice: string;
  rating: number;
  image: string;
  hoverImage?: string;
  /** Full gallery image set (featured first). Populated from Shopify; absent
   *  for demo entries, where the single `image` is used. */
  images?: string[];
  badge?: string;
  badgeStyle?: 'olive' | 'default';
  swatches: { color: string; hex: string; img?: string | null; variantId?: string | null }[];
  sizes: string[];
  materials: string[];
  stock: 'in' | 'pre';
  filterCategory: string;
  filterColors: string[];
  filterSizes: string[];
  filterMaterials: string[];
  description: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  /** Full Shopify variant matrix (size×colour → real variant). Absent for demo
   *  entries; populated by the legacy bridge so grids/quick-view can resolve a
   *  specific variant the same way the PDP does. */
  variants?: {
    id: string;
    opts: Record<string, string>;
    price: number;
    compareAt: number | null;
    available: boolean;
    qty: number | null;
    img: string | null;
  }[];
  /** Product options (name + values, colour values carry a hex). */
  options?: { name: string; values: { name: string; color?: string | null }[] }[];
  /** True when the product has ≥2 real options (e.g. Colour+Size) and >1 variant,
   *  so a size/colour must be chosen (via Quick View) before adding to cart. */
  needsPicker?: boolean;
}
