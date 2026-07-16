// ============================================================
//  Blog GraphQL operations — Shopify Blog/Article (2026-04)
// ============================================================
// Author role/bio/avatar come from a reusable "Author" Metaobject (Content >
// Metaobjects), referenced by a single `custom.author` metafield on the
// Article (type "Metaobject reference"). Set up in Shopify admin:
// Settings > Custom data > Articles > Add definition > Metaobject reference
// > reference type "Author" — key must be `author`. Enable Storefront API
// access on the definition, then pick an Author entry per article.

const AUTHOR_METAFIELD = /* GraphQL */ `
  author: metafield(namespace: "custom", key: "author") {
    reference {
      ... on Metaobject {
        authorName: field(key: "name") {
          value
        }
        authorRole: field(key: "author_role") {
          value
        }
        authorBio: field(key: "author_bio") {
          value
        }
        authorImage: field(key: "author_image") {
          reference {
            ... on MediaImage {
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
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
            ${AUTHOR_METAFIELD}
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
        ${AUTHOR_METAFIELD}
      }
    }
  }
`;
