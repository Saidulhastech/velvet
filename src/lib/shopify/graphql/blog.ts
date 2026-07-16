// ============================================================
//  Blog GraphQL operations — Shopify Blog/Article (2026-04)
// ============================================================
// Custom author fields (role/bio/avatar) live as `custom.*` metafields on the
// Article — set up their definitions in Shopify admin (Settings > Custom
// data > Articles) with Storefront API access enabled.

const AUTHOR_METAFIELDS = /* GraphQL */ `
  authorRoleMetafield: metafield(namespace: "custom", key: "author_role") {
    value
  }
  authorBioMetafield: metafield(namespace: "custom", key: "author_bio") {
    value
  }
  authorImageMetafield: metafield(namespace: "custom", key: "author_image") {
    value
  }
`;

/** Paginated articles for a blog (listing pages, homepage Journal section). */
export const ARTICLES_QUERY = /* GraphQL */ `
  query Articles(
    $blogHandle: String!
    $first: Int!
    $after: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          cursor
          node {
            id
            title
            handle
            contentHtml
            excerpt
            publishedAt
            tags
            image {
              url
              altText
              width
              height
            }
            authorV2 {
              name
            }
            ${AUTHOR_METAFIELDS}
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/** A single article by handle, within a blog — the /blog/[slug] detail page. */
export const ARTICLE_QUERY = /* GraphQL */ `
  query Article(
    $blogHandle: String!
    $articleHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        id
        title
        handle
        contentHtml
        excerpt
        publishedAt
        tags
        image {
          url
          altText
          width
          height
        }
        authorV2 {
          name
        }
        seo {
          title
          description
        }
        ${AUTHOR_METAFIELDS}
      }
    }
  }
`;
