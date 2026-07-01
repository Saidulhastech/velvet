// ============================================================
//  Customer Account API — GraphQL operations & result types
// ============================================================

/** Customer profile + most recent orders, in a single round-trip. */
export const CUSTOMER_OVERVIEW_QUERY = /* GraphQL */ `
  query CustomerOverview($first: Int!) {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          totalPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export interface CustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  totalPrice: { amount: string; currencyCode: string } | null;
}

export interface CustomerOverview {
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    emailAddress: { emailAddress: string } | null;
    orders: { nodes: CustomerOrder[] };
  } | null;
}
