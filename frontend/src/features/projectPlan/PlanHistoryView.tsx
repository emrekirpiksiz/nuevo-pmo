"use client";

import { Button, Drawer, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ProjectPlanApi, type PlanSnapshotSummary } from "@/lib/apis";
import { formatDate } from "./helpers";
import { PlanStepsReadBasic } from "./PlanTimeline";
import { MilestonesView } from "./MilestonesView";

export function PlanHistoryView({ projectId }: { projectId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project-plan-history", projectId],
    queryFn: () => ProjectPlanApi.listHistory(projectId),
  });

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title" style={{ fontSize: 18 }}>
          Plan Geçmişi
        </h2>
        <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
          Her kaydetmede bir snapshot oluşur.
        </span>
      </div>
      {isLoading ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="subtle" style={{ padding: 32, textAlign: "center" }}>
          Henüz bir plan kaydı yapılmamış.
        </div>
      ) : (
        <div style={{ padding: "8px 0" }}>
          {data!.map((s) => (
            <HistoryRow key={s.id} snap={s} onOpen={() => setSelectedId(s.id)} />
          ))}
        </div>
      )}

      <SnapshotDrawer
        projectId={projectId}
        snapshotId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function HistoryRow({ snap, onOpen }: { snap: PlanSnapshotSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "12px 20px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        textAlign: "left",
      }}
      className="snapshot-row"
    >
      <div className="mono" style={{ width: 110, color: "var(--ink-muted)" }}>
        {new Date(snap.createdAt).toLocaleString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "var(--ink)" }}>
          {snap.changeNote ? snap.changeNote : "Plan güncellendi"}
        </div>
        <div className="subtle" style={{ fontSize: 12 }}>
          {snap.createdByName ?? "—"}
        </div>
      </div>
      <div>
        <span className="pill pill-accent">%{snap.overallProgress} ilerleme</span>
      </div>
    </button>
  );
}

function SnapshotDrawer({
  projectId,
  snapshotId,
  onClose,
}: {
  projectId: string;
  snapshotId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["project-plan-snapshot", projectId, snapshotId],
    queryFn: () => ProjectPlanApi.getSnapshot(projectId, snapshotId!),
    enabled: !!snapshotId,
  });

  return (
    <Drawer
      open={!!snapshotId}
      onClose={onClose}
      width={780}
      title={
        data
          ? `Snapshot · ${formatDate(data.createdAt)} · %${data.overallProgress}`
          : "Snapshot"
      }
    >
      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {data.changeNote && (
            <div
              style={{
                padding: "10px 14px",
                borderLeft: "3px solid var(--accent)",
                background: "var(--surface-muted)",
                borderRadius: 4,
              }}
            >
              {data.changeNote}
            </div>
          )}
          <div>
            <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>
              Adımlar
            </h3>
            <PlanStepsReadBasic steps={data.steps} />
          </div>
          <div>
            <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>
              Milestone'lar
            </h3>
            <MilestonesView mode="read" milestones={data.milestones} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
