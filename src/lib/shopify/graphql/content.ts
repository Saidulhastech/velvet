// ============================================================
//  Content GraphQL operations — menus, shop (2026-04)
// ============================================================

/** Navigation menu by handle (e.g. "main-menu", "footer"); nests 3 levels. */
export const MENU_QUERY = /* GraphQL */ `
  query Menu($handle: String!) {
    menu(handle: $handle) {
      id
      title
      items {
        id
        title
        url
        type
        items {
          id
          title
          url
          type
          items {
            id
            title
            url
            type
          }
        }
      }
    }
  }
`;

/** Shop name + primary domain — for SEO and footer. */
export const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop {
      name
      description
      primaryDomain {
        url
        host
      }
    }
  }
`;

/**
 * Shop localization — every country with an enabled localized experience and,
 * per country, its currency + available languages. Powers the market selector.
 * `country`/`language` reflect the active @inContext context (the shop default
 * here, since we resolve the *selected* market from the cookie ourselves).
 */
export const LOCALIZATION_QUERY = /* GraphQL */ `
  query Localization {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          symbol
          name
        }
        availableLanguages {
          isoCode
          name
          endonymName
        }
      }
      country {
        isoCode
        name
        currency {
          isoCode
          symbol
        }
      }
      language {
        isoCode
        name
        endonymName
      }
    }
  }
`;

/** A CMS page by handle (about, shipping, etc.). */
export const PAGE_QUERY = /* GraphQL */ `
  query Page($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    page(handle: $handle) {
      id
      title
      handle
      body
      bodySummary
      seo {
        title
        description
      }
    }
  }
`;
