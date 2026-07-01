import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export interface CartItem {
  id: string;          // In Shopify sync, this stores the Variant ID (gid://shopify/ProductVariant/...)
  name: string;
  price: number;
  image: string;
  color?: string;
  size?: string;
  quantity: number;
  category?: string;
  description?: string; // Stores product handle
  rating?: number;
  shopifyLineId?: string; // Special field for matching Shopify cart line
}

export interface WishItem {
  id: string;
  name: string;
  price: number;
  image: string;
  color?: string;
  size?: string;
  category?: string;
  description?: string; // Stores product handle
  /** True when the product needs a size/colour choice — move-to-bag routes to
   *  the PDP instead of silently adding the wrong variant. */
  needsPicker?: boolean;
}

// Persistent Atoms
export const cartId = persistentAtom<string | null>('ma_cart_id', null);
export const persistedCartItems = persistentAtom<CartItem[]>('ma_cart_items', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});
export const persistedWishItems = persistentAtom<WishItem[]>('ma_wish_items', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});
export const persistedSavedItems = persistentAtom<CartItem[]>('ma_saved_items', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});

// UI State Atoms
export const isCartOpen = atom<boolean>(false);
export const isWishOpen = atom<boolean>(false);

// Derived values or reactive stores
export const cartCount = atom<number>(0);
export const cartSubtotal = atom<number>(0);
export const cartDiscount = atom<number>(0);
export const appliedDiscounts = atom<string[]>([]);
export const cartNote = atom<string>('');
export const wishCount = atom<number>(0);
/** Currency code of the authoritative Shopify cart ('EUR' until first sync). */
export const cartCurrency = atom<string>('EUR');
/** Cart total (incl. tax/discount) from Shopify; mirrors subtotal until synced. */
export const cartTotal = atom<number>(0);
/** Last user-facing cart error/warning ('' when none). Bound to existing UI, no new markup. */
export const cartError = atom<string>('');

// --- Concurrency control -------------------------------------------------
// Cart mutations fire independently (qty steppers, coupon, note, gift toggle)
// and their /api/cart/* responses can race. Two guards keep local state
// consistent with the authoritative Shopify cart:
//  1. A monotonic request sequence: each post stamps a seq; a response only
//     re-syncs local state if no NEWER response already landed (out-of-order).
//  2. Per-line serialization: posts for the same line run in submit order via
//     a promise chain, so a slow earlier reply can't apply after a newer one.
let mutationSeq = 0;
let lastAppliedSeq = 0;
const lineQueues = new Map<string, Promise<unknown>>();

interface CartApiResponse {
  cart?: any;
  userErrors?: { message: string; field?: string[] | null }[];
  warnings?: { message: string; code?: string }[];
  error?: string;
}

/** A discount-code validation error — belongs in the coupon area, not globally. */
function isDiscountError(e: { message: string; field?: string[] | null }): boolean {
  if (e.field?.some((f) => f.toLowerCase().includes('discountcode'))) return true;
  return /discount code/i.test(e.message);
}

/** Run a task after the previous one queued for the same line resolves. */
function enqueueLine<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = lineQueues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  lineQueues.set(key, next);
  next.finally(() => {
    if (lineQueues.get(key) === next) lineQueues.delete(key);
  });
  return next;
}

