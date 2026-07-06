# Velvet — Luxury Fashion Astro + Shopify Theme

A production-grade **luxury-fashion storefront** built with **Astro SSR** and the **Shopify Storefront API**. Multi-market and multi-currency, with cart, wishlist, compare, quick-view, product filtering, editorial content collections, and a graceful **demo-data mode** so the theme runs and previews with zero backend configuration.

> Deploys to **Cloudflare Workers, Vercel, Netlify, or a self-hosted Node server** from a single codebase.

![Velvet preview](./public/og-image.jpg)

---

## ✨ Features

- **Astro SSR** (`output: 'server'`), strict TypeScript, `~/*` path alias.
- **Shopify Storefront API** integration (products, collections, cart, search, content, Customer Account API login).
- **Multi-market**: country + language resolved per request → localized prices, translations and checkout currency via `@inContext`.
- **Commerce UX**: cart drawer, wishlist, compare, quick-view modal, product filtering/sorting, PDP with variant selection, reviews, related products.
- **Editorial content collections** (blog, ethos, materials) via Markdown with typed Zod schemas.
- **SEO**: per-page meta, Open Graph + Twitter cards, canonical URLs, JSON-LD (Organization, WebSite, Product, Breadcrumb), sitemap + robots.
- **Performance**: self-hosted fonts (no render-blocking Google Fonts), optimized images, lazy loading, market-safe edge caching.
- **Graceful degradation**: with no Shopify credentials the site renders from the demo catalogue (`src/lib/demoCatalog.ts`); live Shopify data is used the moment creds are set.

## 🧱 Tech Stack

Astro · Shopify Storefront API · nanostores · Cloudflare/Vercel/Netlify/Node adapters · TypeScript.

## 🚀 Quick Start

```sh
npm install
cp .env.example .env      # optional — omit to run in demo-data mode
npm run dev               # http://localhost:4321
```

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the build locally |
| `npm run astro check` | Type-check |

Node `>=22.12.0`.

## 🔑 Environment

Config is read via `astro:env` (schema in [`astro.config.mjs`](astro.config.mjs)), **not** `process.env`. Copy `.env.example` → `.env`.

| Variable | Required | Purpose |
| :-- | :-- | :-- |
| `SHOPIFY_SHOP_DOMAIN` | ✅ | `your-shop.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | ✅ | Storefront API private token |
| `SHOPIFY_API_VERSION` | — | Defaults to `2026-04` |
| `CUSTOMER_ACCOUNT_API_CLIENT_ID` | — | Customer login (OAuth) |
| `SHOPIFY_SHOP_ID` | — | Customer login |
| `CUSTOMER_ACCOUNT_API_VERSION` | — | Customer login |

**No credentials?** The theme falls back to the bundled demo catalogue (`src/lib/demoCatalog.ts`) — perfect for previewing. Add your `SHOPIFY_*` vars and every request switches to live data automatically.

## 🎨 Customization

- **Brand config**: [`src/config/velvet.ts`](src/config/velvet.ts) — name, tagline, free-shipping threshold, socials, default market.
- **Design tokens**: [`src/styles/variables.css`](src/styles/variables.css) (colors, fonts, spacing) + `global.css`.
- **Fonts**: configured in [`astro.config.mjs`](astro.config.mjs) (`fonts` field) — swap family names there and in `variables.css`.
- **Content**: Markdown in `src/content/{blog,ethos,materials}` (schemas in `src/content.config.ts`).
- **`site`**: set your production domain in `astro.config.mjs` (drives canonical URLs + sitemap) and update `public/robots.txt`.

## 📁 Structure

```
src/
├── components/   layout, sections, product, cart
├── config/       brand constants
├── content/      markdown collections
├── lib/          shopify/ (client, services, graphql, transforms), market, cart
├── middleware.ts market resolution
├── pages/        routes + api/
├── stores/       nanostores cart/wishlist/compare
└── styles/
```

## 🌍 Deployment

Platform-agnostic — the adapter is chosen at build time from `ASTRO_ADAPTER` (or auto-detected on Vercel/Netlify/Cloudflare).

- **Cloudflare Workers**: Build `npm run build`, Deploy `npx wrangler deploy`.
- **Vercel / Netlify**: connect the repo; adapter auto-detected. Add Shopify env vars in the dashboard.
- **Node / VPS**: `ASTRO_ADAPTER=node npm run build` then `node ./dist/server/entry.mjs` (PM2 + Nginx recommended — see below).

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

[MIT](./LICENSE) © Brandbes

## 🙋 Support

Questions or issues: hi@brandbes.com
