# Store Setup Guide

Detailed reference for connecting Velvet's homepage/PDP sections to real Shopify data. Nothing here is required to launch — every section falls back gracefully if you skip it — but setting these up connects the design to your real merchandising. See the main [README](../README.md) for install/env/deployment basics.

## Product Detail Page (`/products/[handle]`)

Everything below is optional; unset fields hide or show generic content rather than fake data.

**Variants — colour & size**

- Options must be named **`Color`/`Colour`** and **`Size`** (case-insensitive) — other names aren't picked up as pickers.
- **Colour swatches**: set each option value's swatch (Product → Options → Color → click a value → swatch color) for the exact hex. Skip it and the theme falls back to a ~40-name hardcoded colour map; unrecognized names render neutral grey.
- **Per-variant images**: assign an image per colour variant (Product → Variants → click a variant → Image) to drive the gallery swap on swatch/thumbnail click. No image = clicking that colour won't change the photo.
- **Inventory tracking** (Product → Variants → Inventory): turn on for real "Only N left" / "Sold out" state. Untracked variants always show as available.
- **Compare-at price**: set on a variant to show struck-through original price + "Save X" badge.

**Product-level fields**

- **Product Type** → breadcrumb/category label ("Women · Dresses"). Blank just drops the sub-part.
- **Tags** (matched lowercase):
  - `men`/`mens` or `women`/`womens` → gender (defaults "unisex" if neither present).
  - `linen`, `wool`, `cotton`, `denim`, `cashmere`, `silk`, `leather` → materials line under the price (tag or just mention the fabric in the description).
  - `new` → "New" badge; `atelier` → "Atelier" badge.
  - `featured`, `new`, `bestseller` → flags the product for featured/new/bestseller sections elsewhere on the site.

**Metafields** — create the definitions first (Settings → Custom data → Products → Add definition) **with Storefront API access enabled on each** — a value on an undefined metafield, or without that box checked, reads back empty:

| Metafield (`namespace.key`) | Type | Powers |
| :-- | :-- | :-- |
| `reviews.rating` | Decimal | Star rating before a shopper opens reviews |
| `reviews.rating_count` | Integer | Review count next to the rating |
| `custom.materials_care` | List (single line text) | "Materials & Care" accordion |
| `custom.shipping_returns` | List (single line text) | "Shipping & Returns" accordion |
| `custom.specifications` | List (single line text) or JSON | "Specifications" accordion |
| `custom.highlights` | List (single line text) | Bullet highlights under description |
| `custom.size_guide` | JSON | Size Guide table |

The `reviews.*` pair is normally written by your reviews app, not typed by hand — see "Reviews" below.

`custom.specifications` — array of `{"label":"...","value":"..."}` or plain `"Label: Value"` strings:
```json
[{"label":"Fit","value":"Regular"},{"label":"Origin","value":"Made in Italy"}]
```

`custom.size_guide` — array of row objects; the **first row's keys become the table's column headers**, so products can have different columns:
```json
[
  {"Size":"XS","Bust":"82","Waist":"64","Length":"96"},
  {"Size":"S","Bust":"86","Waist":"68","Length":"98"}
]
```
Skip it and the Size Guide shows a generic static XS–XL table instead of disappearing.

**Reviews (Judge.me)**

1. Install Judge.me, set `JUDGEME_API_TOKEN` in `.env` (Judge.me → Settings → Integrations → API tokens) — review text comes live from Judge.me's API at request time, never a metafield.
2. In Judge.me's settings, enable **metafield sync** (off by default) — this writes `reviews.rating`/`reviews.rating_count`.
3. You still need the metafield **definitions** created with Storefront API access — an app writing to an undefined metafield doesn't make it visible to this theme.
4. No token / no Judge.me → reviews section shows "No reviews yet", rating stays hidden. Never fabricated.

**Fixed, not per-product**: "Complimentary shipping over {amount}" / "{N}-day easy returns" pull from `BRAND.freeShippingThreshold`/`BRAND.returnWindowDays` in `src/config/velvet.ts` — one store-wide policy. The Details accordion intro and "Lifetime Repairs" line are fixed copy in `src/pages/products/[handle].astro`.

**Fetched but unused**: local-pickup availability (`storeAvailability`) is queried per variant but not rendered on this PDP yet.