// Helper to map Shopify Cart response into local state format
function syncWithShopifyCart(shopifyCart: any) {
  if (!shopifyCart) return;

  const localItems = shopifyCart.lines.map((line: any) => {
    const colorOpt = line.merchandise.selectedOptions.find((o: any) => o.name.toLowerCase() === 'color' || o.name.toLowerCase() === 'colour');
    const sizeOpt = line.merchandise.selectedOptions.find((o: any) => o.name.toLowerCase() === 'size');

    return {
      id: line.merchandise.id,
      name: line.merchandise.product.title,
      price: parseFloat(line.merchandise.price.amount),
      image: line.merchandise.image?.url || line.merchandise.product.featuredImage?.url || '',
      color: colorOpt ? colorOpt.value : undefined,
      size: sizeOpt ? sizeOpt.value : undefined,
      quantity: line.quantity,
      description: line.merchandise.product.handle,
      shopifyLineId: line.id
    };
  });

  persistedCartItems.set(localItems);
  cartId.set(shopifyCart.id);
  cartCount.set(shopifyCart.totalQuantity);
  cartSubtotal.set(parseFloat(shopifyCart.cost.subtotalAmount.amount));

  // Authoritative currency + total straight from Shopify (matches checkout).
  const currencyCode =
    shopifyCart.cost?.subtotalAmount?.currencyCode ||
    shopifyCart.cost?.totalAmount?.currencyCode ||
    'EUR';
  cartCurrency.set(currencyCode);
  cartTotal.set(parseFloat(shopifyCart.cost?.totalAmount?.amount ?? shopifyCart.cost.subtotalAmount.amount));

  // Compute total discount allocations
  const discountAmount = (shopifyCart.discountAllocations || []).reduce((acc: number, da: any) => {
    return acc + parseFloat(da.discountedAmount.amount || '0');
  }, 0);
  cartDiscount.set(discountAmount);

  const discountCodes = shopifyCart.discountCodes || [];
  const activeCodes = discountCodes.filter((c: any) => c.applicable).map((c: any) => c.code);
  appliedDiscounts.set(activeCodes);
  cartNote.set(shopifyCart.note || '');

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('ma_checkout_url', shopifyCart.checkoutUrl);
  }
}

// Local fallback calculations for offline/development
export function updateCartTotals() {
  const currentItems = persistedCartItems.get();
  const totalCount = currentItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalSubtotal = currentItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  cartCount.set(totalCount);
  cartSubtotal.set(totalSubtotal);
  cartDiscount.set(0);
  appliedDiscounts.set([]);
  cartNote.set('');
}

export function updateWishTotals() {
  const currentItems = persistedWishItems.get();
  wishCount.set(currentItems.length);
}

// Action to apply a Shopify coupon/discount code. Returns the raw response so
// callers (cart.astro coupon area) can show the real validation message instead
// of guessing. Discount validation errors are kept OUT of the global cartError.
export async function applyDiscount(codes: string[]): Promise<CartApiResponse> {
  return postToApi('/api/cart/discount', { codes }, { silentErrors: true });
}

// Action to update the Shopify cart note
export async function updateCartNote(note: string): Promise<CartApiResponse> {
  return postToApi('/api/cart/note', { note }, { silentErrors: true });
}

// Action to replace the cart's custom attributes (gift wrap/message, protection).
// Wholesale replace — pass the full desired set each call.
export async function setCartAttributes(
  attributes: { key: string; value: string }[],
): Promise<CartApiResponse> {
  return postToApi('/api/cart/attributes', { attributes }, { silentErrors: true });
}

// Add a real paid "extra" line (gift wrap / protection tier) straight to the
// Shopify cart — no optimistic push, no drawer. The server sync re-populates
// persistedCartItems (the cart page filters these out of the visible bag list).
export async function addExtraLine(variantId: string, quantity = 1): Promise<CartApiResponse> {
  if (!variantId.startsWith('gid://shopify/ProductVariant/')) return { cart: null };
  return postToApi('/api/cart/add', { merchandiseId: variantId, quantity }, { silentErrors: true });
}

// Remove a previously-added extra line by its variant id.
export async function removeExtraLine(variantId: string): Promise<CartApiResponse> {
  const item = persistedCartItems.get().find((i) => i.id === variantId && i.shopifyLineId);
  if (!item?.shopifyLineId) return { cart: null };
  return postToApi('/api/cart/remove', { lineId: item.shopifyLineId }, { lineKey: item.shopifyLineId, silentErrors: true });
}

