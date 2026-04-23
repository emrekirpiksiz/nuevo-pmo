const PKCE_STATE_KEY = "nuevo_pmo_o365_state";
const PKCE_VERIFIER_KEY = "nuevo_pmo_o365_verifier";

function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generatePkceVerifier(): string {
  return base64UrlEncode(randomBytes(48));
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(24));
}

export function storePkceSession(state: string, verifier: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PKCE_STATE_KEY, state);
  window.sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
}

export function consumePkceSession(): { state: string | null; verifier: string | null } {
  if (typeof window === "undefined") return { state: null, verifier: null };
  const state = window.sessionStorage.getItem(PKCE_STATE_KEY);
  const verifier = window.sessionStorage.getItem(PKCE_VERIFIER_KEY);
  window.sessionStorage.removeItem(PKCE_STATE_KEY);
  window.sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  return { state, verifier };
}
