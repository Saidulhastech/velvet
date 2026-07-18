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
- **Blog / Journal** powered by a real Shopify Blog (Storefront API `Article`/`Blog`) — no markdown, no rebuild to publish a post.
- **Editorial content collections** (ethos, materials) via Markdown with typed Zod schemas.
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

### Shopify Configuration Guide

1. Log in to (or create) your Shopify store: https://accounts.shopify.com/store-login
2. In Shopify Admin, go to **Sales channels → add the [Headless channel](https://apps.shopify.com/headless)** to your store.
3. Open the Headless channel and click **Add Storefront** — this generates an access token pair for that storefront.
4. This theme only needs the **private (delegate) access token** — copy it into `.env` as `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`. (Unlike public-token themes, the public token isn't used here: every Shopify call happens server-side, so the token never reaches the browser — see `src/lib/shopify/client.ts`.)
5. Set `SHOPIFY_SHOP_DOMAIN` to your `your-shop.myshopify.com` domain.
6. Check the Storefront API **access scopes** on that storefront. `unauthenticated_read_product_listings` + `unauthenticated_read_product_inventory` covers products, collections, and search — enough to get started. Cart reads/writes work without any extra scope. Add more scopes only if you extend the theme into areas that need them (e.g. B2B, gift cards).
7. `SHOPIFY_API_VERSION` is pinned in `.env` (defaults to `2026-04`) — bump it here when you want to move to a newer Storefront API version.

| Variable | Required | Purpose |
| :-- | :-- | :-- |
| `SHOPIFY_SHOP_DOMAIN` | ✅ | `your-shop.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | ✅ | Storefront API private token |
| `SHOPIFY_API_VERSION` | — | Defaults to `2026-04` |
| `CUSTOMER_ACCOUNT_API_CLIENT_ID` | — | Customer login (OAuth) |
| `SHOPIFY_SHOP_ID` | — | Customer login |
| `CUSTOMER_ACCOUNT_API_VERSION` | — | Customer login |
| `JUDGEME_API_TOKEN` | — | Product reviews (Judge.me → Settings → Integrations → API tokens). Not in `.env.example` yet — add the line yourself. Reviews section just stays empty without it. |

**No credentials?** The theme falls back to the bundled demo catalogue (`src/lib/demoCatalog.ts`) — perfect for previewing. Add your `SHOPIFY_*` vars and every request switches to live data automatically.

## 🎨 Customization

- **Brand config**: [`src/config/velvet.ts`](src/config/velvet.ts) — name, tagline, free-shipping threshold, socials, default market.
- **Design tokens**: [`src/styles/variables.css`](src/styles/variables.css) (colors, fonts, spacing) + `global.css`.
- **Fonts**: configured in [`astro.config.mjs`](astro.config.mjs) (`fonts` field) — swap family names there and in `variables.css`.
- **Content**: Blog posts live in Shopify (see "Blog / Journal" below). Editorial markdown in `src/content/{ethos,materials}` (schemas in `src/content.config.ts`).
- **`site`**: set your production domain in `astro.config.mjs` (drives canonical URLs + sitemap) and update `public/robots.txt`.

## 🛍️ Store Features (for the store owner, not the developer)

A few sections of the site pull from a specific Shopify **collection handle** or **product handle**. None of these are required — every one falls back gracefully if you skip it — but setting them up connects that part of the design to your real merchandising.

### Gift Wrap (cart add-on)

1. Shopify Admin → create a product with the handle **`gift-wrap`** (the handle is editable in the product's URL settings, under the title field).
2. Give it one variant with a price. Make sure it's **Active** (not Draft) and **in stock** (or has "Continue selling when out of stock" enabled) — otherwise it stays hidden.
3. In [`src/config/velvet.ts`](src/config/velvet.ts), set `CART_EXTRAS.giftWrap.enabled = true`.

Once live, the gift-wrap product never appears in your shop grid or search — it only shows as a toggle in the cart, and only if it's real, priced, and purchasable.

### Best Sellers (homepage "Most Loved" section)

Create a collection with the handle **`best-sellers`** (Products → Collections → Create collection). Use type **Manual** so you control the exact products and order. The homepage picks up your list automatically — no code change, no redeploy needed. Falls back to a plain product slice if the collection is missing or empty, so the section never blanks.

### New Arrivals (homepage "New Arrivals" grid)

Create a collection with the handle **`new-arrivals`** (type **Manual**, ordered the way you want products to appear). The homepage grid shows up to the first 8 products in that collection, in that order. Falls back to a plain product slice if the collection is missing or empty.

The **Women / Men / Accessories** filter tabs above the grid are generated automatically from whichever products are actually in the collection — a tab only appears if at least one featured product's category/tags match it, so you never get a clickable-but-empty tab.

### Shop the Look (homepage lookbook)

Same idea, collection handle **`shop-the-look`** (type **Manual**). The first 3 products in that collection map to the 3 hotspots on the homepage lookbook image, in the order you set them.

Two extra things this section pulls straight from the collection in Shopify Admin:

- **Collection image** → becomes the large left-hand stage/backdrop photo. Set it under the collection's own **Image** field (Products → Collections → *Shop the Look* → Image). If you don't set one, the theme falls back to its bundled placeholder photo. The image box isn't locked to a fixed aspect ratio, so pick a photo that already reads well as a tall/portrait stage shot — a very wide or very short image will look stretched or cropped oddly.
- **Per-variant images drive the inline colour swatches.** Each row's swatch picker swaps that row's thumbnail (and its hotspot preview) to match the selected colour — but only if you've assigned a **separate image per variant** in Shopify Admin (Product → Variants → click a variant → set its image). If a color variant has no image of its own, clicking its swatch won't visibly change the photo — it'll just keep showing the product's default image. This is a per-product Shopify setup step, not a theme setting.

### Showcase (homepage "Worn in Motion" slider)

Same idea, collection handle **`the-edit`** (type **Manual**). The first 3 products in that collection populate the small rotating product slider on the left side of the homepage "Showcase" section (image + name + price, click-through to the product page). Falls back to a plain product slice if the collection is missing or empty.

This section's video, poster image, and right-hand copy ("Crafted to Last") are fixed template content, not pulled from Shopify — edit those directly in `src/components/sections/index/Showcase.astro` if you want to change them.

### Multi-Market Pricing

Localized pricing/currency is automatic once you configure **Settings → Markets** in Shopify Admin — the site detects the visitor's country and shows that market's real Shopify prices, no extra setup here.

### Discount Codes (cart coupon box)

The "Coupon or gift card code" field on the cart page checks real codes against your store — it will only accept something you've actually created in Shopify Admin → **Discounts**. There's nothing to configure in the theme itself.

### Newsletter Signup Form — not connected yet

The email signup form (footer/homepage/blog) validates the email and shows a "✓ Subscribed" confirmation, but **does not send the email anywhere** — no mailing list, no Shopify customer record, no API call. It's a front-end-only placeholder. Before launch, wire it to your actual email provider (Klaviyo, Mailchimp, Shopify's own customer email marketing consent, etc.) — the submit handler lives in `src/components/layout/BaseLayout.astro`.

### Before You Launch: Store Password

New/unlaunched Shopify stores are password-protected by default, which also blocks checkout (not just the storefront). If test purchases redirect to a password page instead of checkout, go to **Online Store → Preferences** and remove the password once you're ready to accept real orders.

### Blog / Journal (Shopify Blog posts)

`/blog` and the homepage "Journal" section pull live from a **Shopify Blog** — not markdown. Publishing is entirely in Shopify Admin, no code change or redeploy needed.

**1. The blog itself.** Every Shopify store auto-creates a blog with handle `news` — the theme reads that one by default (`BLOG_HANDLE` in [`src/config/velvet.ts`](src/config/velvet.ts)). You can rename its *display title* to "The Journal" (Online Store → Blog posts → your blog → Manage → Title) without touching the handle. If you use a different blog, update `BLOG_HANDLE` to match its handle.

**2. Writing a post.** Online Store → Blog posts → Add blog post:
- **Title**, **Content**, **Excerpt**, **Featured image**, **Tags** are all used directly.
- **Category chip**: the theme uses the **first tag** as the post's category (e.g. tag it `Wardrobe, investment, care` — "Wardrobe" becomes the badge and filter chip). Category filter chips on `/blog` are generated automatically from whatever first-tags exist across your posts — nothing to configure.
- **Featured post** (the large hero card at the top of `/blog`): always the **most recently published** post. There's no manual "pin as featured" field — control it with the post's publish date/time.
- **Read time**: auto-estimated from the content's word count (~200 wpm) — not an editable field.
- Custom rich content classes from the original design (`.post-lead.has-drop` drop-cap intro, `.post-quote` pull-quote, `.post-figure` captioned image, `.post-key` key-takeaways box, `ul.post-list`) still work if you switch the post editor to **Show HTML** and paste markup using those classes — plain paragraphs typed normally render fine too, just without those flourishes.

**3. Author byline (name, role, bio, avatar) — optional but recommended.** Shopify's built-in article "Author" field is just a staff account name, so the theme instead reads a reusable **Author metaobject**, once per real person:
1. Content → Metaobjects → Add definition → name it **Author** with fields **Name** (single line text), **Author role** (single line text), **Author bio** (single line text), **Author image** (Image/File). Enable **Storefronts API access** on the definition.
2. Add one entry per author (Content → Metaobjects → Author → Add entry) — fill in all four fields.
3. Settings → Custom data → Articles → Add definition → type **Metaobject reference** → reference **Author** → the generated **key must be exactly `author`** (hardcoded in `src/lib/shopify/graphql/blog.ts`) → enable **Storefronts API access**.
4. Open each article → its Metafields section → set **Author** to the right entry.

Skip this and posts still work — the byline falls back to the article's Shopify staff author name, role shows "Contributor", bio is blank, and no avatar shows.

**4. Editorial pages that are still markdown** — `ethos` and `materials` (used elsewhere in the design) still work exactly as before: add a file under `src/content/ethos/` or `src/content/materials/`, no code changes needed.

- **ethos**: `index`, `title`, `tag`
- **materials**: `title`, `origin`

Both accept an optional `order` field to control display order. A filename starting with `_` (e.g. `_draft.md`) is excluded from the site — handy for drafts.

## 📁 Structure

```
src/
├── components/   layout, sections, product, cart
├── config/       brand constants
├── content/      markdown collections (ethos, materials — blog is Shopify now)
├── lib/          shopify/ (client, services, graphql, transforms), market, cart
├── middleware.ts market resolution
├── pages/        routes + api/
├── stores/       nanostores cart/wishlist/compare
└── styles/
```

## 🛠️ Troubleshooting

**Products not loading / falls back to demo catalogue** — usually a bad `SHOPIFY_SHOP_DOMAIN` or `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, or the token's app isn't installed on the store. Double-check both values in `.env` and restart the dev server (env vars are only read at request time, so a running server won't pick up a `.env` edit without a restart).

**Unauthorized / 401 from Shopify** — this project authenticates with the **private/delegate** Storefront token (header `Shopify-Storefront-Private-Token`), not the public unauthenticated storefront token some Shopify guides show. Make sure you copied the *private* token from your app's API credentials, not a public one.

**Checkout redirects to a password page instead of your cart** — see "Before You Launch: Store Password" above.

**A product/variant doesn't show up even though it exists in Shopify** — check it's **Active** (not Draft) and has stock, or "Continue selling when out of stock" enabled. The theme intentionally hides anything not purchasable rather than showing a broken buy button.

**`/blog` is empty / a post 404s** — confirm `BLOG_HANDLE` in `src/config/velvet.ts` matches a real blog handle in Shopify Admin (Online Store → Blog posts), and that the post is **Visible**, not scheduled for the future.

**Author photo/role/bio not showing on a post** — almost always one of: (1) the article's `custom.author` metafield isn't set to an Author metaobject entry yet, (2) the Article-level metafield definition's key isn't exactly `author`, or (3) "Storefronts API access" isn't enabled on either the Article metafield definition or the Author metaobject definition. See "Blog / Journal" above for the exact setup steps — this is a data/admin-config issue, not a code bug.

## 🌍 Deployment

Platform-agnostic — the adapter is chosen at build time from `ASTRO_ADAPTER` (or auto-detected on Vercel/Netlify/Cloudflare).

- **Cloudflare Workers**: Build `npm run build`, deploy `npx wrangler deploy`. Secrets (`SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, etc.) must be set with `wrangler secret put <NAME>` or in the dashboard (Workers → Settings → Variables and Secrets) — they're deliberately not in `wrangler.toml`, which is checked into git.
- **Vercel / Netlify**: connect the repo; adapter auto-detected. Add Shopify env vars in the dashboard. (Vercel note: its Serverless Functions currently run on Node 24 — if your local Node is newer, Vercel just uses 24 at deploy time, nothing to configure.)
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

[MIT](./LICENSE) © HasThemes

## 🙋 Support

Questions or issues: hello@hasthemes.com
