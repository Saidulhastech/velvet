// ============================================================
//  Cart services — the Cart API is the checkout (2026-04)
// ============================================================
import { shopifyFetch, type ShopifyFetchOptions } from '../client';
import { DEFAULT_COUNTRY } from '~/config/velvet';
import {
  CART_CREATE_MUTATION,
  CART_QUERY,
  CART_LINES_ADD_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_NOTE_UPDATE_MUTATION,
  CART_ATTRIBUTES_UPDATE_MUTATION,
} from '../graphql/cart';
import { mapCart } from '../transforms';
import type { Cart } from '../types';

export interface UserError {
  field?: string[] | null;
  message: string;
}

/**
 * Cart mutation warning (Shopify reports stock/availability issues here, NOT
 * in userErrors): e.g. MERCHANDISE_NOT_ENOUGH_STOCK, MERCHANDISE_OUT_OF_STOCK.
 * The mutation still "succeeds" — surface these or the change looks silent.
 */
export interface CartWarning {
  code: string;
  message: string;
  target?: string | null;
}

export interface CartResult {
  cart: Cart | null;
  userErrors: UserError[];
  warnings: CartWarning[];
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

export interface CartLineUpdateInput {
  id: string;
  quantity?: number;
  merchandiseId?: string;
}

function result(mutationPayload: any): CartResult {
  return {
    cart: mapCart(mutationPayload?.cart),
    userErrors: mutationPayload?.userErrors ?? [],
    warnings: mutationPayload?.warnings ?? [],
  };
}

/** Create a cart, optionally with initial lines, pinned to a market country. */
export async function createCart(
  lines: CartLineInput[] = [],
  countryCode: string = DEFAULT_COUNTRY,
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartCreate: any }>(
    CART_CREATE_MUTATION,
    {
      input: {
        lines,
        // Pin the cart to the shopper's selected market so its currency matches
        // the product cards. Without this Shopify localises by buyer IP and the
        // cart can drift to another currency (e.g. BDT) while cards show USD.
        buyerIdentity: { countryCode },
        attributes: [{ key: 'source', value: 'astro-storefront' }],
      },
    },
    opts,
  );
  return result(data.cartCreate);
}

/** Fetch a cart by id; returns null when the cart no longer exists. */
export async function getCart(
  cartId: string,
  opts: ShopifyFetchOptions = {},
): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart: any | null }>(CART_QUERY, { id: cartId }, opts);
  return mapCart(data.cart);
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesAdd: any }>(
    CART_LINES_ADD_MUTATION,
    { cartId, lines },
    opts,
  );
  return result(data.cartLinesAdd);
}

export async function updateCartLines(
  cartId: string,
  lines: CartLineUpdateInput[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesUpdate: any }>(
    CART_LINES_UPDATE_MUTATION,
    { cartId, lines },
    opts,
  );
  return result(data.cartLinesUpdate);
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartLinesRemove: any }>(
    CART_LINES_REMOVE_MUTATION,
    { cartId, lineIds },
    opts,
  );
  return result(data.cartLinesRemove);
}

/** Pin an existing cart to a market (country) so its currency is stable. */
export async function updateCartBuyerIdentityCountry(
  cartId: string,
  countryCode: string,
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartBuyerIdentityUpdate: any }>(
    CART_BUYER_IDENTITY_UPDATE_MUTATION,
    { cartId, buyerIdentity: { countryCode } },
    opts,
  );
  return result(data.cartBuyerIdentityUpdate);
}

/** Set the cart-level order note (free text shown on the Shopify order). */
export async function updateCartNote(
  cartId: string,
  note: string,
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartNoteUpdate: any }>(
    CART_NOTE_UPDATE_MUTATION,
    { cartId, note },
    opts,
  );
  return result(data.cartNoteUpdate);
}

/** Replace the cart's custom attributes (key/value pairs shown on the order). */
export async function updateCartAttributes(
  cartId: string,
  attributes: { key: string; value: string }[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartAttributesUpdate: any }>(
    CART_ATTRIBUTES_UPDATE_MUTATION,
    { cartId, attributes },
    opts,
  );
  return result(data.cartAttributesUpdate);
}

/** Apply (or clear) discount codes on the cart. Pass [] to remove all. */
export async function updateCartDiscountCodes(
  cartId: string,
  discountCodes: string[],
  opts: ShopifyFetchOptions = {},
): Promise<CartResult> {
  const data = await shopifyFetch<{ cartDiscountCodesUpdate: any }>(
    CART_DISCOUNT_CODES_UPDATE_MUTATION,
    { cartId, discountCodes },
    opts,
  );
  return result(data.cartDiscountCodesUpdate);
}
