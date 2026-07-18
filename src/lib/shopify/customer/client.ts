// ============================================================
//  Customer Account API — authenticated GraphQL client
// ============================================================
// Bound to the current request's cookies. Transparently refreshes the
// access token when it is about to expire and re-persists the cookies.
import type { AstroCookies } from 'astro';
import { getGraphqlEndpoint } from './config';
import { refreshTokens } from './oauth';
import { clearTokens, getTokens, setTokens } from './session';

/** Thrown when the visitor is not (or no longer) authenticated. */
export class NotAuthenticatedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'NotAuthenticatedError';
  }
}

// Refresh a little before the real expiry to avoid mid-request races.
const EXPIRY_BUFFER_MS = 60_000;
// Cap how long an /account SSR render can wait on Shopify before failing —
// without this a slow OAuth/GraphQL endpoint hangs the whole page render.
const REQUEST_TIMEOUT_MS = 10_000;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface CustomerClient {
  isLoggedIn(): boolean;
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export function createCustomerClient(cookies: AstroCookies, origin: string): CustomerClient {
  async function validAccessToken(): Promise<string> {
    const tokens = getTokens(cookies);
    if (!tokens) throw new NotAuthenticatedError();

    if (tokens.expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
      return tokens.accessToken;
    }

    // Token expired/expiring → refresh. If that fails, the session is dead.
    try {
      const next = await refreshTokens({
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        origin,
      });
      setTokens(cookies, next);
      return next.accessToken;
    } catch (cause) {
      clearTokens(cookies);
      throw new NotAuthenticatedError(`Session refresh failed: ${(cause as Error).message}`);
    }
  }

  return {
    isLoggedIn() {
      return getTokens(cookies) !== null;
    },

    async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
      const accessToken = await validAccessToken();

      const res = await fetch(getGraphqlEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Customer Account API expects the raw token — NOT "Bearer <token>".
          Authorization: accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.status === 401) {
        clearTokens(cookies);
        throw new NotAuthenticatedError('Customer Account API returned 401');
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        // A non-JSON body (usually an HTML error page) means the endpoint itself is
        // wrong — most often a sunset CUSTOMER_ACCOUNT_API_VERSION. Surface that
        // instead of letting res.json() throw an opaque "Unexpected token '<'".
        throw new Error(
          `Customer Account API returned non-JSON response (HTTP ${res.status}). ` +
            `Check that CUSTOMER_ACCOUNT_API_VERSION is a currently supported version.`,
        );
      }

      const json = (await res.json()) as GraphQLResponse<T>;
      if (!res.ok) {
        throw new Error(`Customer Account API HTTP ${res.status} ${res.statusText}`);
      }
      if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join('; '));
      }
      if (!json.data) throw new Error('Empty response from Customer Account API');
      return json.data;
    },
  };
}
