"use client";

import {
  App as AntdApp,
  Button,
  Input,
  Skeleton,
  Space,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ProjectPlanApi,
  type PlanMilestone,
  type PlanStep,
  type PlanStepLocal,
  type UpsertPlanPayload,
  type UpsertPlanStepInput,
} from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { Kpi, KpiGrid } from "@/components/Kpi";
import { SegTabs } from "@/components/SegTabs";
import { GanttChart, type GanttStepUpdate } from "./GanttChart";
import { PlanListEditor, toLocalSteps } from "./PlanTimeline";
import { MilestonesView } from "./MilestonesView";
import { ReportsList } from "./ReportsList";
import { PlanHistoryView } from "./PlanHistoryView";
import {
  computeOverallProgress,
  formatDate,
  isMilestoneOverdue,
  isStepBehind,
} from "./helpers";

type SubTab = "plan" | "reports" | "history";

export function ProjectPlanPanel({
  projectId,
  mode,
}: {
  projectId: string;
  mode: "admin" | "customer";
}) {
  const qc = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const [sub, setSub] = useState<SubTab>("plan");
  const [draftSteps, setDraftSteps] = useState<PlanStepLocal[] | null>(null);
  const [draftMilestones, setDraftMilestones] = useState<PlanMilestone[] | null>(null);
  const [changeNote, setChangeNote] = useState<string>("");

  const planQuery = useQuery({
    queryKey: ["project-plan", projectId],
    queryFn: () => ProjectPlanApi.getCurrent(projectId),
  });

  useEffect(() => {
    if (planQuery.data && draftSteps === null) {
      setDraftSteps(toLocalSteps(planQuery.data.steps));
      setDraftMilestones(planQuery.data.milestones);
    }
  }, [planQuery.data, draftSteps]);

  const upsertMut = useMutation({
    mutationFn: (payload: UpsertPlanPayload) => ProjectPlanApi.upsert(projectId, payload),
    onSuccess: (data) => {
      message.success("Plan kaydedildi.");
      qc.invalidateQueries({ queryKey: ["project-plan", projectId] });
      qc.invalidateQueries({ queryKey: ["project-plan-history", projectId] });
      setDraftSteps(toLocalSteps(data.steps));
      setDraftMilestones(data.milestones);
      setChangeNote("");
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const serverSteps = planQuery.data?.steps ?? [];
  const localSteps = draftSteps ?? [];
  const milestones = draftMilestones ?? planQuery.data?.milestones ?? [];

  // Gantt için `PlanStep` şeklinde (kalıcı id'si olmayanlar hariç olabilir) adımları hazırla:
  const ganttSteps: PlanStep[] = useMemo(() => {
    if (draftSteps === null) return serverSteps;
    // draft içinde local refKey'leri id'ye çevir; parentStepId'yi parent'ın refKey'inden eşle.
    const refToStable = new Map<string, string>();
    for (const s of draftSteps) refToStable.set(s.refKey, s.id ?? s.refKey);
    return draftSteps.map((s) => ({
      id: s.id ?? s.refKey,
      parentStepId: s.parentRefKey
        ? refToStable.get(s.parentRefKey) ?? null
        : null,
      order: s.order,
      title: s.title,
      description: s.description,
      startYearWeek: s.startYearWeek,
      endYearWeek: s.endYearWeek,
      plannedManDays: s.plannedManDays,
      actualManDays: s.actualManDays,
      progress: s.progress,
      status: s.status,
    }));
  }, [draftSteps, serverSteps]);

  const isDirty = useMemo(() => {
    if (!planQuery.data || draftSteps === null) return false;
    const serverNormalized = JSON.stringify(
      planQuery.data.steps.map(normalizeServerStep)
    );
    const draftNormalized = JSON.stringify(
      draftSteps.map(normalizeLocalStep)
    );
    const msDiff =
      JSON.stringify(milestones) !== JSON.stringify(planQuery.data.milestones);
    return serverNormalized !== draftNormalized || msDiff;
  }, [draftSteps, milestones, planQuery.data]);

  const overall = useMemo(() => computeOverallProgress(ganttSteps), [ganttSteps]);
  const criticalOpen = milestones.filter(
    (m) => m.type === "CriticalPath" && m.status !== "Done"
  ).length;
  const customerPendingOpen = milestones.filter(
    (m) => m.type === "CustomerPending" && m.status !== "Done"
  ).length;
  const overdueMilestones = milestones.filter(isMilestoneOverdue).length;
  const behindSteps = ganttSteps.filter((s) => isStepBehind(s)).length;

  const onSave = () => {
    const invalidStep = localSteps.find((s) => !s.title || !s.title.trim());
    const invalidMilestone = milestones.find((m) => !m.title || !m.title.trim());
    if (invalidStep) {
      message.error("Tüm adımların başlığı olmalı.");
      return;
    }
    if (invalidMilestone) {
      message.error("Tüm milestone'ların başlığı olmalı.");
      return;
    }
    const payload: UpsertPlanPayload = {
      steps: localSteps.map<UpsertPlanStepInput>((s) => ({
        refKey: s.refKey,
        parentRefKey: s.parentRefKey ?? null,
        order: s.order,
        title: s.title,
        description: s.description,
        startYearWeek: s.startYearWeek,
        endYearWeek: s.endYearWeek,
        plannedManDays: s.plannedManDays,
        actualManDays: s.actualManDays,
        progress: s.progress,
        status: s.status,
      })),
      milestones,
      changeNote: changeNote.trim() || null,
    };
    upsertMut.mutate(payload);
  };

  /**
   * Gantt barı sürüklendiğinde/yeniden boyutlandırıldığında çağrılır.
   * Gantt'taki stable id, draft'taki `refKey` ya da `id` ile eşleşir.
   */
  const onGanttStepUpdate = (stepId: string, patch: GanttStepUpdate) => {
    if (draftSteps === null) return;
    setDraftSteps(
      draftSteps.map((s) => {
        const stable = s.id ?? s.refKey;
        if (stable !== stepId) return s;
        const next = { ...s };
        if ("startYearWeek" in patch) next.startYearWeek = patch.startYearWeek ?? null;
        if ("endYearWeek" in patch) next.endYearWeek = patch.endYearWeek ?? null;
        return next;
      })
    );
  };

  const onDiscard = () => {
    modal.confirm({
      title: "Değişiklikleri at?",
      content: "Yapılan düzenlemeler kaybolacak.",
      okText: "Vazgeç",
      cancelText: "Devam et",
      onOk: () => {
        if (planQuery.data) {
          setDraftSteps(toLocalSteps(planQuery.data.steps));
          setDraftMilestones(planQuery.data.milestones);
          setChangeNote("");
        }
      },
    });
  };

  if (planQuery.isLoading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div>
      <KpiGrid columns={5}>
        <Kpi label="Genel İlerleme" value={`%${overall}`} hint={`${ganttSteps.length} adım`} />
        <Kpi
          label="Geride"
          value={behindSteps}
          hint={behindSteps > 0 ? "NOW çizgisinin gerisinde" : "Zamanında"}
        />
        <Kpi
          label="Açık Kritik Yol"
          value={criticalOpen}
          hint="Nuevo sorumluluğunda"
        />
        <Kpi
          label="Müşteriden Beklenen"
          value={customerPendingOpen}
          hint="Açık kalemler"
        />
        <Kpi
          label="Gecikmiş Milestone"
          value={overdueMilestones}
          hint={overdueMilestones > 0 ? "Acil aksiyon" : "Gecikme yok"}
        />
      </KpiGrid>

      <div
        className="row"
        style={{
          marginBottom: 16,
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <SegTabs<SubTab>
          value={sub}
          onChange={setSub}
          items={[
            { key: "plan", label: "Plan", count: ganttSteps.length + milestones.length },
            { key: "reports", label: "Raporlar" },
            { key: "history", label: "Geçmiş" },
          ]}
        />
        <span className="grow" />
        {mode === "admin" && sub === "plan" && (
          <Space size={8} wrap>
            {planQuery.data?.updatedAt && (
              <span className="subtle" style={{ fontSize: 12 }}>
                Son kayıt: {formatDate(planQuery.data.updatedAt)}
                {planQuery.data.updatedByName ? ` · ${planQuery.data.updatedByName}` : ""}
              </span>
            )}
            <Input
              size="small"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Değişiklik notu (opsiyonel)"
              style={{ width: 260 }}
              maxLength={1000}
              disabled={!isDirty}
            />
            <Button size="small" disabled={!isDirty} onClick={onDiscard}>
              Vazgeç
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              onClick={onSave}
              loading={upsertMut.isPending}
              disabled={!isDirty}
            >
              Kaydet
            </Button>
          </Space>
        )}
      </div>

      <div className="plan-main-content">
        {sub === "plan" && (
          <>
            {/* Gantt — always full width */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-head">
                <h3 className="card-title" style={{ fontSize: 16 }}>
                  Plan Gantt
                </h3>
                <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
                  Haftalık görünüm · milestone'lar elmas ile işaretli · NOW çizgisi bugünü gösterir
                </span>
              </div>
              <GanttChart
                steps={ganttSteps}
                milestones={milestones}
                showInternal={mode === "admin"}
                onStepUpdate={mode === "admin" ? onGanttStepUpdate : undefined}
              />
            </div>

            {mode === "admin" ? (
              /* Admin: Steps (left) | Milestones (right) when ≥ 1140px */
              <div className="plan-bottom-grid">
                <div className="card" style={{ padding: 0 }}>
                  <div className="card-head">
                    <h3 className="card-title" style={{ fontSize: 16 }}>
                      Adımlar
                    </h3>
                    <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
                      Alt kırılım eklemek için + butonunu kullanın
                    </span>
                  </div>
                  <div className="card-body">
                    <PlanListEditor
                      steps={localSteps}
                      onChange={(s) => setDraftSteps(s)}
                      showInternal
                    />
                  </div>
                </div>

                {/* Right column: milestone groups stacked */}
                <div className="plan-right-col">
                  <MilestonesView
                    mode="edit"
                    milestones={milestones}
                    onChange={(m) => setDraftMilestones(m)}
                  />
                </div>
              </div>
            ) : (
              /* Customer: milestones side-by-side when wide */
              <div className="plan-milestones-row">
                <MilestonesView mode="read" milestones={milestones} />
              </div>
            )}
          </>
        )}
        {sub === "reports" && <ReportsList projectId={projectId} mode={mode} />}
        {sub === "history" && <PlanHistoryView projectId={projectId} />}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function normalizeServerStep(s: PlanStep) {
  return {
    id: s.id ?? null,
    parentStepId: s.parentStepId ?? null,
    order: s.order,
    title: s.title,
    description: s.description ?? null,
    startYearWeek: s.startYearWeek ?? null,
    endYearWeek: s.endYearWeek ?? null,
    plannedManDays: s.plannedManDays ?? null,
    actualManDays: s.actualManDays ?? null,
    progress: s.progress,
    status: s.status,
  };
}
function normalizeLocalStep(s: PlanStepLocal) {
  return {
    id: s.id ?? null,
    parentStepId: s.parentStepId ?? null,
    order: s.order,
    title: s.title,
    description: s.description ?? null,
    startYearWeek: s.startYearWeek ?? null,
    endYearWeek: s.endYearWeek ?? null,
    plannedManDays: s.plannedManDays ?? null,
    actualManDays: s.actualManDays ?? null,
    progress: s.progress,
    status: s.status,
  };
}
