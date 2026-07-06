// ============================================================
//  Middleware — resolve the active market once per request and
//  expose it on Astro.locals.market. Every page/component reads
//  the same value and threads it into Shopify queries so prices
//  and checkout currency stay consistent across the page.
// ============================================================
import { defineMiddleware } from 'astro:middleware';
import { applyMarketCache, resolveMarket } from '~/lib/market';

export const onRequest = defineMiddleware(async (context, next) => {
  const market = resolveMarket(context.cookies, context.request);
  context.locals.market = market;

  const response = await next();

  // Market-safe edge caching for HTML documents: the default market gets a
  // shared-CDN cache, any other market is `private, no-store` so a localized
  // (per-currency) page is never stored and replayed to a different market.
  // Market lives in the `fl_market` cookie, so Vary on Cookie keeps a shared
  // CDN from serving one market's prices to another. Never override a
  // Cache-Control a page/endpoint set for itself.
  const ct = response.headers.get('content-type') ?? '';
  if (
    context.request.method === 'GET' &&
    ct.includes('text/html') &&
    !response.headers.has('Cache-Control')
  ) {
    applyMarketCache(response.headers, market);
    response.headers.append('Vary', 'Cookie');
  }

  return response;
});
