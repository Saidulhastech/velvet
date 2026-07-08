// POST /api/reviews — { productId, rating, title, body, name, email } -> Judge.me
import type { APIRoute } from 'astro';
import { submitReview } from '~/lib/judgeme';

export const prerender = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const result = await submitReview({
      productId: typeof body?.productId === 'string' ? body.productId : null,
      rating: Number(body?.rating),
      title: String(body?.title ?? '').slice(0, 200),
      body: String(body?.body ?? '').slice(0, 5000),
      reviewerName: String(body?.name ?? '').slice(0, 200),
      reviewerEmail: String(body?.email ?? '').slice(0, 320),
    });
    return json(result, result.ok ? 200 : 400);
  } catch (err) {
    return json({ ok: false, error: (err as Error).message || 'Could not submit the review.' }, 500);
  }
};
