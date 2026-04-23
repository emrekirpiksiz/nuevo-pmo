"use client";

import { useEffect, useRef } from "react";
import { ViewsApi } from "@/lib/apis";

export function useViewTracker(documentId: string | null, enabled: boolean) {
  const sessionRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !documentId) return;
    let aborted = false;

    async function start() {
      try {
        const res = await ViewsApi.start(documentId!);
        if (aborted) return;
        sessionRef.current = res.sessionId;
        const ms = Math.max(5000, res.heartbeatIntervalSec * 1000);
        intervalRef.current = setInterval(() => {
          if (sessionRef.current) {
            ViewsApi.heartbeat(documentId!, sessionRef.current).catch(() => {});
          }
        }, ms);
      } catch { /* silent */ }
    }

    start();

    const onBeforeUnload = () => {
      if (sessionRef.current && documentId) {
        const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7000"}/api/documents/${documentId}/views/${sessionRef.current}/close`;
        const token = localStorage.getItem("nuevo_pmo_token");
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({})], { type: "application/json" });
          navigator.sendBeacon(url, blob);
        }
        if (token) {
          fetch(url, { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
        }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      aborted = true;
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sessionRef.current && documentId) {
        ViewsApi.close(documentId, sessionRef.current).catch(() => {});
      }
    };
  }, [documentId, enabled]);
}
