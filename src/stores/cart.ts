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

// Action to apply a Shopify coupon/discount code
export async function applyDiscount(codes: string[]) {
  await postToApi('/api/cart/discount', { codes });
}

// Action to update the Shopify cart note
export async function updateCartNote(note: string) {
  await postToApi('/api/cart/note', { note });
}

// Background api call helper
async function postToApi(url: string, body: any) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.cart) {
      syncWithShopifyCart(data.cart);
    }
  } catch (err) {
    console.error(`Shopify cart sync error on ${url}:`, err);
  }
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
  } catch {
    updateCartTotals();
    updateWishTotals();
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

    // Background Shopify sync
    if (item.shopifyLineId) {
      await postToApi('/api/cart/update', { lineId: item.shopifyLineId, quantity });
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

  // Background Shopify sync
  if (item && item.shopifyLineId) {
    await postToApi('/api/cart/remove', { lineId: item.shopifyLineId });
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
