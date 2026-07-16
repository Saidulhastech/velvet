// ============================================================
//  Shopify lib barrel — import everything from "~/lib/shopify"
// ============================================================
export * from './types';
export { ShopifyError, shopifyFetch, shopifyConfig } from './client';

// Services
export * from './services/products';
export * from './services/collections';
export * from './services/cart';
export * from './services/search';
export * from './services/content';
export * from './services/blog';

// UI helpers
export * from './sort-options';
