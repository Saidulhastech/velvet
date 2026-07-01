// ============================================================
//  PKCE + state/nonce generation (RFC 7636)
// ============================================================
// Uses the Web Crypto API (globalThis.crypto), available on both Node
// (>=18) and edge runtimes like Cloudflare Workers — so no `node:crypto`.

/** base64url-encode raw bytes (no padding). */
function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A high-entropy code_verifier (43–128 chars, base64url). */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** code_challenge = BASE64URL(SHA256(verifier)). Method is always S256. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(digest));
}

/** Opaque random value for the OAuth `state` (CSRF) and `nonce` (replay) params. */
export function generateRandom(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}
