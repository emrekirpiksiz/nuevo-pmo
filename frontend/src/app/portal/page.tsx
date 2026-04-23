"use client";

import Link from "next/link";
import { Empty, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { ProjectsApi } from "@/lib/apis";
import { useSession } from "@/lib/useSession";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

export default function CustomerHomePage() {
  const { user } = useSession();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectsApi.list(),
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow={user?.customerName ?? "Müşteri Portalı"}
        title={`Hoş geldiniz${user?.displayName ? ", " + user.displayName.split(" ")[0] : ""}.`}
        description="Sizinle paylaşılan tüm projeler ve onayınızı bekleyen dokümanlar burada listeleniyor."
      />

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (projects?.length ?? 0) === 0 ? (
        <div className="card" style={{ padding: 60 }}>
          <Empty description="Henüz atanmış projeniz yok." />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {projects!.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <div
                className="card"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="subtle mono" style={{ fontSize: 11.5 }}>{p.code}</div>
                    <div
                      className="serif"
                      style={{ fontSize: 22, marginTop: 2, letterSpacing: "-0.2px" }}
                    >
                      {p.name}
                    </div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
                {p.description && (
                  <div
                    className="muted"
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description}
                  </div>
                )}
                <div className="row" style={{ gap: 12, marginTop: "auto" }}>
                  <span className="pill pill-neutral">{p.documentCount} doküman</span>
                  <span className="pill pill-neutral">{p.memberCount} üye</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
