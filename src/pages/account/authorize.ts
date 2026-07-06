// GET /account/authorize — OAuth callback. Validate state, exchange the
// authorization code for Customer Account API tokens, persist them.
import type { APIRoute } from 'astro';
import {
  assertConfigured,
  CALLBACK_PATH,
  clearAuthState,
  exchangeCodeForTokens,
  getAuthState,
  getPublicOrigin,
  readIdTokenNonce,
  setTokens,
} from '~/lib/shopify/customer';
import { safePath } from '~/lib/market';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, request, redirect }) => {
  assertConfigured();

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const { verifier, state: savedState, nonce: savedNonce, returnTo } = getAuthState(cookies);
  clearAuthState(cookies); // single-use

  // CSRF + integrity check before we trust the code.
  if (!code || !state || !verifier || state !== savedState) {
    return redirect('/account/login?error=state', 302);
  }

  const origin = getPublicOrigin(request, url);
  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: verifier,
      redirectUri: new URL(CALLBACK_PATH, origin).toString(),
      origin,
    });
    // OIDC replay guard: if the id_token carries a nonce, it must match the
    // one we generated at /account/login. Skip only when either side is absent.
    const returnedNonce = readIdTokenNonce(tokens.idToken);
    if (savedNonce && returnedNonce && returnedNonce !== savedNonce) {
      return redirect('/account/login?error=nonce', 302);
    }
    setTokens(cookies, tokens);
  } catch (err) {
    const message = (err as Error).message;
    console.error('[account/authorize] token exchange failed:', message);
    // Send the real Shopify error to the login page so it can be shown
    // instead of silently looping back into the OAuth flow.
    return redirect(`/account/login?error=token&reason=${encodeURIComponent(message)}`, 302);
  }

  return redirect(safePath(returnTo, '/account'), 302);
};
