const TOKEN_KEY = "nuevo_pmo_token";
const USER_KEY = "nuevo_pmo_user";

export type UserType = "Nuevo" | "Customer";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  userType: UserType;
  customerId?: string | null;
  customerName?: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("nuevo_pmo_auth_change"));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("nuevo_pmo_auth_change"));
}

export function isNuevo(user: SessionUser | null | undefined): boolean {
  return user?.userType === "Nuevo";
}
export function isCustomer(user: SessionUser | null | undefined): boolean {
  return user?.userType === "Customer";
}
