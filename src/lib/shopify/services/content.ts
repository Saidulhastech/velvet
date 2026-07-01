// ============================================================
//  Content services — menus + shop (2026-04)
// ============================================================
import { shopifyFetch } from '../client';
import { LOCALIZATION_QUERY, MENU_QUERY, SHOP_QUERY, PAGE_QUERY } from '../graphql/content';
import type { Localization, Menu, Shop } from '../types';

export interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary?: string;
  seo?: { title?: string | null; description?: string | null };
}

/** A CMS page by handle, or null if it doesn't exist. */
export async function getPage(handle: string): Promise<ShopifyPage | null> {
  const data = await shopifyFetch<{ page: ShopifyPage | null }>(PAGE_QUERY, { handle });
  return data.page ?? null;
}

/** Navigation menu by handle (e.g. "main-menu", "footer"). Null if missing. */
export async function getMenu(handle: string): Promise<Menu | null> {
  const data = await shopifyFetch<{ menu: Menu | null }>(MENU_QUERY, { handle });
  return data.menu ?? null;
}

/** Shop name + primary domain. */
export async function getShop(): Promise<Shop> {
  const data = await shopifyFetch<{ shop: Shop }>(SHOP_QUERY);
  return data.shop;
}

/**
 * Shop localization — countries (with currency) + languages the store sells
 * in. Drives the market selector. Returns null if the call fails so the
 * selector can degrade gracefully (hide) instead of crashing the chrome.
 */
export async function getLocalization(): Promise<Localization | null> {
  try {
    const data = await shopifyFetch<{ localization: Localization }>(LOCALIZATION_QUERY);
    return data.localization ?? null;
  } catch {
    return null;
  }
}

/** Per-request cache slot (e.g. `Astro.locals`) for the localization promise. */
export interface LocalizationCache {
  _localization?: Promise<Localization | null>;
}

/**
 * Request-scoped localization: fetch once and share the in-flight promise, so
 * multiple `MarketSelector` instances on one page (desktop bar + mobile menu)
 * make a single Storefront call. Pass `Astro.locals`.
 */
export function getLocalizationOnce(cache: LocalizationCache): Promise<Localization | null> {
  return (cache._localization ??= getLocalization());
}
