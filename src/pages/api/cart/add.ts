// POST /api/cart/add — { merchandiseId, quantity? }
import type { APIRoute } from 'astro';
import { addLines, buyerIpFrom, json } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const merchandiseId = String(body?.merchandiseId ?? '');
    // Coerce to a positive integer (1..99); never send NaN/fractional to the Int field.
    const n = Math.floor(Number(body?.quantity));
    const quantity = Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;

    if (!merchandiseId.startsWith('gid://shopify/ProductVariant/')) {
      return json({ cart: null, userErrors: [{ message: 'Invalid variant id' }] }, 400);
    }

    const { cart, userErrors, warnings } = await addLines(
      cookies,
      [{ merchandiseId, quantity }],
      buyerIpFrom(request),
    );
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not add to cart. Please try again.' }, 500);
  }
};
