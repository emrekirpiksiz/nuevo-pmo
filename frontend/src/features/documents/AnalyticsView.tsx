"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "antd";
import { EyeOutlined, TeamOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { DocumentsApi } from "@/lib/apis";

interface AnalyticsViewer {
  userId: string;
  userName: string;
  userEmail: string;
  sessionCount: number;
  totalDurationSeconds: number;
  lastViewedAt?: string | null;
}
interface AnalyticsReport {
  documentId: string;
  totalViews: number;
  uniqueViewers: number;
  totalDurationSeconds: number;
  viewers: AnalyticsViewer[];
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}sa`);
  if (m) parts.push(`${m}dk`);
  parts.push(`${s}sn`);
  return parts.join(" ");
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function AnalyticsView({ documentId }: { documentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["document-analytics", documentId],
    queryFn: () => DocumentsApi.analytics(documentId) as Promise<AnalyticsReport>,
  });

  if (isLoading || !data) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px" }}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  const maxDuration = Math.max(...data.viewers.map((v) => v.totalDurationSeconds), 1);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px" }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <EyeOutlined style={{ fontSize: 11 }} /> Toplam Görüntüleme
          </div>
          <div className="kpi-value" style={{ fontSize: 36 }}>{data.totalViews}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TeamOutlined style={{ fontSize: 11 }} /> Tekil İzleyici
          </div>
          <div className="kpi-value" style={{ fontSize: 36 }}>{data.uniqueViewers}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClockCircleOutlined style={{ fontSize: 11 }} /> Toplam Süre
          </div>
          <div className="kpi-value" style={{ fontSize: 24, marginTop: 10 }}>{fmtDuration(data.totalDurationSeconds)}</div>
        </div>
      </div>

      {/* Viewers */}
      {data.viewers.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <p className="subtle" style={{ margin: 0, fontSize: 13 }}>Henüz görüntüleme kaydı yok.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-head">
            <span className="card-title" style={{ fontSize: 15 }}>İzleyiciler</span>
            <span className="pill pill-neutral" style={{ marginLeft: "auto" }}>{data.viewers.length} kişi</span>
          </div>
          {data.viewers.map((v, i) => (
            <div
              key={v.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 20px",
                borderBottom: i < data.viewers.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              {/* Avatar */}
              <div className="av av-lg" style={{ flexShrink: 0 }}>{initials(v.userName)}</div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.3 }}>
                  {v.userName}
                </div>
                <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>{v.userEmail}</div>
                {/* Duration bar */}
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    className="bar"
                    style={{ flex: 1, height: 3 }}
                  >
                    <span style={{ width: `${Math.round((v.totalDurationSeconds / maxDuration) * 100)}%` }} />
                  </div>
                  <span className="subtle mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {fmtDuration(v.totalDurationSeconds)}
                  </span>
                </div>
              </div>

              {/* Right stats */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span className="pill pill-neutral">{v.sessionCount} oturum</span>
                {v.lastViewedAt && (
                  <span className="subtle mono" style={{ fontSize: 11 }}>
                    {new Date(v.lastViewedAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
