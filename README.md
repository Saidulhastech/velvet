# Velvet — Luxury Fashion Astro + Shopify Theme

A production-grade **luxury-fashion storefront** built with **Astro SSR** and the **Shopify Storefront API**. Multi-market and multi-currency, with cart, wishlist, compare, quick-view, product filtering, editorial content collections, and a graceful **demo-data mode** so the theme runs and previews with zero backend configuration.

> Deploys to **Cloudflare Workers, Vercel, Netlify, or a self-hosted Node server** from a single codebase.

![Velvet preview](./public/og-image.jpg)

---

## ✨ Features

- **Astro SSR** (`output: 'server'`), strict TypeScript, `~/*` path alias.
- **Shopify Storefront API**: products, collections, cart, search, content, Customer Account API login.
- **Multi-market**: country + language resolved per request → localized prices, translations, checkout currency via `@inContext`.
- **Commerce UX**: cart drawer, wishlist, compare, quick-view modal, filtering/sorting, PDP with variant selection, reviews, related products.
- **Blog / Journal** — a real Shopify Blog (Storefront API), no markdown, no rebuild to publish.
- **Editorial content collection** (ethos) — Markdown with typed Zod schemas.
- **SEO** — per-page meta, OG/Twitter cards, canonical URLs, JSON-LD, sitemap + robots.
- **Performance** — self-hosted fonts, optimized images, lazy loading, market-safe edge caching.
- **Graceful degradation** — with no Shopify credentials the site renders from a bundled demo catalogue (`src/lib/demoCatalog.ts`); live data kicks in the moment creds are set.

## 🧱 Tech Stack

Astro · Shopify Storefront API · nanostores · Cloudflare/Vercel/Netlify/Node adapters · TypeScript.

## 🚀 Quick Start

```sh
npm install
cp .env.example .env      # optional — omit to run in demo-data mode
npm run dev                # http://localhost:4321
```

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the build locally |
| `npm run astro check` | Type-check |

Node `>=22.12.0`.

## 🔑 Environment & Shopify Setup

Config is read via `astro:env` (schema in [`astro.config.mjs`](astro.config.mjs)), **not** `process.env`. Copy `.env.example` → `.env`.

1. Log in to your Shopify store → **Sales channels → add the [Headless channel](https://apps.shopify.com/headless)**.
2. Open Headless → **Add Storefront** to generate an access token pair.
3. Copy the **private (delegate) token** into `.env` as `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`. Every Shopify call happens server-side (`src/lib/shopify/client.ts`), so this token never reaches the browser — the public token isn't used.
4. Set `SHOPIFY_SHOP_DOMAIN` to `your-shop.myshopify.com`.
5. Check the storefront's API **access scopes** — `unauthenticated_read_product_listings` + `unauthenticated_read_product_inventory` covers products/collections/search; cart works with no extra scope.

| Variable | Required | Purpose |
| :-- | :-- | :-- |
| `SHOPIFY_SHOP_DOMAIN` | ✅ | `your-shop.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | ✅ | Storefront API private token |
| `SHOPIFY_API_VERSION` | — | Defaults to `2026-04` |
| `CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOPIFY_SHOP_ID`, `CUSTOMER_ACCOUNT_API_VERSION` | — | Customer login (OAuth) |
| `JUDGEME_API_TOKEN` | — | Product reviews via Judge.me; not in `.env.example`, add manually. Empty reviews section without it |

**No credentials?** The theme falls back to the bundled demo catalogue — great for previewing. Add the `SHOPIFY_*` vars and every request switches to live data automatically.

## 🎨 Customization

- **Brand config**: [`src/config/velvet.ts`](src/config/velvet.ts) — name, tagline, free-shipping threshold, return window, socials, default market.
- **Design tokens**: [`src/styles/variables.css`](src/styles/variables.css) + `global.css` (colors, fonts, spacing).
- **Fonts**: configured in [`astro.config.mjs`](astro.config.mjs) (`fonts` field) — swap family names there and in `variables.css`.
- **Content**: blog posts live in Shopify; editorial markdown in `src/content/ethos` (schema in `src/content.config.ts`).
- **`site`**: set your production domain in `astro.config.mjs` (canonical URLs + sitemap) and update `public/robots.txt`.

## 🛍️ Store Features

Several homepage sections and the PDP read from specific Shopify **collection handles**, **product handles**, or **metafields** — best-sellers, new-arrivals, shop-the-look, gift wrap, PDP swatches/size guide/reviews, and the blog author byline. None are required to launch (every one falls back gracefully), but wiring them up connects the design to your real merchandising.

**→ Full setup steps: [docs/STORE-SETUP.md](docs/STORE-SETUP.md)**

## 📁 Structure

```
src/
├── components/   layout, sections, product, cart
├── config/       brand constants
├── content/      markdown collection (ethos — blog is Shopify now)
├── lib/          shopify/ (client, services, graphql, transforms), market, cart
├── middleware.ts market resolution
├── pages/        routes + api/
├── stores/       nanostores cart/wishlist/compare
└── styles/
```

## 🛠️ Troubleshooting

- **Products not loading / falls back to demo catalogue** — check `SHOPIFY_SHOP_DOMAIN` / `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` and restart the dev server (env vars are read at request time; a running server won't pick up a `.env` edit).
- **Unauthorized / 401** — this theme uses the **private/delegate** Storefront token (`Shopify-Storefront-Private-Token` header), not the public unauthenticated token from generic Shopify guides.
- **Checkout redirects to a password page** — remove the store password in Online Store → Preferences (see setup guide).
- **A product/variant is missing** — must be **Active** and in stock (or "Continue selling when out of stock"); the theme hides anything not purchasable.
- **`/blog` is empty / a post 404s** — confirm `BLOG_HANDLE` in `src/config/velvet.ts` matches a real blog handle, and the post is Visible, not scheduled.
- **PDP fields (rating, materials, size guide…) not showing** — the metafield needs both a value on the product **and** Storefront API access enabled on its definition. See [docs/STORE-SETUP.md](docs/STORE-SETUP.md) for exact namespaces/keys.

## 🌍 Deployment

Adapter is chosen at build time from `ASTRO_ADAPTER` (or auto-detected on Vercel/Netlify/Cloudflare).

- **Cloudflare Workers**: `npm run build` → `npx wrangler deploy`. Set secrets with `wrangler secret put <NAME>` or in the dashboard (Workers → Settings → Variables and Secrets) — not in `wrangler.toml`, which is checked into git.
- **Vercel / Netlify**: connect the repo, adapter auto-detected. Add Shopify env vars in the dashboard.
- **Node / VPS**: `ASTRO_ADAPTER=node npm run build` then `node ./dist/server/entry.mjs` (PM2 + Nginx recommended).

<details>
<summary>Node / VPS with PM2 + Nginx</summary>

```bash
npm install && ASTRO_ADAPTER=node npm run build:node
pm2 start dist/server/entry.mjs --name "maison-arden" && pm2 save
```

```nginx
server {
  listen 80; server_name yourdomain.com;
  location / {
    proxy_pass http://localhost:4321;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
</details>

## 📄 License

[MIT](./LICENSE) © HasThemes

## 🙋 Support

Questions or issues: hello@hasthemes.com
