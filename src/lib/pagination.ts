// ============================================================
//  Pagination URL builder for SSR Prev/Next links. Preserves all
//  existing query params (e.g. sort) while swapping the cursor.
// ============================================================
import type { PageInfo } from '~/lib/shopify/types';

export interface PageLinks {
  prevUrl: string | null;
  nextUrl: string | null;
}

export function paginationUrls(url: URL, pageInfo: PageInfo): PageLinks {
  const build = (key: 'after' | 'before', cursor?: string | null): string => {
    const params = new URLSearchParams(url.search);
    params.delete('after');
    params.delete('before');
    if (cursor) params.set(key, cursor);
    const qs = params.toString();
    return `${url.pathname}${qs ? `?${qs}` : ''}`;
  };

  return {
    prevUrl: pageInfo.hasPreviousPage ? build('before', pageInfo.startCursor) : null,
    nextUrl: pageInfo.hasNextPage ? build('after', pageInfo.endCursor) : null,
  };
}
