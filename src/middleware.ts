// ============================================================
//  Middleware — resolve the active market once per request and
//  expose it on Astro.locals.market. Every page/component reads
//  the same value and threads it into Shopify queries so prices
//  and checkout currency stay consistent across the page.
// ============================================================
import { defineMiddleware } from 'astro:middleware';
import { resolveMarket } from '~/lib/market';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.market = resolveMarket(context.cookies, context.request);
  return next();
});
