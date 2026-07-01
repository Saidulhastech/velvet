// POST /api/cart/note — { note: string }  (Shopify cartNoteUpdate)
import type { APIRoute } from 'astro';
import { buyerIpFrom, json, setNote } from '~/lib/cart-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    // Clamp to a sane length (Shopify allows long notes, but this is order text).
    const note = String(body?.note ?? '').slice(0, 1000);
    const { cart, userErrors, warnings } = await setNote(cookies, note, buyerIpFrom(request));
    return json({ cart, userErrors, warnings });
  } catch (err) {
    return json({ cart: null, error: (err as Error).message || 'Could not save the note.' }, 500);
  }
};