// Background api call helper. `lineKey` serializes posts for a single line so an
// earlier slow reply can't apply after a newer one; `silentErrors` keeps the
// response's userErrors out of the global banner (caller handles them locally).
async function postToApi(
  url: string,
  body: any,
  opts: { lineKey?: string; silentErrors?: boolean } = {},
): Promise<CartApiResponse> {
  const run = async (): Promise<CartApiResponse> => {
    const seq = ++mutationSeq;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as CartApiResponse;

      // Apply only if this is still the newest response (out-of-order guard).
      if (data.cart && seq >= lastAppliedSeq) {
        lastAppliedSeq = seq;
        syncWithShopifyCart(data.cart);
      }

      if (!opts.silentErrors) {
        const relevant = (data.userErrors ?? []).filter((e) => !isDiscountError(e));
        const message =
          relevant[0]?.message ??
          data.warnings?.[0]?.message ??
          (res.ok ? '' : data.error ?? `Cart update failed (${res.status})`);
        cartError.set(message);
      }
      return data;
    } catch (err) {
      console.error(`Shopify cart sync error on ${url}:`, err);
      if (!opts.silentErrors) cartError.set('Could not reach the server. Please try again.');
      return { error: err instanceof Error ? err.message : 'network' };
    }
  };

  return opts.lineKey ? enqueueLine(opts.lineKey, run) : run();
}

// Initialize count and sync with Shopify on load
export async function initCart() {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/cart');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.cart) {
      syncWithShopifyCart(data.cart);
    } else {
      updateCartTotals();
    }
    updateWishTotals();
    updateCompareTotals();
  } catch {
    updateCartTotals();
    updateWishTotals();
    updateCompareTotals();
  }
}

// Actions
export async function addToCart(product: Omit<CartItem, 'quantity'>, quantity = 1) {
  // Optimistic UI updates
  const currentItems = [...persistedCartItems.get()];
  const existingIndex = currentItems.findIndex(
    item => item.id === product.id && item.color === product.color && item.size === product.size
  );

  if (existingIndex > -1) {
    currentItems[existingIndex].quantity += quantity;
  } else {
    currentItems.push({ ...product, quantity });
  }

  persistedCartItems.set(currentItems);
  updateCartTotals();
  isCartOpen.set(true); // Open drawer on addition

  // Background Shopify sync
  // Verify if it is a Shopify Variant GID before posting
  if (product.id.startsWith('gid://shopify/ProductVariant/')) {
    await postToApi('/api/cart/add', { merchandiseId: product.id, quantity });
  }
}

export async function updateCartQuantity(id: string, color: string | undefined, size: string | undefined, quantity: number) {
  let currentItems = [...persistedCartItems.get()];
  const itemIndex = currentItems.findIndex(
    item => item.id === id && item.color === color && item.size === size
  );

  if (itemIndex > -1) {
    const item = currentItems[itemIndex];
    if (quantity <= 0) {
      currentItems = currentItems.filter((_, i) => i !== itemIndex);
    } else {
      currentItems[itemIndex].quantity = quantity;
    }
    persistedCartItems.set(currentItems);
    updateCartTotals();

    // Background Shopify sync — serialized per line so rapid stepper clicks
    // apply in order and the newest absolute quantity wins.
    if (item.shopifyLineId) {
      await postToApi('/api/cart/update', { lineId: item.shopifyLineId, quantity }, { lineKey: item.shopifyLineId });
    }
  }
}

export async function removeFromCart(id: string, color?: string, size?: string) {
  const currentItems = persistedCartItems.get();
  const item = currentItems.find(
    i => i.id === id && i.color === color && i.size === size
  );

  const filteredItems = currentItems.filter(
    i => !(i.id === id && i.color === color && i.size === size)
  );
  persistedCartItems.set(filteredItems);
  updateCartTotals();

  // Background Shopify sync — serialized per line.
  if (item && item.shopifyLineId) {
    await postToApi('/api/cart/remove', { lineId: item.shopifyLineId }, { lineKey: item.shopifyLineId });
  }
}

/**
 * Jump to Shopify's hosted checkout. Re-fetches the cart first so we never
 * redirect to a stale/expired checkoutUrl (which lands on a dead checkout).
 * Falls back to the cached sessionStorage url, and surfaces an error if none.
 */
