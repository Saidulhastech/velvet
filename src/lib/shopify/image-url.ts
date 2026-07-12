/**
 * Shopify's CDN resizes on the fly via query params (`?width=`), independent
 * of Cloudflare's `imageService: 'passthrough'` (which never touches remote
 * images). Use these against any `cdn.shopify.com` URL to avoid shipping
 * full-resolution originals to a 340px product card.
 */

export function shopifyImageUrl(src: string, width: number, height?: number): string {
  if (!src) return src;
  const url = new URL(src);
  url.searchParams.set('width', String(width));
  if (height) url.searchParams.set('height', String(height));
  return url.toString();
}

export function shopifySrcset(src: string, widths: number[]): string {
  if (!src) return '';
  return widths.map(w => `${shopifyImageUrl(src, w)} ${w}w`).join(', ');
}
