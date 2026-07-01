// ============================================================
//  Sort options surfaced in the storefront UI
// ============================================================
import type { SortOption } from './types';

/** Sort choices for the collection PLP (ProductCollectionSortKeys). */
export const COLLECTION_SORT_OPTIONS: SortOption[] = [
  { label: 'Featured', value: 'featured', sortKey: 'COLLECTION_DEFAULT', reverse: false },
  { label: 'Best selling', value: 'best-selling', sortKey: 'BEST_SELLING', reverse: false },
  { label: 'Price: low to high', value: 'price-asc', sortKey: 'PRICE', reverse: false },
  { label: 'Price: high to low', value: 'price-desc', sortKey: 'PRICE', reverse: true },
  { label: 'Newest', value: 'newest', sortKey: 'CREATED', reverse: true },
  { label: 'Alphabetical', value: 'title-asc', sortKey: 'TITLE', reverse: false },
];

/** Sort choices for the all-products / search listing (ProductSortKeys). */
export const PRODUCT_SORT_OPTIONS: SortOption[] = [
  { label: 'Best selling', value: 'best-selling', sortKey: 'BEST_SELLING', reverse: false },
  { label: 'Price: low to high', value: 'price-asc', sortKey: 'PRICE', reverse: false },
  { label: 'Price: high to low', value: 'price-desc', sortKey: 'PRICE', reverse: true },
  { label: 'Newest', value: 'newest', sortKey: 'CREATED_AT', reverse: true },
  { label: 'Alphabetical', value: 'title-asc', sortKey: 'TITLE', reverse: false },
];

/** Sort choices for the search page (SearchSortKeys — only RELEVANCE + PRICE). */
export const SEARCH_SORT_OPTIONS: SortOption[] = [
  { label: 'Most relevant', value: 'relevance', sortKey: 'RELEVANCE', reverse: false },
  { label: 'Price: low to high', value: 'price-asc', sortKey: 'PRICE', reverse: false },
  { label: 'Price: high to low', value: 'price-desc', sortKey: 'PRICE', reverse: true },
];

/** Resolve a UI sort `value` into its Shopify sortKey + reverse pair. */
export function resolveSort(options: SortOption[], value?: string | null): SortOption {
  return options.find((o) => o.value === value) ?? options[0];
}