export async function checkout(): Promise<void> {
  if (typeof window === 'undefined') return;
  let url: string | null = window.sessionStorage.getItem('ma_checkout_url');
  try {
    const res = await fetch('/api/cart', { headers: { accept: 'application/json' } });
    const data = (await res.json()) as CartApiResponse;
    if (data.cart) {
      syncWithShopifyCart(data.cart);
      url = data.cart.checkoutUrl ?? url;
    } else {
      url = null; // cart expired server-side
    }
  } catch {
    /* network — fall back to the cached url below */
  }
  if (url) {
    window.location.href = url;
  } else {
    cartError.set('Your cart has expired. Please add items again.');
  }
}

export function toggleWishlist(product: WishItem) {
  const currentItems = [...persistedWishItems.get()];
  const existingIndex = currentItems.findIndex(item => item.id === product.id);

  if (existingIndex > -1) {
    const filtered = currentItems.filter(item => item.id !== product.id);
    persistedWishItems.set(filtered);
  } else {
    currentItems.push(product);
    persistedWishItems.set(currentItems);
  }
  updateWishTotals();
}

export function removeFromWishlist(id: string) {
  const currentItems = persistedWishItems.get().filter(item => item.id !== id);
  persistedWishItems.set(currentItems);
  updateWishTotals();
}

// ── Compare ────────────────────────────────────────────────
export interface CompareItem {
  id: string;
  handle: string;
  name: string;
  price: number;
  formattedPrice: string;
  image: string;
  category?: string;
  rating?: number;
  material?: string;
  sizes?: string;
  stock?: string;
  /** True when a size/colour must be chosen — add routes to the PDP. */
  needsPicker?: boolean;
}

export const COMPARE_MAX = 4;
export const persistedCompareItems = persistentAtom<CompareItem[]>('ma_compare_items', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});
export const compareCount = atom<number>(0);

export function updateCompareTotals() {
  compareCount.set(persistedCompareItems.get().length);
}

/** Add/remove a product from compare. Returns false if the list is full (max 4). */
export function toggleCompare(item: CompareItem): boolean {
  const current = [...persistedCompareItems.get()];
  const idx = current.findIndex((c) => c.id === item.id);
  if (idx > -1) {
    persistedCompareItems.set(current.filter((c) => c.id !== item.id));
    updateCompareTotals();
    return true;
  }
  if (current.length >= COMPARE_MAX) {
    cartError.set(`You can compare up to ${COMPARE_MAX} items.`);
    return false;
  }
  current.push(item);
  persistedCompareItems.set(current);
  updateCompareTotals();
  return true;
}

export function removeFromCompare(id: string) {
  persistedCompareItems.set(persistedCompareItems.get().filter((c) => c.id !== id));
  updateCompareTotals();
}

export function clearCompare() {
  persistedCompareItems.set([]);
  updateCompareTotals();
}

export function isInCompare(id: string): boolean {
  return persistedCompareItems.get().some((c) => c.id === id);
}

export async function saveForLater(id: string, color?: string, size?: string) {
  const currentCart = persistedCartItems.get();
  const item = currentCart.find(
    i => i.id === id && i.color === color && i.size === size
  );
  if (item) {
    const currentSaved = [...persistedSavedItems.get()];
    const existingIndex = currentSaved.findIndex(
      s => s.id === id && s.color === color && s.size === size
    );
    if (existingIndex === -1) {
      currentSaved.push(item);
      persistedSavedItems.set(currentSaved);
    }
    await removeFromCart(id, color, size);
  }
}

export async function moveToBag(id: string, color?: string, size?: string) {
  const currentSaved = persistedSavedItems.get();
  const item = currentSaved.find(
    s => s.id === id && s.color === color && s.size === size
  );
  if (item) {
    await addToCart(item, item.quantity);
    const filteredSaved = currentSaved.filter(
      s => !(s.id === id && s.color === color && s.size === size)
    );
    persistedSavedItems.set(filteredSaved);
  }
}

export function removeFromSaved(id: string, color?: string, size?: string) {
  const currentSaved = persistedSavedItems.get().filter(
    s => !(s.id === id && s.color === color && s.size === size)
  );
  persistedSavedItems.set(currentSaved);
}

// Initial Sync (run safe in browser context)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initCart();
  }, 0);
}
