// GET /account/login — start the OAuth flow: generate PKCE + state,
// stash them in httpOnly cookies, then redirect to Shopify's login page.
import type { APIRoute } from 'astro';
import {
  assertConfigured,
  buildAuthorizeUrl,
  CALLBACK_PATH,
  generateCodeChallenge,
  generateCodeVerifier,
  generateRandom,
  getPublicOrigin,
  setAuthState,
} from '~/lib/shopify/customer';
import { safePath } from '~/lib/market';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, request, redirect }) => {
  assertConfigured();

  // If we arrived here because the callback failed, DON'T bounce straight back
  // into Shopify — that creates an infinite redirect loop (Shopify still has a
  // live session, re-issues a code, the callback fails again, repeat). Show the
  // real error and a manual retry link instead.
  const error = url.searchParams.get('error');
  if (error) {
    const reason = url.searchParams.get('reason') ?? '';
    const safe = (s: string) =>
      s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Sign-in failed</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1.5rem;color:#111}
code{background:#f4f4f5;padding:.15rem .4rem;border-radius:.25rem;font-size:.9em}
.r{background:#fef2f2;border:1px solid #fecaca;border-radius:.5rem;padding:1rem;color:#7f1d1d;white-space:pre-wrap;word-break:break-word}
a{color:#dc2626}</style></head><body>
<h1>Sign-in failed</h1>
<p>The login completed on Shopify, but exchanging the code for a session failed
(<code>${safe(error)}</code>).</p>
${reason ? `<div class="r">${safe(decodeURIComponent(reason))}</div>` : ''}
<p>This is almost always a Shopify <strong>Application setup</strong> issue — most
often the <strong>JavaScript origin</strong> not being registered as
<code>${safe(getPublicOrigin(request, url))}</code>.</p>
<p><a href="/account/login">Try again</a> &nbsp;·&nbsp; <a href="/">Back to store</a></p>
</body></html>`;
    return new Response(html, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateRandom();
  const nonce = generateRandom();

  // Only honour same-site relative return paths (avoid open-redirects).
  // safePath rejects `//host` / `/\host` protocol-relative tricks too.
  const returnTo = safePath(url.searchParams.get('return_to'), '/account');

  setAuthState(cookies, { verifier, state, nonce, returnTo });

  const redirectUri = new URL(CALLBACK_PATH, getPublicOrigin(request, url)).toString();
  const authorizeUrl = buildAuthorizeUrl({
    redirectUri,
    state,
    nonce,
    codeChallenge: challenge,
  });

  return redirect(authorizeUrl, 302);
};
