// POST /api/market — set the shopper's market (country + language).
// Form fields: `market` = "COUNTRY|LANGUAGE", `redirect` = same-origin path.
// Validates the country against the shop's real localized markets, persists the
// choice in a cookie, re-pins the active cart to the new currency, then 303s
// back so the SSR page re-renders with localized prices.
import type { APIRoute } from 'astro';
import { normalizeMarket, safePath, setMarketCookie } from '~/lib/market';
import { buyerIpFrom, repinCartMarket } from '~/lib/cart-server';
import { getLocalization } from '~/lib/shopify';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const [c, l] = String(form.get('market') ?? '').split('|');
  const back = safePath(String(form.get('redirect') ?? '/'));
  const market = normalizeMarket(c, l);

  // Only persist a country the shop actually sells to — otherwise @inContext
  // would error on an unknown CountryCode. Unknown choice falls through as a
  // no-op (keeps the current market).
  const loc = await getLocalization();
  const known = loc?.availableCountries?.some((x) => x.isoCode === market.country) ?? false;
  if (known) {
    setMarketCookie(cookies, market);
    await repinCartMarket(cookies, market.country, buyerIpFrom(request));
  }

  return redirect(back, 303);
};
