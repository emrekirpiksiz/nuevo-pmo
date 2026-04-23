import axios, { AxiosError } from "axios";
import { getToken, clearAuth } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<any>) => {
    if (err.response?.status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        const current = window.location.pathname;
        if (
          !current.startsWith("/admin/login") &&
          !current.startsWith("/admin/callback") &&
          !current.startsWith("/login") &&
          !current.startsWith("/accept-invite")
        ) {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as any;
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
    if (data?.errors) {
      const lines: string[] = [];
      Object.values<string[]>(data.errors).forEach((arr) =>
        arr.forEach((m) => lines.push(m))
      );
      if (lines.length) return lines.join(", ");
    }
    return err.message;
  }
  return (err as Error)?.message ?? "Bilinmeyen hata";
}
