// GET /api/search?q=... — predictive (instant) search proxy.
import type { APIRoute } from 'astro';
import { predictiveSearch } from '~/lib/shopify';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return new Response(JSON.stringify({ products: [], collections: [], queries: [] }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
  try {
    const result = await predictiveSearch(q, locals.market);
    return new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
};
