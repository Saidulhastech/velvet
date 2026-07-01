// ============================================================
//  Customer session — httpOnly cookies for OAuth tokens + transient
//  PKCE/state values. Tokens are never readable by client JS.
// ============================================================
import type { AstroCookies } from 'astro';

// Persistent token set (lives as long as the refresh token is valid).
const AT = 'cust_at'; // Customer Account API access token (the GraphQL token)
const RT = 'cust_rt'; // refresh token
const IT = 'cust_it'; // id token (needed as id_token_hint on logout)
const EXP = 'cust_exp'; // access-token expiry (epoch ms)

// Transient values, only needed between /account/login and /account/authorize.
const VERIFIER = 'cust_pkce'; // PKCE code_verifier
const STATE = 'cust_state'; // CSRF state
const RETURN_TO = 'cust_return'; // where to send the user after login

const TEN_MINUTES = 60 * 10;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function base(secure = import.meta.env.PROD) {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' } as const;
}

export interface CustomerTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

// --- Persistent tokens ----------------------------------------------
export function setTokens(cookies: AstroCookies, t: CustomerTokens): void {
  cookies.set(AT, t.accessToken, { ...base(), maxAge: THIRTY_DAYS });
  cookies.set(RT, t.refreshToken, { ...base(), maxAge: THIRTY_DAYS });
  if (t.idToken) cookies.set(IT, t.idToken, { ...base(), maxAge: THIRTY_DAYS });
  cookies.set(EXP, String(t.expiresAt), { ...base(), maxAge: THIRTY_DAYS });
}

export function getTokens(cookies: AstroCookies): CustomerTokens | null {
  const accessToken = cookies.get(AT)?.value;
  const refreshToken = cookies.get(RT)?.value;
  const expiresAt = Number(cookies.get(EXP)?.value);
  if (!accessToken || !refreshToken || !expiresAt) return null;
  return { accessToken, refreshToken, idToken: cookies.get(IT)?.value, expiresAt };
}

export function clearTokens(cookies: AstroCookies): void {
  for (const k of [AT, RT, IT, EXP]) cookies.delete(k, { path: '/' });
}

// --- Transient auth params ------------------------------------------
export function setAuthState(
  cookies: AstroCookies,
  data: { verifier: string; state: string; returnTo: string },
): void {
  cookies.set(VERIFIER, data.verifier, { ...base(), maxAge: TEN_MINUTES });
  cookies.set(STATE, data.state, { ...base(), maxAge: TEN_MINUTES });
  cookies.set(RETURN_TO, data.returnTo, { ...base(), maxAge: TEN_MINUTES });
}

export function getAuthState(
  cookies: AstroCookies,
): { verifier?: string; state?: string; returnTo?: string } {
  return {
    verifier: cookies.get(VERIFIER)?.value,
    state: cookies.get(STATE)?.value,
    returnTo: cookies.get(RETURN_TO)?.value,
  };
}

export function clearAuthState(cookies: AstroCookies): void {
  for (const k of [VERIFIER, STATE, RETURN_TO]) cookies.delete(k, { path: '/' });
}
