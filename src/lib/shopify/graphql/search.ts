// ============================================================
//  Search GraphQL operations (Storefront API 2026-04)
// ============================================================
import { IMAGE_FRAGMENT, CARD_FRAGMENTS } from './fragments';

/** Full search results page (products). */
export const SEARCH_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query Search(
    $query: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $types: [SearchType!] = [PRODUCT]
    $sortKey: SearchSortKeys = RELEVANCE
    $reverse: Boolean = false
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query
      first: $first
      last: $last
      after: $after
      before: $before
      types: $types
      sortKey: $sortKey
      reverse: $reverse
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        node {
          ... on Product {
            ...ProductCard
          }
        }
      }
    }
  }
`;

/** Predictive (instant) search for the header autocomplete. */
export const PREDICTIVE_SEARCH_QUERY = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  query PredictiveSearch(
    $query: String!
    $limit: Int = 6
    $types: [PredictiveSearchType!] = [PRODUCT, COLLECTION, QUERY]
    $limitScope: PredictiveSearchLimitScope = EACH
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(query: $query, limit: $limit, types: $types, limitScope: $limitScope) {
      queries {
        text
        styledText
      }
      products {
        id
        title
        handle
        featuredImage {
          ...ImageFields
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
      collections {
        id
        title
        handle
        image {
          ...ImageFields
        }
      }
    }
  }
`;
