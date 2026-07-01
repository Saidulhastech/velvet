// ============================================================
//  Cart extras resolver — turns the handle-based CART_EXTRAS config
//  (src/config/velvet.ts) into render-ready data by looking the gift-wrap
//  and protection products up in Shopify BY HANDLE at request time.
//
//  Why handle, not gid: a template ships to many stores, each with
//  different variant gids. Handles are stable and human ("gift-wrap"),
//  so a buyer just creates the product — no code edit, no gid pasting.
//
//  A feature is HIDDEN (`show: false`) when it's disabled, or when its
//  product/variant can't be found or bought — so buyers who don't set up
//  the product never see a broken, non-charging toggle.
// ============================================================
import { getProduct } from '~/lib/shopify';
import type { Money } from '~/lib/shopify/types';
import type { Market } from '~/lib/market';
import { CART_EXTRAS } from '~/config/velvet';

export interface GiftWrapExtra {
  show: boolean;
  variantId: string;
  price: Money | null;
  label: string;
  desc: string;
  messageMaxLength: number;
}

export interface ProtectionPlanResolved {
  id: string;
  name: string;
  meta: string;
  best: boolean;
  /** Variant gid — empty for the free "none" plan. */
  variantId: string;
  price: Money | null;
}

export interface ProtectionExtra {
  show: boolean;
  plans: ProtectionPlanResolved[];
}

export interface CartExtras {
  giftWrap: GiftWrapExtra;
  orderNotes: { show: boolean; maxLength: number };
  protection: ProtectionExtra;
}

const HIDDEN_GIFT: GiftWrapExtra = {
  show: false, variantId: '', price: null,
  label: CART_EXTRAS.giftWrap.label, desc: CART_EXTRAS.giftWrap.desc,
  messageMaxLength: CART_EXTRAS.giftWrap.messageMaxLength,
};

async function resolveGiftWrap(market?: Market): Promise<GiftWrapExtra> {
  const cfg = CART_EXTRAS.giftWrap;
  if (!cfg.enabled) return HIDDEN_GIFT;
  try {
    const product = await getProduct(cfg.handle, market);
    const variant = product?.variants?.find((v) => v.availableForSale) ?? product?.variants?.[0];
    if (!product || !variant || !variant.availableForSale) return HIDDEN_GIFT;
    return {
      show: true,
      variantId: variant.id,
      price: variant.price,
      label: cfg.label,
      desc: cfg.desc,
      messageMaxLength: cfg.messageMaxLength,
    };
  } catch {
    return HIDDEN_GIFT; // store unreachable — degrade to hidden, never crash the cart
  }
}

async function resolveProtection(market?: Market): Promise<ProtectionExtra> {
  const cfg = CART_EXTRAS.protection;
  if (!cfg.enabled) return { show: false, plans: [] };
  try {
    const product = await getProduct(cfg.handle, market);
    if (!product) return { show: false, plans: [] };

    const plans: ProtectionPlanResolved[] = [];
    let paidResolved = 0;
    for (const plan of cfg.plans) {
      if (plan.id === 'none' || !plan.optionValue) {
        plans.push({ id: plan.id, name: plan.name, meta: plan.meta, best: plan.best, variantId: '', price: null });
        continue;
      }
      const variant = product.variants?.find(
        (v) => v.availableForSale && v.selectedOptions.some((o) => o.value === plan.optionValue),
      );
      if (!variant) continue; // plan's variant missing/unavailable — drop this plan
      paidResolved++;
      plans.push({
        id: plan.id, name: plan.name, meta: plan.meta, best: plan.best,
        variantId: variant.id, price: variant.price,
      });
    }
    // Need at least one real paid plan to be worth showing the section.
    return { show: paidResolved > 0, plans };
  } catch {
    return { show: false, plans: [] };
  }
}

/** Resolve all cart extras for the current request (both lookups in parallel). */
export async function resolveCartExtras(market?: Market): Promise<CartExtras> {
  const [giftWrap, protection] = await Promise.all([
    resolveGiftWrap(market),
    resolveProtection(market),
  ]);
  return {
    giftWrap,
    orderNotes: { show: CART_EXTRAS.orderNotes.enabled, maxLength: CART_EXTRAS.orderNotes.maxLength },
    protection,
  };
}
