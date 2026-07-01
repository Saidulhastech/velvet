// POST /api/cart/buy-now — { merchandiseId, quantity? }
// Creates a SEPARATE one-off cart for an immediate checkout, leaving the
// shopper's persistent cart (the cart-id cookie) untouched. Returns only the
// hosted checkoutUrl to redirect to.
import type { APIRoute } from 'astro';
import { buyerIpFrom, json } from '~/lib/cart-server';
import { getMarket } from '~/lib/market';
import { createCart } from '~/lib/shopify';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const merchandiseId = String(body?.merchandiseId ?? '');
    const n = Math.floor(Number(body?.quantity));
    const quantity = Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;

    if (!merchandiseId.startsWith('gid://shopify/ProductVariant/')) {
      return json({ checkoutUrl: null, userErrors: [{ message: 'Invalid variant id' }] }, 400);
    }

    const { cart, userErrors } = await createCart(
      [{ merchandiseId, quantity }],
      getMarket(cookies).country,
      { buyerIp: buyerIpFrom(request) },
    );
    return json({ checkoutUrl: cart?.checkoutUrl ?? null, userErrors });
  } catch (err) {
    return json({ checkoutUrl: null, error: (err as Error).message || 'Could not start checkout. Please try again.' }, 500);
  }
};
