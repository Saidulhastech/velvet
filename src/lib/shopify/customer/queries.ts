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
          financialStatus
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
  /** OrderFinancialStatus enum (PAID, PENDING, REFUNDED, …). */
  financialStatus?: string | null;
  /** The Customer Account API exposes fulfillment via a `fulfillments`
   *  connection (no scalar status field), so this stays optional and the UI
   *  falls back to "Unfulfilled" until that connection is wired in. */
  fulfillmentStatus?: string | null;
  totalPrice: { amount: string; currencyCode: string } | null;
}

/** Shopify CustomerAddress subset the account page renders. Optional — only
 *  present once the `defaultAddress` field is added to CUSTOMER_OVERVIEW_QUERY
 *  (kept out for now to avoid guessing the API's address field names). */
export interface CustomerAddress {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface CustomerOverview {
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    emailAddress: { emailAddress: string } | null;
    defaultAddress?: CustomerAddress | null;
    orders: { nodes: CustomerOrder[] };
  } | null;
}
