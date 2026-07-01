// ============================================================
//  Product GraphQL operations (Storefront API 2026-04)
// ============================================================
import {
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  VARIANT_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  CARD_FRAGMENTS,
} from './fragments';

/** Paginated, sortable, filterable product list (bidirectional cursors). */
export const PRODUCTS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ProductList(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $sortKey: ProductSortKeys = BEST_SELLING
    $reverse: Boolean = false
    $query: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      after: $after
      before: $before
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        endCursor
        startCursor
      }
      edges {
        cursor
        node {
          ...ProductCard
        }
      }
    }
  }
`;

/** Single product by handle — full detail for the PDP. */
export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  query ProductByHandle($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      productType
      vendor
      tags
      createdAt
      availableForSale
      totalInventory
      # Standard review metafields (written by Judge.me / Yotpo / Shopify reviews).
      ratingMetafield: metafield(namespace: "reviews", key: "rating") {
        value
      }
      ratingCountMetafield: metafield(namespace: "reviews", key: "rating_count") {
        value
      }
      # Optional structured specs + highlights (custom metafields, JSON list).
      specsMetafield: metafield(namespace: "custom", key: "specifications") {
        value
        type
      }
      highlightsMetafield: metafield(namespace: "custom", key: "highlights") {
        value
        type
      }
      # Optional materials/care + shipping/returns bullets (custom metafields, JSON list).
      materialsCareMetafield: metafield(namespace: "custom", key: "materials_care") {
        value
        type
      }
      shippingReturnsMetafield: metafield(namespace: "custom", key: "shipping_returns") {
        value
        type
      }
      # Optional individual reviews (JSON list) — populated by a reviews app.
      reviewsMetafield: metafield(namespace: "custom", key: "reviews") {
        value
      }
      reviewsAltMetafield: metafield(namespace: "reviews", key: "reviews") {
        value
      }
      featuredImage {
        ...ImageFields
      }
      images(first: 20) {
        edges {
          node {
            ...ImageFields
          }
        }
      }
      priceRange {
        minVariantPrice {
          ...Money
        }
        maxVariantPrice {
          ...Money
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          ...Money
        }
      }
      options {
        id
        name
        optionValues {
          id
          name
          swatch {
            color
          }
        }
      }
      variants(first: 100) {
        edges {
          node {
            ...VariantFields
            # Real local-pickup availability per variant (Admin → Local pickup).
            # PDP-only — NOT in the shared VariantFields, which the grid reuses
            # (100 cards × storeAvailability would blow up the query cost).
            storeAvailability(first: 8) {
              edges {
                node {
                  available
                  pickUpTime
                  location {
                    name
                    address {
                      city
                    }
                  }
                }
              }
            }
          }
        }
      }
      seo {
        title
        description
      }
    }
  }
`;

/**
 * Fixed-price bundle products — pure Shopify standard, NO app / Cart Transform.
 * A bundle is an ordinary product (its own SKU, priced as the bundle) tagged
 * `bundle`. Its contents are declared in a standard `list.product_reference`
 * metafield `custom.bundle_items` — read live for the "what's included" list.
 * "Add bundle" drops the ONE bundle variant into the cart like any product.
 *
 * Trade-off vs a Cart Transform bundle: component inventory is NOT deducted —
 * the bundle carries its own stock. Fine when you pick/stock it as a unit.
 */
export const BUNDLE_PRODUCTS_QUERY = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  query BundleProducts(
    $query: String = "tag:bundle"
    $first: Int = 6
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: $first, query: $query, sortKey: BEST_SELLING) {
      edges {
        node {
          id
          title
          handle
          vendor
          availableForSale
          featuredImage {
            ...ImageFields
          }
          priceRange {
            minVariantPrice {
              ...Money
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              ...Money
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                availableForSale
                price {
                  ...Money
                }
                compareAtPrice {
                  ...Money
                }
              }
            }
          }
          # Bundle contents — a standard list.product_reference metafield.
          bundleItems: metafield(namespace: "custom", key: "bundle_items") {
            references(first: 12) {
              edges {
                node {
                  ... on Product {
                    id
                    title
                    vendor
                    featuredImage {
                      ...ImageFields
                    }
                    priceRange {
                      minVariantPrice {
                        ...Money
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * One bundle by handle, with each component product's FULL card data (options
 * + variants) — powers the build-your-own bundle configurator at /bundles/*.
 * The shopper picks a variant per component; we add each chosen variant as its
 * own cart line. The bundle product is just the container (tag + metafield).
 */
export const BUNDLE_BY_HANDLE_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query BundleByHandle($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      description
      featuredImage {
        ...ImageFields
      }
      bundleItems: metafield(namespace: "custom", key: "bundle_items") {
        references(first: 12) {
          edges {
            node {
              ... on Product {
                ...ProductCard
              }
            }
          }
        }
      }
    }
  }
`;

/** Related products for the PDP. */
export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  ${CARD_FRAGMENTS}
  query ProductRecommendations($productId: ID!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      ...ProductCard
    }
  }
`;

/** All product handles — for static params / sitemaps if needed. */
export const PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query ProductHandles($first: Int = 250, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          handle
        }
      }
    }
  }
`;
