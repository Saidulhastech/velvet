// ============================================================
//  Reusable GraphQL fragments (Storefront API 2026-04)
// ============================================================
// Concatenate the fragments a query needs ahead of the operation
// string. Defined once, reused everywhere (DRY).

export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment Money on MoneyV2 {
    amount
    currencyCode
  }
`;

export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    id
    url
    altText
    width
    height
  }
`;

export const VARIANT_FRAGMENT = /* GraphQL */ `
  fragment VariantFields on ProductVariant {
    id
    title
    sku
    availableForSale
    quantityAvailable
    selectedOptions {
      name
      value
    }
    price {
      ...Money
    }
    compareAtPrice {
      ...Money
    }
    image {
      ...ImageFields
    }
  }
`;

export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  fragment ProductCard on Product {
    id
    title
    handle
    vendor
    productType
    availableForSale
    featuredImage {
      ...ImageFields
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
    # Variants for grid quick-add + swatch→image swap. Capped at 25 to keep the
    # query cost sane across a large grid (100 × many cards risks MAX_COST_EXCEEDED
    # and a huge payload). Products with more variants fall back to the PDP.
    variants(first: 25) {
      edges {
        node {
          ...VariantFields
        }
      }
    }
    # Short description for the quick-view modal (kept small).
    description(truncateAt: 200)
    # Tags + createdAt drive the "New" badge; options drive color swatches.
    tags
    createdAt
    options {
      name
      optionValues {
        name
        swatch {
          color
        }
      }
    }
    # Total sellable units across variants — powers the deal stock bar.
    # Needs the storefront token's "read product inventory" scope; returns
    # null when inventory isn't tracked.
    totalInventory
    # Review rating + count. Shopify's STANDARD product metafields written
    # by review apps (Judge.me, Yotpo, Shopify's own). Null when absent —
    # the card hides the stars in that case.
    ratingMetafield: metafield(namespace: "reviews", key: "rating") {
      value
    }
    ratingCountMetafield: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
    # Optional per-product stock goal for the "Sold X / Y" bar (custom).
    stockGoalMetafield: metafield(namespace: "custom", key: "stock_goal") {
      value
    }
  }
`;

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    note
    attributes {
      key
      value
    }
    buyerIdentity {
      countryCode
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
      totalTaxAmount {
        ...Money
      }
    }
    discountCodes {
      applicable
      code
    }
    discountAllocations {
      discountedAmount {
        ...Money
      }
    }
    lines(first: 250) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              ...Money
            }
            amountPerQuantity {
              ...Money
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
              quantityAvailable
              selectedOptions {
                name
                value
              }
              price {
                ...Money
              }
              image {
                ...ImageFields
              }
              product {
                id
                title
                handle
                featuredImage {
                  ...ImageFields
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Fragments the cart operations need, bundled for convenience. */
export const CART_FRAGMENTS = [MONEY_FRAGMENT, IMAGE_FRAGMENT, CART_FRAGMENT].join('\n');

/** Fragments the product-card grids need. */
export const CARD_FRAGMENTS = [
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  VARIANT_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
].join('\n');
