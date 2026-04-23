"use client";

import { Button, Input, Select } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { PlanMilestone, PlanMilestoneStatus, PlanMilestoneType } from "@/lib/apis";
import {
  MILESTONE_STATUS_LABEL,
  MILESTONE_TYPE_LABEL,
  formatDate,
  isMilestoneOverdue,
} from "./helpers";

function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return "";
  }
}
function fromDateInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function createEmptyMilestone(type: PlanMilestoneType, orderIndex: number): PlanMilestone {
  return {
    order: orderIndex,
    title: "",
    description: null,
    type,
    status: "Pending",
    deadline: null,
    completedAt: null,
  };
}

interface ReadProps {
  mode: "read";
  milestones: PlanMilestone[];
}

interface EditProps {
  mode: "edit";
  milestones: PlanMilestone[];
  onChange: (milestones: PlanMilestone[]) => void;
}

type Props = ReadProps | EditProps;

export function MilestonesView(props: Props) {
  const groups: Array<{ type: PlanMilestoneType; title: string; hint: string }> = [
    {
      type: "CriticalPath",
      title: "Kritik Yol",
      hint: "Nuevo'nun sorumluluğunda olan, gecikirse projeyi geciktirecek kalemler.",
    },
    {
      type: "CustomerPending",
      title: "Müşteriden Beklenenler",
      hint: "Müşteri tarafında aksiyon bekleyen, deadline'lı kalemler.",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {groups.map((g) => (
        <MilestoneGroup
          key={g.type}
          type={g.type}
          title={g.title}
          hint={g.hint}
          items={props.milestones.filter((m) => m.type === g.type)}
          editable={props.mode === "edit"}
          onChange={
            props.mode === "edit"
              ? (items) => {
                  const others = props.milestones.filter((m) => m.type !== g.type);
                  (props as EditProps).onChange(
                    [...others, ...items].map((m, i) => ({ ...m, order: m.order }))
                  );
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function MilestoneGroup({
  type,
  title,
  hint,
  items,
  editable,
  onChange,
}: {
  type: PlanMilestoneType;
  title: string;
  hint: string;
  items: PlanMilestone[];
  editable: boolean;
  onChange?: (items: PlanMilestone[]) => void;
}) {
  const sorted = [...items].sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    if (ao !== bo) return ao - bo;
    const ad = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  const update = (idx: number, patch: Partial<PlanMilestone>) => {
    if (!onChange) return;
    const next = sorted.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (!onChange) return;
    const to = idx + dir;
    if (to < 0 || to >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next.map((m, i) => ({ ...m, order: i })));
  };

  const remove = (idx: number) => {
    if (!onChange) return;
    onChange(sorted.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i })));
  };

  const add = () => {
    if (!onChange) return;
    onChange([...sorted, createEmptyMilestone(type, sorted.length)]);
  };

  const openCount = sorted.filter((m) => m.status !== "Done").length;
  const overdueCount = sorted.filter(isMilestoneOverdue).length;

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title" style={{ fontSize: 16 }}>{title}</h3>
        <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
          {sorted.length} kalem · {openCount} açık
          {overdueCount > 0 && <> · <span style={{ color: "var(--danger)" }}>{overdueCount} gecikmiş</span></>}
        </span>
        {editable && (
          <div style={{ marginLeft: "auto" }}>
            <Button size="small" icon={<PlusOutlined />} onClick={add}>
              Ekle
            </Button>
          </div>
        )}
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        {sorted.length === 0 ? (
          <div className="subtle" style={{ padding: 12, textAlign: "center" }}>
            {hint}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sorted.map((m, idx) =>
              editable ? (
                <MilestoneEditor
                  key={m.id ?? `new-${idx}`}
                  milestone={m}
                  index={idx}
                  total={sorted.length}
                  onChange={(patch) => update(idx, patch)}
                  onMove={(dir) => move(idx, dir)}
                  onRemove={() => remove(idx)}
                />
              ) : (
                <MilestoneRead key={m.id ?? idx} milestone={m} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneRead({ milestone: m }: { milestone: PlanMilestone }) {
  const overdue = isMilestoneOverdue(m);
  const pillClass =
    m.status === "Done"
      ? "pill pill-ok"
      : overdue
      ? "pill pill-danger"
      : m.type === "CustomerPending"
      ? "pill pill-warn"
      : "pill pill-accent";

  return (
    <div
      className="row"
      style={{
        gap: 12,
        padding: "10px 12px",
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: m.status === "Done" ? "var(--surface-muted)" : "var(--surface)",
      }}
    >
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "var(--ink)" }}>
          {m.title || <span className="subtle">Başlıksız</span>}
        </div>
        {m.description && (
          <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
            {m.description}
          </div>
        )}
      </div>
      <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
        <span className={pillClass}>
          {overdue && m.status !== "Done" ? "Gecikti" : MILESTONE_STATUS_LABEL[m.status]}
        </span>
        <span className="mono subtle" style={{ fontSize: 11 }}>
          {m.deadline ? `Deadline: ${formatDate(m.deadline)}` : "Deadline yok"}
        </span>
      </div>
    </div>
  );
}

function MilestoneEditor({
  milestone: m,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  milestone: PlanMilestone;
  index: number;
  total: number;
  onChange: (patch: Partial<PlanMilestone>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="milestone-editor">
      <div className="milestone-editor-line">
        <Input
          size="small"
          value={m.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Başlık"
          maxLength={256}
          className="grow"
        />
        <Select
          size="small"
          value={m.status}
          onChange={(v: PlanMilestoneStatus) =>
            onChange({
              status: v,
              completedAt: v === "Done" ? new Date().toISOString() : null,
            })
          }
          options={[
            { value: "Pending", label: "Beklemede" },
            { value: "Done", label: "Tamamlandı" },
          ]}
          style={{ width: 130 }}
        />
        <Input
          size="small"
          type="date"
          value={toDateInput(m.deadline)}
          onChange={(e) => onChange({ deadline: fromDateInput(e.target.value) })}
          style={{ width: 148 }}
          title="Deadline"
        />
        <Button
          size="small"
          type="text"
          icon={<ArrowUpOutlined />}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label="Yukarı"
        />
        <Button
          size="small"
          type="text"
          icon={<ArrowDownOutlined />}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          aria-label="Aşağı"
        />
        <Button
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          danger
          onClick={onRemove}
          aria-label="Sil"
        />
      </div>
      {m.description != null || m.title ? (
        <Input.TextArea
          value={m.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || null })}
          placeholder="Açıklama (opsiyonel)"
          autoSize={{ minRows: 1, maxRows: 3 }}
          maxLength={4000}
          style={{ marginTop: 6 }}
        />
      ) : null}
    </div>
  );
}
