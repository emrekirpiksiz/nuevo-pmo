"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Skeleton } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { ProjectsApi } from "@/lib/apis";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { ProjectPlanPanel } from "@/features/projectPlan/ProjectPlanPanel";
import { StatusPill } from "@/components/StatusPill";

type TabKey = "documents" | "plan";

const TABS: Array<{ key: TabKey; label: string; soon?: boolean }> = [
  { key: "documents", label: "Dokümanlar" },
  { key: "plan", label: "Proje Planı" },
];

export default function CustomerProjectPage() {
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
          onClick={() => router.push("/portal")}
          style={{ marginLeft: -8, color: "var(--ink-muted)" }}
        >
          Projelerim
        </Button>
      </div>

      <div
        className="page-header"
        style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 20, alignItems: "flex-start" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ marginBottom: 6, gap: 8 }}>
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

      {tab === "documents" && <DocumentsPanel projectId={id} mode="customer" />}
      {tab === "plan" && <ProjectPlanPanel projectId={id} mode="customer" />}
    </div>
  );
}
