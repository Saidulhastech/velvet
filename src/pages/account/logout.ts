// GET /account/logout — clear local session, then end the Shopify session.
import type { APIRoute } from 'astro';
import {
  buildLogoutUrl,
  clearTokens,
  getPublicOrigin,
  getTokens,
  isCustomerAccountConfigured,
} from '~/lib/shopify/customer';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, request, redirect }) => {
  const tokens = getTokens(cookies);
  clearTokens(cookies);

  // Without an id_token (or config) we can't hit Shopify's logout — just go home.
  if (!isCustomerAccountConfigured() || !tokens?.idToken) {
    return redirect('/', 302);
  }

  const logoutUrl = buildLogoutUrl({
    idToken: tokens.idToken,
    postLogoutRedirectUri: getPublicOrigin(request, url),
  });
  return redirect(logoutUrl, 302);
};
