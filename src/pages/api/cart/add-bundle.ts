// POST /api/cart/add-bundle — { lines: [{ merchandiseId, quantity? }] }
// Adds every chosen bundle component in a single cart mutation. Used by the
// build-your-own bundle configurator (one line per selected component variant).
import type { APIRoute } from 'astro';
import { addLines, buyerIpFrom, json } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.lines) ? body.lines : [];

    const lines = raw
      .map((l: unknown) => {
        const merchandiseId = String((l as any)?.merchandiseId ?? '');
        const n = Math.floor(Number((l as any)?.quantity));
        const quantity = Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;
        return { merchandiseId, quantity };
      })
      .filter((l: { merchandiseId: string }) =>
        l.merchandiseId.startsWith('gid://shopify/ProductVariant/'),
      );

    if (lines.length === 0) {
      return json({ cart: null, userErrors: [{ message: 'No valid variants' }] }, 400);
    }

    const { cart, userErrors, warnings } = await addLines(cookies, lines, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message }, 500);
  }
};
