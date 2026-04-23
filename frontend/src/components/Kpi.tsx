"use client";

import { ReactNode } from "react";

export interface KpiProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}

export function Kpi({ label, value, hint }: KpiProps) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="subtle" style={{ fontSize: 11.5 }}>{hint}</div>}
    </div>
  );
}

export function KpiGrid({ columns = 4, children }: { columns?: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        marginBottom: 24,
      }}
    >
      {children}
    </div>
  );
}
