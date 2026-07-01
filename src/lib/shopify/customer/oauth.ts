// ============================================================
//  Customer Account API — OAuth orchestration
// ============================================================
// This is a PUBLIC client (PKCE, no client secret) registered via the
// Customer Account API "Application setup". For that client type the
// `authorization_code` token response already returns an access token that
// is used directly as the GraphQL Authorization header — there is NO second
// token-exchange step. (The token-exchange/audience dance is Hydrogen-only:
// its audience is Hydrogen's own client ID, so this client rejects that
// grant with `unsupported_grant_type`.) Refresh just repeats authorization
// with the refresh_token grant.
import {
  getAuthorizeEndpoint,
  getClientId,
  getLogoutEndpoint,
  SCOPES,
  getTokenEndpoint,
} from './config';
import type { CustomerTokens } from './session';

/** Build the URL we redirect the buyer to in order to log in. */
export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(getAuthorizeEndpoint());
  url.searchParams.set('client_id', getClientId()!);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function postToken(origin: string, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(getTokenEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Public clients must send Origin so Shopify can validate the request
      // against the registered JavaScript origin. A mismatch fails here even
      // though the login redirect (which only checks redirect_uri) succeeded.
      Origin: origin,
      'User-Agent': 'Astro Shopify Customer Account',
    },
    body: new URLSearchParams(body),
    // Don't let a slow/unreachable token endpoint hang the SSR render.
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new Error(
      `Customer token request failed (HTTP ${res.status}): ${json.error ?? ''} ${json.error_description ?? ''}`.trim(),
    );
  }
  return json;
}

/** Authorization code → Customer Account API tokens (single request). */
export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  origin: string;
}): Promise<CustomerTokens> {
  const oauth = await postToken(args.origin, {
    grant_type: 'authorization_code',
    client_id: getClientId()!,
    redirect_uri: args.redirectUri,
    code: args.code,
    code_verifier: args.codeVerifier,
  });

  return {
    accessToken: oauth.access_token,
    refreshToken: oauth.refresh_token ?? '',
    idToken: oauth.id_token,
    expiresAt: Date.now() + oauth.expires_in * 1000,
  };
}

/** Refresh an expired access token using the refresh_token grant. */
export async function refreshTokens(args: {
  refreshToken: string;
  idToken?: string;
  origin: string;
}): Promise<CustomerTokens> {
  const oauth = await postToken(args.origin, {
    grant_type: 'refresh_token',
    client_id: getClientId()!,
    refresh_token: args.refreshToken,
  });

  return {
    accessToken: oauth.access_token,
    // Shopify rotates the refresh token; fall back to the old one if absent.
    refreshToken: oauth.refresh_token ?? args.refreshToken,
    idToken: oauth.id_token ?? args.idToken,
    expiresAt: Date.now() + oauth.expires_in * 1000,
  };
}

/** Build the Shopify logout URL that ends the session and returns home. */
export function buildLogoutUrl(args: { idToken?: string; postLogoutRedirectUri: string }): string {
  const url = new URL(getLogoutEndpoint());
  if (args.idToken) url.searchParams.set('id_token_hint', args.idToken);
  url.searchParams.set('post_logout_redirect_uri', args.postLogoutRedirectUri);
  return url.toString();
}
