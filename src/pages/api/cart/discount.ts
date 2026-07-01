// POST /api/cart/discount — { codes: string[] }  (Shopify validates each code)
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, setDiscountCodes } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.codes) ? body.codes : [body?.code];
    const codes = raw
      .map((c: unknown) => String(c ?? '').trim())
      .filter((c: string) => c.length > 0 && c.length <= 64);

    const { cart, userErrors, warnings } = await setDiscountCodes(cookies, codes, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not apply the code. Please try again.' }, 500);
  }
};
