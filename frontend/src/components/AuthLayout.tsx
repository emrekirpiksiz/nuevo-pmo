"use client";

import { ReactNode } from "react";

export interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  pitchTitle?: string;
  pitchBody?: string;
  children: ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  pitchTitle = "Proje yönetiminde sürüm, yorum ve onay tek bir yerde.",
  pitchBody = "Nuevo Project Management Portal; planları, dokümanları ve onay süreçlerini ekipleriniz ve müşterileriniz için şeffaf bir çalışma alanında buluşturur.",
  children,
}: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--canvas)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div
        style={{
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          {/* Yalnızca yeşil "nuevo" wordmark kısmını göster */}
          <div style={{ overflow: "hidden", height: 30 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nuevo-logo.svg"
              alt="Nuevo PMP"
              style={{ width: 160, height: "auto", display: "block" }}
            />
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9.5,
              textTransform: "uppercase",
              letterSpacing: "2.5px",
              color: "var(--sidebar-text)",
              opacity: 0.5,
              marginTop: 6,
            }}
          >
            Project Management Portal
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            className="serif"
            style={{
              fontSize: 38,
              lineHeight: 1.15,
              color: "var(--sidebar-text-strong)",
              letterSpacing: "-0.6px",
              maxWidth: 480,
            }}
          >
            {pitchTitle}
          </div>
          <div
            className="subtle"
            style={{
              fontSize: 13.5,
              maxWidth: 460,
              lineHeight: 1.6,
              color: "var(--sidebar-text)",
            }}
          >
            {pitchBody}
          </div>
        </div>

        <div
          className="subtle mono"
          style={{
            fontSize: 10,
            opacity: 0.45,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          © {new Date().getFullYear()} Nuevo · Tüm hakları saklıdır
        </div>
      </div>

      <div
        style={{
          padding: "48px 56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <span className="eyebrow">{eyebrow}</span>
          <h1
            className="serif"
            style={{
              fontSize: 36,
              margin: "0 0 10px",
              letterSpacing: "-0.4px",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 28, lineHeight: 1.5 }}>
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