**Related products** — pulled from Shopify's product-recommendation engine first; tops up from same-category then same-gender matches if it returns fewer than 4. Nothing to configure.

## Homepage Collections

Each section below reads a **Manual** collection by handle — create it (Products → Collections → Create collection), add products in the order you want them shown. Missing/empty falls back to a plain product slice, so nothing ever blanks.

| Section | Collection handle | Notes |
| :-- | :-- | :-- |
| Most Loved (best sellers) | `best-sellers` | — |
| New Arrivals | `new-arrivals` | First 8 products shown; Women/Men/Accessories filter tabs auto-generate from whichever products are in the collection |
| Shop the Look (lookbook) | `shop-the-look` | First 3 products map to the 3 hotspots. Collection **Image** field becomes the backdrop photo (portrait crop looks best). Per-variant images drive the inline swatch colour swap |
| Showcase (Worn in Motion slider) | `the-edit` | First 3 products populate the slider. Video/poster/copy are fixed template content in `src/components/sections/index/Showcase.astro` |

## Gift Wrap (cart add-on)

1. Create a product with handle **`gift-wrap`** (edit the handle in the product's URL settings, under the title field).
2. One variant with a price, **Active** (not Draft), and in stock (or "Continue selling when out of stock" on).
3. In `src/config/velvet.ts`, set `CART_EXTRAS.giftWrap.enabled = true`.

The gift-wrap product never appears in the shop grid or search — only as a cart toggle, and only when purchasable.

## Multi-Market Pricing

Automatic once you configure **Settings → Markets** in Shopify Admin — the site detects the visitor's country and shows that market's real prices. No theme setup needed.

## Discount Codes

The cart's coupon field checks real codes created in Shopify Admin → **Discounts**. Nothing to configure in the theme.

## Newsletter Signup — not connected yet

The email form (footer/homepage/blog) validates and shows a confirmation, but doesn't send anywhere — no mailing list, no Shopify customer record. Wire it to your provider (Klaviyo, Mailchimp, Shopify email marketing consent, etc.) before launch — handler lives in `src/components/layout/BaseLayout.astro`.

## Before You Launch: Store Password

New/unlaunched Shopify stores password-protect checkout too, not just the storefront. If test purchases redirect to a password page, go to **Online Store → Preferences** and remove the password once ready for real orders.

## Blog / Journal (Shopify Blog)

`/blog` and the homepage "Journal" section pull live from a **Shopify Blog** — no markdown, no redeploy to publish.

**1. The blog.** Every store auto-creates a blog with handle `news`, read by default via `BLOG_HANDLE` in `src/config/velvet.ts`. Renaming the display title (Online Store → Blog posts → Manage → Title) doesn't change the handle. Using a different blog → update `BLOG_HANDLE`.

**2. Writing a post.** Online Store → Blog posts → Add blog post:
- Title, Content, Excerpt, Featured image, Tags used directly.
- **Category chip** = first tag (e.g. `Wardrobe, investment, care` → "Wardrobe" badge/filter). Filter chips on `/blog` auto-generate from posts' first tags.
- **Featured post** (hero card) = most recently published post — no manual pin, control via publish date/time.
- **Read time** auto-estimated from word count (~200 wpm).
- Rich content classes (`.post-lead.has-drop`, `.post-quote`, `.post-figure`, `.post-key`, `ul.post-list`) work via the post editor's **Show HTML** mode; plain paragraphs render fine without them.

**3. Author byline — optional.** Shopify's built-in article Author field is just a staff account name, so the theme reads a reusable **Author metaobject** instead:
1. Content → Metaobjects → Add definition → **Author** with fields Name, Author role, Author bio, Author image (all single line text except image). Enable Storefronts API access.
2. Add one entry per real person (Content → Metaobjects → Author → Add entry).
3. Settings → Custom data → Articles → Add definition → type **Metaobject reference** → reference **Author** → key must be exactly `author` (hardcoded in `src/lib/shopify/graphql/blog.ts`) → enable Storefronts API access.
4. Open each article → Metafields → set Author to the right entry.

Skip it and posts still work — byline falls back to the Shopify staff author name, role shows "Contributor", bio blank, no avatar.

**4. Markdown editorial pages** — `ethos` still works as plain markdown, no Shopify involved: add a file under `src/content/ethos/` with `index`, `title`, `tag` (optional `order`). A filename starting with `_` is excluded (drafts).
