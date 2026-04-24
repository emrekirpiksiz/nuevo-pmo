"use client";

import { Button, Input, InputNumber, Select } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  PlusOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import type { PlanStep, PlanStepLocal, PlanStepStatus } from "@/lib/apis";
import {
  STEP_STATUS_BAR,
  STEP_STATUS_LABEL,
  STEP_STATUS_PILL,
  isStepBehind,
  nextRefKey,
  parseYearWeek,
} from "./helpers";

// ===== Local editing model helpers =====

export function toLocalSteps(steps: PlanStep[]): PlanStepLocal[] {
  return steps.map((s) => ({
    ...s,
    refKey: s.id ?? nextRefKey(),
    parentRefKey: s.parentStepId ?? null,
  }));
}

/** parent → children (sıralı) gösterim için düz liste üretir. */
function arrangeTree(list: PlanStepLocal[]): PlanStepLocal[] {
  const roots = list.filter((s) => !s.parentRefKey);
  const byParent = new Map<string, PlanStepLocal[]>();
  for (const s of list) {
    if (s.parentRefKey) {
      const arr = byParent.get(s.parentRefKey) ?? [];
      arr.push(s);
      byParent.set(s.parentRefKey, arr);
    }
  }
  const out: PlanStepLocal[] = [];
  const walk = (parent: PlanStepLocal) => {
    out.push(parent);
    const kids = (byParent.get(parent.refKey) ?? []).slice().sort((a, b) => a.order - b.order);
    for (const k of kids) walk(k);
  };
  for (const r of roots.slice().sort((a, b) => a.order - b.order)) walk(r);
  return out;
}

/** `2026-W17` → `H17 · 2026` (kısa, okunaklı). Boşsa null döner. */
function formatYearWeek(v?: string | null): string | null {
  const p = parseYearWeek(v);
  if (!p) return null;
  return `H${p.week} · ${p.year}`;
}

// ===== Week input (year-week picker) =====

function YearWeekInput({
  value,
  onChange,
  style,
  compact,
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const parsed = parseYearWeek(value);
  const htmlValue = parsed
    ? `${parsed.year}-W${String(parsed.week).padStart(2, "0")}`
    : "";
  return (
    <input
      type="week"
      value={htmlValue}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          onChange(null);
          return;
        }
        const m = v.match(/^(\d{4})-W(\d{1,2})$/);
        if (m) {
          onChange(`${m[1]}-W${String(Number(m[2])).padStart(2, "0")}`);
        } else {
          onChange(null);
        }
      }}
      className={"week-input" + (compact ? " compact" : "")}
      style={style}
    />
  );
}

// ===== Editable list with collapsible rows =====

