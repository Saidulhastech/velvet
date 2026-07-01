// ============================================================
//  Cart server helpers — used by the /api/cart/* endpoints.
//  Centralizes "ensure a cart exists", cookie sync, and the
//  self-healing path when a stored cart id has expired.
// ============================================================
import type { AstroCookies } from 'astro';
import {
  addCartLines,
  createCart,
  getCart,
  removeCartLines,
  updateCartLines,
  updateCartBuyerIdentityCountry,
  updateCartDiscountCodes,
  updateCartNote,
  updateCartAttributes,
  type Cart,
  type CartLineInput,
  type CartLineUpdateInput,
  type CartResult,
} from '~/lib/shopify';
import { getMarket } from './market';
import { clearCartId, getCartId, setCartId } from './cart-cookie';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Buyer IP for Shopify rate-limit attribution, read from request headers.
 * `Astro.clientAddress` throws on the @astrojs/cloudflare adapter, so we
 * use Cloudflare's `CF-Connecting-IP` (set on Workers) and fall back to the
 * first `X-Forwarded-For` hop (tunnels / dev proxies). Returns undefined
 * when neither is present (e.g. plain local dev) — the header is optional.
 */
export function buyerIpFrom(request: Request): string | undefined {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = request.headers.get('x-forwarded-for');
  return xff ? xff.split(',')[0].trim() : undefined;
}

/**
 * Re-pin a cart to the shopper's selected market if it drifted. A cart whose
 * country differs from the active market (because the shopper switched markets,
 * or Shopify localised it by buyer IP) prices in the wrong currency — fix it in
 * place so the cart/checkout currency always matches the product cards.
 */
async function ensureMarket(
  cart: Cart | null,
  target: string,
  buyerIp?: string,
  opts: { onlyIfUnset?: boolean } = {},
): Promise<Cart | null> {
  if (!cart) return cart;
  const cc = cart.buyerIdentity?.countryCode;
  if (cc === target) return cart;
  // On the hot read path (onlyIfUnset) re-pin only carts that were never
  // pinned (null country). Otherwise we'd fire a mutation on *every* cart GET
  // for any cart Shopify localises to a stable country — doubling latency
  // forever. The write path (addLines) re-pins unconditionally.
  if (opts.onlyIfUnset && cc) return cart;
  const res = await updateCartBuyerIdentityCountry(cart.id, target, { buyerIp });
  return res.cart ?? cart;
}

/** Fetch the current cart from the cookie; self-heals stale ids. */
export async function readCart(cookies: AstroCookies, buyerIp?: string): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [], warnings: [] };
  const cart = await getCart(id, { buyerIp });
  if (!cart) clearCartId(cookies); // expired / invalid — forget it
  const country = getMarket(cookies).country;
  return {
    cart: await ensureMarket(cart, country, buyerIp, { onlyIfUnset: true }),
    userErrors: [],
    warnings: [],
  };
}

/**
 * Add lines, creating a cart on first add (or recreating one when
 * the stored cart has expired). Keeps the cookie in sync.
 */
export async function addLines(
  cookies: AstroCookies,
  lines: CartLineInput[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  const country = getMarket(cookies).country;
  if (id) {
    const res = await addCartLines(id, lines, { buyerIp });
    if (res.cart) return { ...res, cart: await ensureMarket(res.cart, country, buyerIp) };
    // Stored cart vanished — fall through and start a fresh one.
    clearCartId(cookies);
  }
  const created = await createCart(lines, country, { buyerIp });
  if (created.cart) setCartId(cookies, created.cart.id);
  return created;
}

/**
 * Re-pin the existing cart to a new market (after a market switch) so its
 * currency follows immediately, not just on the next add. No-op when there's
 * no cart yet; failures are swallowed (the switch must never 500).
 */
export async function repinCartMarket(
  cookies: AstroCookies,
  country: string,
  buyerIp?: string,
): Promise<void> {
  const id = getCartId(cookies);
  if (!id) return;
  try {
    await updateCartBuyerIdentityCountry(id, country, { buyerIp });
  } catch {
    /* a stale cart will re-pin on the next read/add via ensureMarket */
  }
}

/** Update a line quantity; quantity 0 removes the line. */
export async function updateLine(
  cookies: AstroCookies,
  line: CartLineUpdateInput,
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }], warnings: [] };
  const res =
    line.quantity !== undefined && line.quantity <= 0
      ? await removeCartLines(id, [line.id], { buyerIp })
      : await updateCartLines(id, [line], { buyerIp });
  // Only forget the cart on a genuine null (expiry) — not when Shopify returned
  // userErrors (validation), which would orphan a still-valid cart.
  if (!res.cart && !res.userErrors.length) clearCartId(cookies);
  return res;
}

/** Remove one or more lines. */
export async function removeLines(
  cookies: AstroCookies,
  lineIds: string[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }], warnings: [] };
  const res = await removeCartLines(id, lineIds, { buyerIp });
  if (!res.cart && !res.userErrors.length) clearCartId(cookies);
  return res;
}

/** Set the order note on the active cart. */
export async function setNote(
  cookies: AstroCookies,
  note: string,
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }], warnings: [] };
  const res = await updateCartNote(id, note, { buyerIp });
  if (!res.cart && !res.userErrors.length) clearCartId(cookies);
  return res;
}

/** Replace the custom attributes on the active cart. */
export async function setAttributes(
  cookies: AstroCookies,
  attributes: { key: string; value: string }[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }], warnings: [] };
  const res = await updateCartAttributes(id, attributes, { buyerIp });
  if (!res.cart && !res.userErrors.length) clearCartId(cookies);
  return res;
}

/** Apply discount codes to the active cart (Shopify validates them). */
export async function setDiscountCodes(
  cookies: AstroCookies,
  codes: string[],
  buyerIp?: string,
): Promise<CartResult> {
  const id = getCartId(cookies);
  if (!id) return { cart: null, userErrors: [{ message: 'No active cart' }], warnings: [] };
  const res = await updateCartDiscountCodes(id, codes, { buyerIp });
  // A bad/invalid code must NOT nuke the cart id — only clear on true expiry.
  if (!res.cart && !res.userErrors.length) clearCartId(cookies);
  return res;
}
