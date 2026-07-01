// GET /api/cart — current cart from the httpOnly cart-id cookie.
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, readCart } from '~/lib/cart-server';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { cart } = await readCart(cookies, buyerIpFrom(request));
    return json({ cart });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
