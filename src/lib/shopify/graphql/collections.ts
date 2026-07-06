// ============================================================
//  Collection GraphQL operations (Storefront API 2026-04)
// ============================================================
import { IMAGE_FRAGMENT, CARD_FRAGMENTS } from './fragments';

/** Single collection + its products (paginated, sortable, faceted). */
export const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query CollectionByHandle(
    $handle: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: ProductCollectionSortKeys = COLLECTION_DEFAULT
    $reverse: Boolean = false
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image {
        ...ImageFields
      }
      seo {
        title
        description
      }
      products(
        first: $first
        last: $last
        after: $after
        before: $before
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        edges {
          cursor
          node {
            ...ProductCard
          }
        }
      }
    }
  }
`;

/**
 * Collections with a capped product count — for the home category grid.
 * Storefront has no count field, so we fetch up to `countTo` product ids
 * per collection and count them (productCountPlus flags overflow).
 */
export const COLLECTIONS_WITH_COUNTS_QUERY = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query CollectionsWithCounts(
    $first: Int = 8
    $countTo: Int = 250
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, sortKey: TITLE) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            ...ImageFields
          }
          products(first: $countTo) {
            nodes { id }
            pageInfo { hasNextPage }
          }
        }
      }
    }
  }
`;

/** All collections — for nav / collection index. */
export const COLLECTIONS_QUERY = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query Collections($first: Int = 50, $after: String) {
    collections(first: $first, after: $after, sortKey: TITLE) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          description
          image {
            ...ImageFields
          }
        }
      }
    }
  }
`;
