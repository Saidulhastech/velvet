// ============================================================
//  Cart id cookie — server-side persistence of the Shopify cart.
//  httpOnly so the id (and thus the cart) is never readable by
//  client JS. The browser only ever talks to /api/cart/*.
// ============================================================
import type { AstroCookies } from 'astro';

const CART_COOKIE = 'fl_cart_id';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function getCartId(cookies: AstroCookies): string | undefined {
  return cookies.get(CART_COOKIE)?.value || undefined;
}

export function setCartId(cookies: AstroCookies, id: string): void {
  cookies.set(CART_COOKIE, id, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
}

export function clearCartId(cookies: AstroCookies): void {
  cookies.delete(CART_COOKIE, { path: '/' });
}
