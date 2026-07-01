// ============================================================
//  Market (country + language) — the active localized context.
//  Resolved once per request in middleware and exposed via
//  Astro.locals.market, then threaded into every catalogue query
//  as @inContext(country:, language:) and into the cart's
//  buyerIdentity.countryCode so prices + checkout currency match.
// ============================================================
import type { AstroCookies } from 'astro';
import { DEFAULT_COUNTRY, DEFAULT_LANGUAGE } from '~/config/velvet';

/** The active localized experience for a request. ISO codes, uppercase. */
export interface Market {
  /** ISO 3166-1 alpha-2 country code (Shopify `CountryCode`), e.g. "US". */
  country: string;
  /** ISO 639-1 language code (Shopify `LanguageCode`), e.g. "EN". */
  language: string;
}

/** Cookie that pins the shopper's chosen market across requests. */
const MARKET_COOKIE = 'fl_market';
const ONE_YEAR = 60 * 60 * 24 * 365;

// Shopify country/language codes are short A–Z (language can carry a region
// suffix like PT_BR → underscore). Validate shape before trusting any source.
const COUNTRY_RE = /^[A-Z]{2}$/;
const LANGUAGE_RE = /^[A-Z]{2}(_[A-Z]{2})?$/;

const DEFAULT_MARKET: Market = { country: DEFAULT_COUNTRY, language: DEFAULT_LANGUAGE };

/** Coerce arbitrary input into a valid Market, falling back to the defaults. */
export function normalizeMarket(country?: string | null, language?: string | null): Market {
  const c = (country ?? '').trim().toUpperCase();
  const l = (language ?? '').trim().toUpperCase();
  return {
    country: COUNTRY_RE.test(c) ? c : DEFAULT_MARKET.country,
    language: LANGUAGE_RE.test(l) ? l : DEFAULT_MARKET.language,
  };
}

/**
 * Resolve the active market for a request, in priority order:
 *   1. the shopper's saved choice (cookie),
 *   2. Cloudflare's geo header (`cf-ipcountry`) for first-visit guessing,
 *   3. the shop default.
 * Language follows the cookie or falls back to the default (the real
 * available language per country is reconciled by the selector UI).
 */
export function resolveMarket(cookies: AstroCookies, request: Request): Market {
  const saved = cookies.get(MARKET_COOKIE)?.value;
  if (saved) {
    const [c, l] = saved.split('|');
    return normalizeMarket(c, l);
  }
  const geo = request.headers.get('cf-ipcountry');
  // CF sends "XX"/"T1" for unknown/Tor — normalizeMarket drops those to default.
  return normalizeMarket(geo, DEFAULT_MARKET.language);
}

/** Persist the shopper's market choice (1-year cookie). */
export function setMarketCookie(cookies: AstroCookies, market: Market): void {
  cookies.set(MARKET_COOKIE, `${market.country}|${market.language}`, {
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
}

/**
 * Apply edge-cache headers for a price-bearing (catalogue) page, market-safe.
 *
 * Prices now vary by market, so the HTML is only shopper-agnostic *within* a
 * market. The default market gets the shared-CDN cache (the common single-
 * market store keeps full performance); any other market is served `private`
 * so a localized page is never stored and replayed to a different currency.
 *
 * NOTE: if you enable HTML edge-caching for multiple markets, add the
 * `fl_market` cookie to your CDN cache key (e.g. a Cloudflare Cache Rule) so
 * each market caches independently — the default CDN key is URL-only.
 */
export function applyMarketCache(headers: Headers, market: Market): void {
  const isDefault =
    market.country === DEFAULT_COUNTRY && market.language === DEFAULT_LANGUAGE;
  headers.set(
    'Cache-Control',
    isDefault
      ? 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'
      : 'private, no-store',
  );
}

/** Read the active market from cookies (server-side; used off the request path). */
export function getMarket(cookies: AstroCookies): Market {
  const saved = cookies.get(MARKET_COOKIE)?.value;
  if (!saved) return { ...DEFAULT_MARKET };
  const [c, l] = saved.split('|');
  return normalizeMarket(c, l);
}
