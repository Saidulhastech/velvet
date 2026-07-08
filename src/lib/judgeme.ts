// ============================================================
//  Judge.me reviews (server-side only)
// ============================================================
// Judge.me owns review content — it is never stored in a Shopify metafield.
// The aggregate rating/count (`reviews.rating`, `reviews.rating_count`) ARE
// real Shopify metafields, written by Judge.me itself when its "metafields"
// setting is enabled — those are still read via the normal Shopify product
// query (see graphql/products.ts), unchanged by this file.
//
// Secrets are read lazily via getSecret() — see client.ts for why (Cloudflare
// Workers exposes them per-request, not at module load).
import { getSecret } from 'astro:env/server';
import type { ProductReview } from '~/lib/shopify/types';

const getToken = () => getSecret('JUDGEME_API_TOKEN');
const getShopDomain = () => getSecret('SHOPIFY_SHOP_DOMAIN');

/** Extracts the legacy numeric Shopify id Judge.me expects from a GID (`gid://shopify/Product/123` -> `123`). */
function legacyIdFrom(gid: string | null | undefined): string | null {
  if (!gid) return null;
  const id = gid.split('/').pop();
  return id && /^\d+$/.test(id) ? id : null;
}

interface JudgeMeReviewRaw {
  rating?: number;
  title?: string;
  body?: string;
  reviewer?: { name?: string };
  created_at?: string;
}

/**
 * Real reviews for a product, fetched from Judge.me at request time.
 * Returns [] when unconfigured, the product has no Judge.me reviews, or the
 * API call fails — never fabricated, matches the rest of the app's pattern.
 */
export async function getProductReviews(shopifyProductGid: string | null): Promise<ProductReview[]> {
  const token = getToken();
  const shopDomain = getShopDomain();
  const legacyId = legacyIdFrom(shopifyProductGid);
  if (!token || !shopDomain || !legacyId) return [];

  try {
    // Judge.me's reviews list is filtered by ITS OWN internal product id, not
    // Shopify's — look that up first via the external_id lookup endpoint.
    const lookupRes = await fetch(
      `https://api.judge.me/api/v1/products/-1?api_token=${encodeURIComponent(token)}&shop_domain=${encodeURIComponent(shopDomain)}&external_id=${encodeURIComponent(legacyId)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!lookupRes.ok) return [];
    const lookupData: any = await lookupRes.json();
    const internalId = lookupData?.product?.id;
    if (!internalId) return [];

    const reviewsRes = await fetch(
      `https://api.judge.me/api/v1/reviews?api_token=${encodeURIComponent(token)}&shop_domain=${encodeURIComponent(shopDomain)}&product_id=${encodeURIComponent(internalId)}&per_page=50&published=true`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!reviewsRes.ok) return [];
    const reviewsData: any = await reviewsRes.json();
    const raw: JudgeMeReviewRaw[] = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [];

    return raw
      .map((r) => ({
        author: r.reviewer?.name || 'Verified buyer',
        rating: Number(r.rating ?? 0),
        title: r.title || undefined,
        body: r.body || undefined,
        date: r.created_at || undefined,
      }))
      .filter((r) => Number.isFinite(r.rating) && r.rating > 0);
  } catch {
    return [];
  }
}

export interface SubmitReviewInput {
  productId: string | null;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  reviewerEmail: string;
}

/**
 * Submits a new review via Judge.me's public create-review endpoint (no API
 * token — same path their own on-site widget uses). Judge.me moderates new
 * reviews by default, so a successful call means "queued", not "published".
 */
export async function submitReview(input: SubmitReviewInput): Promise<{ ok: boolean; error?: string }> {
  const shopDomain = getShopDomain();
  const legacyId = legacyIdFrom(input.productId);
  if (!shopDomain) return { ok: false, error: 'Reviews are not configured for this store yet.' };
  if (!legacyId) return { ok: false, error: 'Unknown product.' };
  if (!(input.rating >= 1 && input.rating <= 5)) return { ok: false, error: 'Please choose a rating between 1 and 5.' };
  if (!input.body.trim() || !input.reviewerName.trim() || !input.reviewerEmail.trim()) {
    return { ok: false, error: 'Please fill in your name, email and review.' };
  }

  try {
    const res = await fetch('https://judge.me/api/v1/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shop_domain: shopDomain,
        platform: 'shopify',
        id: legacyId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        // Judge.me's public create-review endpoint expects `name`/`email` —
        // verified directly against the API (`reviewer_name`/`reviewer_email`
        // return 422 "Email must be present" despite being in their own docs).
        name: input.reviewerName,
        email: input.reviewerEmail,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail: any = await res.json().catch(() => null);
      return { ok: false, error: detail?.message || 'Judge.me could not accept the review right now.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the reviews service — please try again.' };
  }
}
