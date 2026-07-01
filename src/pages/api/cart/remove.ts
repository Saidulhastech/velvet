// POST /api/cart/remove — { lineId }  or  { lineIds: [...] }
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, removeLines } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const lineIds: string[] = body?.lineIds ?? (body?.lineId ? [body.lineId] : []);

    if (!lineIds.length) {
      return json({ cart: null, userErrors: [{ message: 'lineId(s) required' }] }, 400);
    }

    const { cart, userErrors, warnings } = await removeLines(cookies, lineIds, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not update the cart. Please try again.' }, 500);
  }
};