export function PlanListEditor({
  steps,
  onChange,
  showInternal,
}: {
  steps: PlanStepLocal[];
  onChange: (steps: PlanStepLocal[]) => void;
  showInternal: boolean;
}) {
  const arranged = arrangeTree(steps);

  // Genişletilmiş satırların refKey'leri. İlk yükleme daima kapalı; sadece kullanıcı + ile ekleyince yeni satır açılır.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const prevRefKeysRef = useRef<Set<string>>(new Set());
  const hasSeenDataRef = useRef(false);
  useEffect(() => {
    const currentRefKeys = new Set(steps.map((s) => s.refKey));
    // İlk kez non-empty listeyi görene kadar sadece kayıt tut, hiçbir şeyi açma.
    // Bu; başta `steps=[]` → sonra dolu liste → "hepsi yeni" sanılıp auto-expand olmasını engeller.
    if (!hasSeenDataRef.current) {
      prevRefKeysRef.current = currentRefKeys;
      if (currentRefKeys.size > 0) hasSeenDataRef.current = true;
      return;
    }
    // Bundan sonra sadece kullanıcının eklediği yeni satırları aç.
    const added: string[] = [];
    for (const k of currentRefKeys) {
      if (!prevRefKeysRef.current.has(k)) added.push(k);
    }
    if (added.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const k of added) next.add(k);
        return next;
      });
    }
    prevRefKeysRef.current = currentRefKeys;
  }, [steps]);

  const toggle = (refKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(refKey)) next.delete(refKey);
      else next.add(refKey);
      return next;
    });
  };

  const update = (refKey: string, patch: Partial<PlanStepLocal>) => {
    onChange(steps.map((s) => (s.refKey === refKey ? { ...s, ...patch } : s)));
  };

  const remove = (refKey: string) => {
    const children = collectDescendants(steps, refKey);
    const toRemove = new Set<string>([refKey, ...children]);
    const next = steps.filter((s) => !toRemove.has(s.refKey));
    onChange(reorderPeers(next));
  };

  const addRoot = () => {
    const refKey = nextRefKey();
    const rootCount = steps.filter((s) => !s.parentRefKey).length;
    onChange([
      ...steps,
      {
        refKey,
        parentRefKey: null,
        order: rootCount,
        title: "",
        description: null,
        startYearWeek: null,
        endYearWeek: null,
        plannedManDays: null,
        actualManDays: null,
        progress: 0,
        status: "Planned",
      },
    ]);
  };

  const addChild = (parentRefKey: string) => {
    const refKey = nextRefKey();
    const childCount = steps.filter((s) => s.parentRefKey === parentRefKey).length;
    onChange([
      ...steps,
      {
        refKey,
        parentRefKey,
        order: childCount,
        title: "",
        description: null,
        startYearWeek: null,
        endYearWeek: null,
        plannedManDays: null,
        actualManDays: null,
        progress: 0,
        status: "Planned",
      },
    ]);
  };

  const move = (refKey: string, dir: -1 | 1) => {
    const step = steps.find((s) => s.refKey === refKey);
    if (!step) return;
    const peers = steps
      .filter((s) => (s.parentRefKey ?? null) === (step.parentRefKey ?? null))
      .slice()
      .sort((a, b) => a.order - b.order);
    const idx = peers.findIndex((s) => s.refKey === refKey);
    const to = idx + dir;
    if (to < 0 || to >= peers.length) return;
    [peers[idx], peers[to]] = [peers[to], peers[idx]];
    const orderMap = new Map(peers.map((s, i) => [s.refKey, i]));
    onChange(
      steps.map((s) =>
        orderMap.has(s.refKey) ? { ...s, order: orderMap.get(s.refKey)! } : s
      )
    );
  };

  if (arranged.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div className="subtle" style={{ marginBottom: 12 }}>
          Bu projeye henüz bir plan girilmedi.
        </div>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addRoot}>
          İlk Adımı Ekle
        </Button>
      </div>
    );
  }

  return (
    <div className="plan-list">
      {arranged.map((s) => {
        const isChild = !!s.parentRefKey;
        const peers = steps
          .filter((x) => (x.parentRefKey ?? null) === (s.parentRefKey ?? null))
          .sort((a, b) => a.order - b.order);
        const peerIndex = peers.findIndex((x) => x.refKey === s.refKey);
        const behind = isStepBehind(s);
        const isOpen = expanded.has(s.refKey);
        return (
          <div
            key={s.refKey}
            className={
              "plan-row-compact" +
              (isChild ? " is-child" : "") +
              (behind ? " behind" : "")
            }
          >
            {/* --- Line 1: primary controls --- */}
            <div className="plan-row-line">
              {isChild && <span className="plan-row-indent" />}

              <button
                type="button"
                className="plan-row-toggle"
                onClick={() => toggle(s.refKey)}
                aria-label={isOpen ? "Daralt" : "Genişlet"}
              >
                {isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
              </button>

              <span className="plan-row-warn-slot">
                {behind && <WarningFilled title="Adım NOW çizgisinin gerisinde" />}
              </span>

              <Input
                size="small"
                value={s.title}
                onChange={(e) => update(s.refKey, { title: e.target.value })}
                placeholder={isChild ? "Alt adım başlığı" : "Adım başlığı"}
                maxLength={256}
                className="plan-row-title"
                variant="borderless"
              />

              <Select
                size="small"
                value={s.status}
                onChange={(v: PlanStepStatus) => update(s.refKey, { status: v })}
                options={[
                  { value: "Planned", label: "Planlandı" },
                  { value: "InProgress", label: "Sürüyor" },
                  { value: "Done", label: "Tamamlandı" },
                  { value: "Blocked", label: "Bloklu" },
                ]}
                style={{ width: 110 }}
              />

              <div className="plan-row-actions">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  disabled={peerIndex === 0}
                  onClick={() => move(s.refKey, -1)}
                  aria-label="Yukarı"
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  disabled={peerIndex === peers.length - 1}
                  onClick={() => move(s.refKey, 1)}
                  aria-label="Aşağı"
                />
                {!isChild && (
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => addChild(s.refKey)}
                    title="Alt adım ekle"
                  />
                )}
                <Button
                  size="small"
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => remove(s.refKey)}
                  aria-label="Sil"
                />
              </div>
            </div>

            {/* --- Line 2: meta (dates + progress) — always visible, subtle --- */}
            <div className="plan-row-meta">
              <span className="plan-row-meta-label">
                <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
                {formatYearWeek(s.startYearWeek) || <span className="plan-row-meta-empty">—</span>}
                <span className="plan-row-meta-sep">→</span>
                {formatYearWeek(s.endYearWeek) || <span className="plan-row-meta-empty">—</span>}
              </span>
              <div className="bar accent plan-row-bar">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, s.progress))}%`,
                  }}
                />
              </div>
              <InputNumber
                size="small"
                value={s.progress}
                onChange={(v) =>
                  update(s.refKey, {
                    progress: Math.max(0, Math.min(100, Number(v ?? 0))),
                  })
                }
                min={0}
                max={100}
                className="plan-row-pct-input"
                formatter={(v) => `${v}%`}
                parser={(v) => Number((v ?? "").toString().replace("%", ""))}
                variant="borderless"
              />
            </div>

            {/* --- Expanded details --- */}
            {isOpen && (
              <div className={"plan-row-expand" + (isChild ? " is-child" : "")}>
                <div className="plan-row-expand-grid">
                  <label className="plan-field">
                    <span className="plan-field-label">Başlangıç haftası</span>
                    <YearWeekInput
                      value={s.startYearWeek}
                      onChange={(v) => update(s.refKey, { startYearWeek: v })}
                      compact
                    />
                  </label>
                  <label className="plan-field">
                    <span className="plan-field-label">Bitiş haftası</span>
                    <YearWeekInput
                      value={s.endYearWeek}
                      onChange={(v) => update(s.refKey, { endYearWeek: v })}
                      compact
                    />
                  </label>
                  {showInternal && (
                    <>
                      <label className="plan-field">
                        <span className="plan-field-label">
                          Planlanan M/D <span className="subtle">(iç)</span>
                        </span>
                        <InputNumber
                          size="small"
                          value={s.plannedManDays ?? undefined}
                          onChange={(v) =>
                            update(s.refKey, {
                              plannedManDays:
                                v === null || v === undefined ? null : Number(v),
                            })
                          }
                          min={0}
                          max={10000}
                          step={0.5}
                          placeholder="—"
                          style={{ width: "100%" }}
                        />
                      </label>
                      <label className="plan-field">
                        <span className="plan-field-label">
                          Gerçekleşen M/D <span className="subtle">(iç)</span>
                        </span>
                        <InputNumber
                          size="small"
                          value={s.actualManDays ?? undefined}
                          onChange={(v) =>
                            update(s.refKey, {
                              actualManDays:
                                v === null || v === undefined ? null : Number(v),
                            })
                          }
                          min={0}
                          max={10000}
                          step={0.5}
                          placeholder="—"
                          style={{ width: "100%" }}
                        />
                      </label>
                    </>
                  )}
                </div>
                <Input.TextArea
                  value={s.description ?? ""}
                  onChange={(e) =>
                    update(s.refKey, { description: e.target.value || null })
                  }
                  placeholder="Açıklama (opsiyonel)"
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  maxLength={4000}
                  style={{ marginTop: 10 }}
                />
              </div>
            )}
          </div>
        );
      })}
      <div style={{ marginTop: 10 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={addRoot}>
          Yeni ana adım
        </Button>
      </div>
    </div>
  );
}

function collectDescendants(all: PlanStepLocal[], refKey: string): string[] {
  const out: string[] = [];
  const stack = [refKey];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const s of all) {
      if (s.parentRefKey === cur) {
        out.push(s.refKey);
        stack.push(s.refKey);
      }
    }
  }
  return out;
}

function reorderPeers(steps: PlanStepLocal[]): PlanStepLocal[] {
  const byParent = new Map<string | null, PlanStepLocal[]>();
  for (const s of steps) {
    const key = s.parentRefKey ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(s);
    byParent.set(key, arr);
  }
  const next: PlanStepLocal[] = [];
  byParent.forEach((arr) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((s, i) => next.push({ ...s, order: i }));
  });
  return next;
}

// ===== Read-only view used by snapshot drawer =====

export function PlanStepsReadBasic({ steps }: { steps: PlanStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="subtle" style={{ padding: 16, textAlign: "center" }}>
        Bu snapshot'ta adım yok.
      </div>
    );
  }
  const roots = steps.filter((s) => !s.parentStepId).sort((a, b) => a.order - b.order);
  const children = (parentId: string) =>
    steps.filter((s) => s.parentStepId === parentId).sort((a, b) => a.order - b.order);

  const renderRow = (s: PlanStep, depth: number): React.ReactNode[] => {
    const rows: React.ReactNode[] = [
      <ReadRow key={s.id ?? `${depth}-${s.title}`} step={s} depth={depth} />,
    ];
    const kids = s.id ? children(s.id) : [];
    for (const k of kids) rows.push(...renderRow(k, depth + 1));
    return rows;
  };

  return (
    <div className="plan-list plan-list-read">
      {roots.flatMap((r) => renderRow(r, 0))}
    </div>
  );
}

function ReadRow({ step, depth }: { step: PlanStep; depth: number }) {
  const behind = isStepBehind(step);
  return (
    <div
      className={"plan-row-read" + (depth > 0 ? " is-child" : "")}
      style={{ paddingLeft: depth * 28 }}
    >
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div className="grow" style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: depth === 0 ? 500 : 400,
              fontSize: 13.5,
            }}
          >
            {behind && (
              <WarningFilled
                style={{
                  color: "var(--danger)",
                  marginRight: 6,
                  fontSize: 12,
                }}
              />
            )}
            {step.title || <span className="subtle">Başlıksız adım</span>}
          </div>
          {step.description && (
            <div className="subtle" style={{ fontSize: 12, marginTop: 2 }}>
              {step.description}
            </div>
          )}
        </div>
        <span className={STEP_STATUS_PILL[step.status]}>
          {STEP_STATUS_LABEL[step.status]}
        </span>
      </div>
      <div
        className="row"
        style={{ marginTop: 6, gap: 12, fontSize: 12 }}
      >
        <span className="mono subtle">
          {step.startYearWeek ?? "?"} → {step.endYearWeek ?? "?"}
        </span>
        <span className="grow" />
        <span className="mono" style={{ fontSize: 12 }}>
          %{Math.max(0, Math.min(100, step.progress))}
        </span>
      </div>
      <div className={STEP_STATUS_BAR[step.status]} style={{ marginTop: 4 }}>
        <span style={{ width: `${Math.max(0, Math.min(100, step.progress))}%` }} />
      </div>
    </div>
  );
}
