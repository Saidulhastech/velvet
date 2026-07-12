# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Maison Arden** (internal codename "Velvet") — a luxury-fashion storefront. Astro SSR frontend, Shopify Storefront API backend, deployed to Cloudflare Workers. The `.astro` templates are a pre-built design ("Maison Arden local templates" / legacy format); the Shopify integration was layered on top, so a legacy compatibility bridge maps live Shopify data into the template's original data shape.

## Commands

```
npm run dev        # local dev server (localhost:4321)
npm run build      # production build to ./dist/
npm run preview    # preview built site
npm run astro ...  # astro CLI (e.g. astro add, astro check)
```

Dev server — prefer background mode: `astro dev --background`, manage with `astro dev stop | status | logs`.

No test runner and no lint script configured. Typecheck via `astro check` (strict tsconfig, extends `astro/tsconfigs/strict`). Node `>=22.12.0`.

Path alias: `~/*` → `src/*`.

## Environment / secrets

Config comes from `astro:env` (schema in [astro.config.mjs](astro.config.mjs)), NOT `process.env`. On Cloudflare Workers secrets are per-request only, so **always read them lazily via `getSecret()` at request time** — reading at module top-level yields `undefined` on the edge. See the getter pattern in [src/lib/shopify/client.ts](src/lib/shopify/client.ts).

Required: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`. Optional: `SHOPIFY_API_VERSION` (default `2026-04`), plus Customer Account API vars (`CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOPIFY_SHOP_ID`, `CUSTOMER_ACCOUNT_API_VERSION`). Copy `.env.example` → `.env`. Adapter: `@astrojs/cloudflare` (v14.1+, local Workers runtime via `@cloudflare/vite-plugin`, no `platformProxy` option), `output: 'server'`.

**Graceful degradation:** if Shopify env is unset, the legacy bridge falls back to `src/lib/mockData.ts` so the site still renders. Keep that fallback intact when touching product fetch code.

**Images:** the Cloudflare adapter sets `imageService: 'passthrough'` (no edge image optimization) and `image.remotePatterns` allows only `cdn.shopify.com`. Adding remote images from another host requires extending `remotePatterns` in [astro.config.mjs](astro.config.mjs).

## Architecture

### Request → market → localized data
All Shopify traffic is server-side only (private token never reaches the browser). Flow:

1. [src/middleware.ts](src/middleware.ts) resolves the active **Market** (country+language) once per request → `Astro.locals.market`.
2. Market resolution priority ([src/lib/market.ts](src/lib/market.ts)): `fl_market` cookie → Cloudflare `cf-ipcountry` geo header → shop default (`US`/`EN`, from [src/config/velvet.ts](src/config/velvet.ts)).
3. Pages/services thread `market` into queries. [src/lib/shopify/client.ts](src/lib/shopify/client.ts) `shopifyFetch()` merges it as `@inContext(country:, language:)` variables so prices + translations localize; it also drives cart `buyerIdentity.countryCode` so checkout currency matches the cards.
4. `applyMarketCache()` sets edge-cache headers: default market gets shared CDN cache, any other market is `private, no-store`. If you enable multi-market HTML edge caching, add `fl_market` to the CDN cache key.

### Shopify library (`src/lib/shopify/`)
Layered — import everything from the barrel `~/lib/shopify` ([index.ts](src/lib/shopify/index.ts)):
- `client.ts` — the single `shopifyFetch()` gateway: retries (429/5xx/network w/ backoff, honours `Retry-After`), timeout via `AbortSignal.timeout`, buyer-IP forwarding, and **partial-data handling** (returns partial `data` alongside field-level GraphQL `errors`, only throws when there's no usable data).
- `graphql/` — raw query/mutation strings + `fragments.ts`.
- `services/` — typed fetch+transform functions (products, collections, cart, search, content). Services take an optional `market`.
- `transforms.ts` / `types.ts` — map raw Shopify nodes → app types (`Product`, `ProductCard`, `Cart`, `BundleConfig`, …); `paginate`/`nodes` helpers.
- `customer/` — Customer Account API (OAuth2 + PKCE) for account login/session; barrel `~/lib/shopify/customer`.

### Legacy bridge (important gotcha)
The bottom of [src/lib/shopify/index.ts](src/lib/shopify/index.ts) contains `mapToLegacyProduct()` and `getShopifyProduct*()`. These convert modern Shopify `Product`/`ProductCard` into the template's original `LegacyProduct` shape (swatches w/ hardcoded `HEX_MAP`, sizes, materials inferred from tags/description, badges, gender from tags). Templates consume `LegacyProduct`; the PDP additionally uses `getShopifyProductWithVariants()` for raw variant data driving client-side variant selection. When adding product fields to the UI, you likely extend `mapToLegacyProduct` rather than touch templates directly.

### Cart
- Server: `/api/cart/*` endpoints ([src/pages/api/cart/](src/pages/api/cart/)) delegate to [src/lib/cart-server.ts](src/lib/cart-server.ts), which centralizes "ensure a cart exists", cookie sync (`cart-cookie.ts`), self-healing of expired cart ids, and re-pinning the cart to the active market (`ensureMarket`). Cart id lives in an httpOnly cookie, never client state.
- Client: [src/stores/cart.ts](src/stores/cart.ts) — nanostores (`@nanostores/persistent`, `ma_*` localStorage keys). Optimistic UI first, then background POST to `/api/cart/*`; server response re-syncs local state. Only real Shopify variant GIDs (`gid://shopify/ProductVariant/...`) get synced server-side; mock ids stay local-only. Checkout URL cached in `sessionStorage` as `ma_checkout_url`.

### Content collections
[src/content.config.ts](src/content.config.ts) defines glob-loaded markdown collections in `src/content/`, each with a required-field Zod schema: `blog` (`title`, `category`, `date`, `readTime`, `image`, `excerpt`), `ethos` (`index`, `title`, `tag`), `materials` (`title`, `origin`). All take an optional `order`. Files prefixed `_` are excluded by the glob pattern. Editorial content is markdown; product/commerce data is Shopify.

### Components & pages
- `src/components/` — `layout/` (BaseLayout, Header, Footer, MarketSelector), `sections/index/` (homepage sections), `product/`, `cart/` (drawers + quick-view modal).
- `src/pages/` — routes incl. `products/[handle]`, `blog/[slug]`, `shop`, `search`, `cart`, `account/*` (OAuth login/authorize/logout), and `api/*`.
- Styles: `src/styles/global.css` + `variables.css` (CSS custom properties; no Tailwind here despite the doc links below).

## Brand config

Brand-level constants (name, tagline, free-shipping threshold, socials, cart extras like gift-wrap/order-notes/protection) live in [src/config/velvet.ts](src/config/velvet.ts). Default market codes also live here.

## Note

`AGENTS.md` currently duplicates the old generic dev/docs content — keep it in sync if you rely on it.

## Documentation

Full docs: https://docs.astro.build. Relevant guides: [routing/middleware](https://docs.astro.build/en/guides/routing/), [components](https://docs.astro.build/en/basics/astro-components/), [content collections](https://docs.astro.build/en/guides/content-collections/), [styling](https://docs.astro.build/en/guides/styling/).
