"use client";

import { ReactNode } from "react";

export interface ComingSoonProps {
  title: string;
  description?: ReactNode;
  variant?: "card" | "inline";
}

export function ComingSoon({ title, description, variant = "card" }: ComingSoonProps) {
  if (variant === "inline") {
    return (
      <div
        style={{
          padding: "32px 24px",
          textAlign: "center",
          color: "var(--ink-subtle)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <div className="serif" style={{ fontSize: 18, color: "var(--ink-muted)", marginBottom: 6 }}>
          {title}
        </div>
        {description && <div>{description}</div>}
        <span
          className="pill pill-accent"
          style={{ marginTop: 14, display: "inline-flex" }}
        >
          Yakında
        </span>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div
          className="serif"
          style={{ fontSize: 22, color: "var(--ink-muted)", marginBottom: 8 }}
        >
          {title}
        </div>
        {description && (
          <div
            className="muted"
            style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 14px" }}
          >
            {description}
          </div>
        )}
        <span className="pill pill-accent">Yakında</span>
      </div>
    </div>
  );
}
