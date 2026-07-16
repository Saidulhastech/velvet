// ============================================================
//  Maison Arden / Velvet brand config constants
// ============================================================

export const DEFAULT_COUNTRY = "US";
export const DEFAULT_LANGUAGE = "EN";
export const MARKET_COUNTRY = DEFAULT_COUNTRY;

// Shopify collection handle powering the homepage "Shop the Look" section.
// Create a manual collection with this handle in Shopify admin; its product
// order maps to the on-image hotspots. Falls back to demo/store products if absent.
export const SHOP_THE_LOOK_HANDLE = "shop-the-look";

// Shopify collection handle powering the homepage "Most Loved" / best-sellers
// section. Create a manual collection with this handle in Shopify admin and
// order its products the way you want them to appear. Falls back to a plain
// product slice if the collection is missing/empty.
export const BEST_SELLERS_HANDLE = "best-sellers";

// Shopify collection handle powering the homepage "New Arrivals" section.
// Create a manual collection with this handle in Shopify admin and order its
// products the way you want them to appear. Falls back to a plain product
// slice if the collection is missing/empty.
export const NEW_ARRIVALS_HANDLE = "new-arrivals";

// Shopify blog handle powering "The Journal" (homepage section + /blog).
// Shopify auto-creates a blog with handle "news" on every store; reused here
// as-is (its display title can be renamed to "The Journal" in Shopify admin
// without changing the handle).
export const BLOG_HANDLE = "news";

export const BRAND = {
  name: "Maison Arden",
  legalName: "Maison Arden Paris",
  tagline: "Luxury Fashion & Accessories",
  description:
    "Maison Arden — luxury clothing, tailoring, coats, knitwear and leather accessories.",
  freeShippingThreshold: 1180 as number | null, // Matches Shipping Progress Threshold in CartDrawer
  social: {
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
  },
} as const;

export const CART_EXTRAS = {
  giftWrap: {
    enabled: true,
    handle: "gift-wrap",
    label: "Premium gift wrap",
    desc: "Signature box, ivory tissue & satin ribbon",
    price: 15,
    messageMaxLength: 200,
  },
  orderNotes: {
    enabled: true,
    maxLength: 500,
  },
} as const;
