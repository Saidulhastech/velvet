// POST /api/cart/attributes — { attributes: { key, value }[] }  (cartAttributesUpdate)
// Replaces the cart's custom attributes wholesale (gift message, plan choice, …).
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, setAttributes } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.attributes) ? body.attributes : [];
    const attributes = raw
      .map((a: any) => ({ key: String(a?.key ?? '').trim(), value: String(a?.value ?? '').slice(0, 500) }))
      .filter((a: { key: string }) => a.key.length > 0 && a.key.length <= 64);

    const { cart, userErrors, warnings } = await setAttributes(cookies, attributes, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not save cart details.' }, 500);
  }
};
