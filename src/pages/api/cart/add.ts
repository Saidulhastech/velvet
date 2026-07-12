// POST /api/cart/add — { merchandiseId, quantity? }
import type { APIRoute } from 'astro';
import { addLines, buyerIpFrom, json } from '~/lib/cart-server';

export const prerender = false;

// Coerce to a positive integer (1..99); never send NaN/fractional to the Int field.
function toQuantity(raw: unknown): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();

    // Accept either a single { merchandiseId, quantity } or a batched
    // { lines: [...] } — the latter adds every line in one mutation so
    // multi-item adds (e.g. wishlist "Add All to Bag") can't race each other
    // into creating separate carts.
    const rawLines: any[] = Array.isArray(body?.lines) && body.lines.length
      ? body.lines
      : [{ merchandiseId: body?.merchandiseId, quantity: body?.quantity }];

    const lines = rawLines
      .map((l) => ({ merchandiseId: String(l?.merchandiseId ?? ''), quantity: toQuantity(l?.quantity) }))
      .filter((l) => l.merchandiseId.startsWith('gid://shopify/ProductVariant/'));

    if (!lines.length) {
      return json({ cart: null, userErrors: [{ message: 'Invalid variant id' }] }, 400);
    }

    const { cart, userErrors, warnings } = await addLines(cookies, lines, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not add to cart. Please try again.' }, 500);
  }
};
