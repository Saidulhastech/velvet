// POST /api/cart/update — { lineId, quantity }  (quantity 0 removes)
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, updateLine } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const lineId = String(body?.lineId ?? '');
    const raw = Number(body?.quantity);

    if (!lineId || !Number.isFinite(raw)) {
      return json({ cart: null, userErrors: [{ message: 'lineId and quantity required' }] }, 400);
    }
    // Clamp to 0..99 (0 removes the line). Mirrors the /add cap so the drawer
    // can't ratchet a single line past Shopify's sane max via repeated +.
    const quantity = Math.min(99, Math.max(0, Math.floor(raw)));

    const { cart, userErrors, warnings } = await updateLine(cookies, { id: lineId, quantity }, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not update the cart. Please try again.' }, 500);
  }
};
