// ============================================================
//  Maison Arden / Omnix brand config constants
// ============================================================

export const DEFAULT_COUNTRY = "US";
export const DEFAULT_LANGUAGE = "EN";
export const MARKET_COUNTRY = DEFAULT_COUNTRY;

export const BRAND = {
  name: "Maison Arden",
  legalName: "Maison Arden Paris",
  tagline: "Luxury Fashion & Accessories",
  description: "Maison Arden — luxury clothing, tailoring, coats, knitwear and leather accessories.",
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
    enabled: false,
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
  protection: {
    enabled: false,
    handle: "protection",
    plans: [] as any[],
  },
} as const;
