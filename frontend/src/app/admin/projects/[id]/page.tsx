"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Skeleton } from "antd";
import { ArrowLeftOutlined, SettingOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { ProjectsApi } from "@/lib/apis";
import { ProjectMembersPanel } from "@/features/projects/ProjectMembersPanel";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { ProjectPlanPanel } from "@/features/projectPlan/ProjectPlanPanel";
import { ComingSoon } from "@/components/ComingSoon";
import { StatusPill } from "@/components/StatusPill";

type TabKey = "documents" | "team" | "plan" | "tickets" | "analytics";

const TABS: Array<{ key: TabKey; label: string; soon?: boolean }> = [
  { key: "documents", label: "Dokümanlar" },
  { key: "team", label: "Ekip" },
  { key: "plan", label: "Proje Planı" },
  { key: "tickets", label: "Ticket", soon: true },
  { key: "analytics", label: "Analitik", soon: true },
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [tab, setTab] = useState<TabKey>("documents");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => ProjectsApi.get(id),
  });

  if (isLoading || !project) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/projects")}
          style={{ marginLeft: -8, color: "var(--ink-muted)" }}
        >
          Projeler
        </Button>
      </div>

      <div
        className="page-header"
        style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 20, alignItems: "flex-start" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ marginBottom: 6, gap: 8 }}>
            <span className="eyebrow" style={{ margin: 0 }}>
              {project.customerName}
            </span>
            <span className="subtle">·</span>
            <span className="mono subtle" style={{ fontSize: 11 }}>
              {project.code}
            </span>
            <StatusPill status={project.status} />
          </div>
          <h1 className="page-title" style={{ fontSize: 36 }}>
            {project.name}
          </h1>
          {project.description && (
            <p className="page-sub" style={{ marginTop: 10 }}>
              {project.description}
            </p>
          )}
        </div>
        <div className="row">
          <Button size="small" icon={<DownloadOutlined />} disabled title="Yakında">
            Rapor
          </Button>
          <Button size="small" icon={<SettingOutlined />} aria-label="Ayarlar" />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setTab("documents")}
          >
            Doküman
          </Button>
        </div>
      </div>

      {/* Metrik şeridi — sadece backend'de var olan alanlar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
          marginBottom: 24,
        }}
      >
        <MetricCell
          label="Durum"
          value={<StatusPill status={project.status} />}
          sub={`Eklendi: ${new Date(project.createdAt).toLocaleDateString("tr-TR")}`}
          first
        />
        <MetricCell
          label="Doküman"
          value={project.documentCount}
          sub="Bu projedeki dokümanlar"
        />
        <MetricCell
          label="Üye"
          value={project.memberCount}
          sub="Nuevo + Müşteri"
        />
        <MetricCell
          label="Müşteri"
          value={
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
              {project.customerName}
            </span>
          }
          sub={project.code}
        />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            type="button"
            key={t.key}
            className={"tab" + (tab === t.key ? " active" : "") + (t.soon ? " disabled" : "")}
            onClick={() => !t.soon && setTab(t.key)}
          >
            {t.label}
            {t.soon && <span className="soon">Yakında</span>}
          </button>
        ))}
      </div>

      {tab === "documents" && <DocumentsPanel projectId={id} mode="admin" />}
      {tab === "team" && <ProjectMembersPanel projectId={id} />}
      {tab === "plan" && <ProjectPlanPanel projectId={id} mode="admin" />}
      {tab === "tickets" && (
        <ComingSoon title="Ticket" description="Görev ve ticket yönetimi yakında." />
      )}
      {tab === "analytics" && (
        <ComingSoon
          title="Proje Analitiği"
          description="Bütün dokümanların okunma istatistikleri ve müşteri etkileşimi özeti yakında."
        />
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
  first,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  first?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderLeft: first ? "none" : "1px solid var(--border)",
      }}
    >
      <div className="kpi-label" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          lineHeight: 1,
          marginBottom: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="subtle" style={{ fontSize: 11.5 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
