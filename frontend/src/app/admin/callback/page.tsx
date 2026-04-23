"use client";

import { App as AntdApp, Button, Result, Spin } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthApi } from "@/lib/apis";
import { setSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/api";
import { consumePkceSession } from "@/lib/pkce";

export default function O365CallbackPage() {
  return (
    <Suspense fallback={<CenteredSpinner label="Yükleniyor..." />}>
      <O365CallbackInner />
    </Suspense>
  );
}

function O365CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = AntdApp.useApp();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");

    if (oauthError) {
      setError(oauthErrorDescription || oauthError);
      return;
    }

    if (!code) {
      setError("Microsoft'tan yetkilendirme kodu alınamadı.");
      return;
    }

    const { state, verifier } = consumePkceSession();

    if (!verifier || !state) {
      setError("Oturum doğrulama bilgisi bulunamadı. Lütfen yeniden deneyin.");
      return;
    }

    if (returnedState !== state) {
      setError("Güvenlik doğrulaması başarısız (state uyuşmazlığı).");
      return;
    }

    (async () => {
      try {
        const res = await AuthApi.o365Login(code, verifier);
        setSession(res.accessToken, res.user);
        message.success("Giriş başarılı");
        router.replace(res.user.userType === "Nuevo" ? "/admin" : "/portal");
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    })();
  }, [searchParams, router, message]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--canvas)",
        }}
      >
        <Result
          status="error"
          title="Giriş başarısız"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => router.replace("/admin/login")}>
              Giriş sayfasına dön
            </Button>
          }
        />
      </div>
    );
  }

  return <CenteredSpinner label="Microsoft 365 ile oturum açılıyor..." />;
}

function CenteredSpinner({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--canvas)",
        color: "var(--ink-muted)",
      }}
    >
      <Spin size="large" />
      <div style={{ fontSize: 13 }}>{label}</div>
    </div>
  );
}
