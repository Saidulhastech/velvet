// GET /api/cart — current cart from the httpOnly cart-id cookie.
// DELETE /api/cart — forget the cart cookie (used once the shopper is sent to
// Shopify's hosted checkout, since a completed/abandoned checkout cart is
// never expired on Shopify's side and would otherwise linger indefinitely).
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, readCart } from '~/lib/cart-server';
import { clearCartId } from '~/lib/cart-cookie';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { cart } = await readCart(cookies, buyerIpFrom(request));
    return json({ cart });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  clearCartId(cookies);
  return json({ ok: true });
};
