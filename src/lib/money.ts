// ============================================================
//  Money formatting — shared across server (Astro) and client.
// ============================================================
import type { Money } from '~/lib/shopify/types';

export function formatMoney(money?: Money | null): string {
  if (!money) return '';
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return ''; // never render "$NaN"
  const currency = money.currencyCode || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      // Drop cents for whole amounts to match the OMNIX "$289" style.
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    // Invalid/unknown currency code — fall back rather than throw a RangeError.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * True when a product's variants span more than one price (min ≠ max), so a
 * grid card should show "From $X" (matches Shopify Dawn / WooCommerce default)
 * rather than a bare single price. Authoritative per-variant price still
 * resolves in the Quick View modal / PDP.
 */
export function hasPriceRange(
  range?: { minVariantPrice?: Money | null; maxVariantPrice?: Money | null } | null,
): boolean {
  const min = Number(range?.minVariantPrice?.amount ?? NaN);
  const max = Number(range?.maxVariantPrice?.amount ?? NaN);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  return max > min;
}

/** Percent saved between a compare-at price and the current price. */
export function percentOff(price?: Money | null, compareAt?: Money | null): number {
  const p = Number(price?.amount ?? 0);
  const c = Number(compareAt?.amount ?? 0);
  if (!p || !c || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}
