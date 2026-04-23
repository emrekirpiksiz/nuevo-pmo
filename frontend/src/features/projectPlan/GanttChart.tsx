"use client";

import { Tooltip } from "antd";
import { WarningFilled } from "@ant-design/icons";
import { useMemo, useRef } from "react";
import type { PlanMilestone, PlanStep } from "@/lib/apis";
import {
  currentYearWeek,
  formatDate,
  formatYearWeek,
  isStepBehind,
  parseYearWeek,
  weekIndex,
  weeksBetween,
  yearWeekOfDate,
  MILESTONE_TYPE_LABEL,
  STEP_STATUS_LABEL,
  type YearWeek,
} from "./helpers";

const WEEK_W = 44; // px per week column
const LABEL_W = 280; // sol paneldeki adım adı kolonu genişliği
const ROW_H = 34;

export interface GanttStepUpdate {
  startYearWeek?: string | null;
  endYearWeek?: string | null;
}

/**
 * Hafta bazlı Gantt. Hiyerarşik (parent-children) adımları iki seviye
 * destekler; milestone'lar deadline haftasına elmas olarak konur.
 *
 * Pozisyonlama, `weeks` dizisindeki ordinal indeksten türetilir — yıl sınırı
 * geçişlerinde `year*53+week` hesabının sebep olduğu off-by-X bug'ını önler.
 *
 * `onStepUpdate` verildiğinde (admin), barlar mouse ile sürüklenebilir ve
 * kenar tutamaklarıyla uzatılıp kısaltılabilir.
 */
export function GanttChart({
  steps,
  milestones,
  showInternal,
  onStepUpdate,
}: {
  steps: PlanStep[];
  milestones: PlanMilestone[];
  showInternal: boolean;
  onStepUpdate?: (stepId: string, patch: GanttStepUpdate) => void;
}) {
  const now = currentYearWeek();
  const layout = useMemo(
    () => buildLayout(steps, milestones, now),
    [steps, milestones, now]
  );

  if (!layout.weeks || layout.weeks.length === 0) {
    return (
      <div className="gantt-empty subtle">
        Bu planda henüz takvimli adım veya milestone yok. Adımlara başlangıç/bitiş haftası eklenince Gantt burada görünecek.
      </div>
    );
  }

  const { weeks, flatRows, weekOrdinal, nowOrdinal } = layout;
  const totalWidth = weeks.length * WEEK_W;

  return (
    <div className="gantt-wrap">
      <div className="gantt-scroll">
        <div className="gantt-grid" style={{ width: LABEL_W + totalWidth }}>
          {/* Header */}
          <div
            className="gantt-head"
            style={{ gridTemplateColumns: `${LABEL_W}px ${totalWidth}px` }}
          >
            <div className="gantt-head-label">Adım / Milestone</div>
            <div className="gantt-head-weeks" style={{ width: totalWidth }}>
              <div className="gantt-year-row" style={{ width: totalWidth }}>
                {renderYearBands(weeks)}
              </div>
              <div className="gantt-week-row" style={{ width: totalWidth }}>
                {weeks.map((w) => {
                  const isNow =
                    w.year === now.year && w.week === now.week;
                  return (
                    <div
                      key={`${w.year}-${w.week}`}
                      className={
                        "gantt-week-cell" + (isNow ? " current" : "")
                      }
                      style={{ width: WEEK_W }}
                      title={formatYearWeek(w)}
                    >
                      W{String(w.week).padStart(2, "0")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div
            className="gantt-body"
            style={{ gridTemplateColumns: `${LABEL_W}px ${totalWidth}px` }}
          >
            <div className="gantt-labels">
              {flatRows.map((r) => (
                <RowLabel key={r.key} row={r} showInternal={showInternal} />
              ))}
            </div>
            <div
              className="gantt-bars"
              style={{ width: totalWidth, height: flatRows.length * ROW_H }}
            >
              <div
                className="gantt-week-bg"
                style={{
                  width: totalWidth,
                  height: flatRows.length * ROW_H,
                }}
              >
                {weeks.map((w, i) => {
                  const isNow =
                    w.year === now.year && w.week === now.week;
                  return (
                    <div
                      key={i}
                      className={
                        "gantt-week-col" + (isNow ? " current" : "")
                      }
                      style={{
                        left: i * WEEK_W,
                        width: WEEK_W,
                        height: flatRows.length * ROW_H,
                      }}
                    />
                  );
                })}
              </div>

              {flatRows.map((r, rowIdx) =>
                r.kind === "step" ? (
                  <StepBar
                    key={r.key}
                    row={r}
                    rowIdx={rowIdx}
                    weeks={weeks}
                    weekOrdinal={weekOrdinal}
                    onStepUpdate={onStepUpdate}
                  />
                ) : (
                  <MilestoneMark
                    key={r.key}
                    row={r}
                    rowIdx={rowIdx}
                  />
                )
              )}

              {/* NOW line */}
              {nowOrdinal !== null && (
                <div
                  className="gantt-now"
                  style={{
                    left: nowOrdinal * WEEK_W + WEEK_W / 2 - 1,
                    height: flatRows.length * ROW_H,
                  }}
                >
                  <div className="gantt-now-label">NOW</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <GanttLegend showInternal={showInternal} isEditable={!!onStepUpdate} />
    </div>
  );
}

// ---------- Layout ----------

type Row =
  | {
      kind: "step";
      key: string;
      stepId: string;
      depth: number;
      step: PlanStep;
      /** Ordinal start index in the `weeks` array, or null if no start. */
      startOrd: number | null;
      /** Ordinal end index in the `weeks` array, or null if no end. */
      endOrd: number | null;
      behind: boolean;
      invalidRange: boolean;
    }
  | {
      kind: "milestone";
      key: string;
      depth: number;
      milestone: PlanMilestone;
      atOrd: number | null;
    };

interface Layout {
  weeks: YearWeek[];
  weekOrdinal: Map<string, number>;
  flatRows: Row[];
  nowOrdinal: number | null;
}

/**
 * Aralık uçlarını garanti altına almak için kullanılan marjinler. Aralık her
 * durumda NOW'dan en az `WEEKS_BEFORE_NOW` geri, veri uç noktasından en az
 * `WEEKS_AFTER_MAX` ileri olacak şekilde genişletilir. Böylece kullanıcı,
 * planın bitişine geldiğinde bile barı sağa doğru sürükleyip yeni haftalara
 * taşıyabilir.
 */
const WEEKS_BEFORE_NOW = 8;
const WEEKS_AFTER_MAX = 52;
const MAX_WEEKS_CAP = 260; // 5 yıl

function buildLayout(
  steps: PlanStep[],
  milestones: PlanMilestone[],
  now: YearWeek
): Layout {
  // 1) Tüm yıl-haftaları topla (adımlar + milestone deadline haftaları).
  const anchorWeeks: YearWeek[] = [];
  const pushYw = (yw?: string | null) => {
    const p = parseYearWeek(yw);
    if (p) anchorWeeks.push(p);
  };
  for (const s of steps) {
    pushYw(s.startYearWeek);
    pushYw(s.endYearWeek);
  }
  for (const m of milestones) {
    const yw = yearWeekOfDate(m.deadline);
    if (yw) anchorWeeks.push(yw);
  }

  // Boş plan + boş milestone durumunda bile ~1 yıllık bir görünüm aç.
  anchorWeeks.push(now);

  anchorWeeks.sort((a, b) => weekIndex(a) - weekIndex(b));
  const dataMin = anchorWeeks[0];
  const dataMax = anchorWeeks[anchorWeeks.length - 1];

  // 2) Garantili marjinleri uygula: min = min(dataMin, now - N), max = max(dataMax, now + M).
  const nowMinusMargin = addWeeks(now, -WEEKS_BEFORE_NOW);
  const nowPlusMargin = addWeeks(now, WEEKS_AFTER_MAX);
  const minWeek =
    weekIndex(dataMin) < weekIndex(nowMinusMargin) ? dataMin : nowMinusMargin;
  const maxWeek =
    weekIndex(dataMax) > weekIndex(nowPlusMargin) ? dataMax : nowPlusMargin;

  // 3) minWeek'ten maxWeek'e kadar contiguous haftaları ISO aritmetiğiyle üret.
  const rawWeeks = weeksBetween(minWeek, maxWeek);
  const weeks =
    rawWeeks.length > MAX_WEEKS_CAP ? rawWeeks.slice(0, MAX_WEEKS_CAP) : rawWeeks;

  // 4) Ordinal eşleme.
  const weekOrdinal = new Map<string, number>();
  weeks.forEach((w, i) => {
    weekOrdinal.set(formatYearWeek(w), i);
  });

  const ordOf = (yw: YearWeek | null): number | null => {
    if (!yw) return null;
    return weekOrdinal.get(formatYearWeek(yw)) ?? null;
  };

  // 5) Adım hiyerarşisi.
  const childrenByParent = new Map<string, PlanStep[]>();
  for (const s of steps) {
    if (s.parentStepId) {
      const arr = childrenByParent.get(s.parentStepId) ?? [];
      arr.push(s);
      childrenByParent.set(s.parentStepId, arr);
    }
  }

  // 6) Her adım için "union" aralığı: kendi ± tüm alt-adımların birleşimi.
  //    Parent barları çocuklarını görsel olarak kapsasın diye kullanılır.
  //    Leaf step'lerde union == own.
  const unionByKey = new Map<string, { start: YearWeek | null; end: YearWeek | null }>();
  const unionOf = (s: PlanStep): { start: YearWeek | null; end: YearWeek | null } => {
    const cacheKey = s.id ?? `${s.order}-${s.title}`;
    if (unionByKey.has(cacheKey)) return unionByKey.get(cacheKey)!;
    let start = parseYearWeek(s.startYearWeek);
    let end = parseYearWeek(s.endYearWeek);
    const kids = s.id ? childrenByParent.get(s.id) ?? [] : [];
    for (const c of kids) {
      const u = unionOf(c);
      if (u.start && (!start || weekIndex(u.start) < weekIndex(start))) {
        start = u.start;
      }
      if (u.end && (!end || weekIndex(u.end) > weekIndex(end))) {
        end = u.end;
      }
    }
    // Tek yönlü bilgi varsa eksik ucu diğeri ile doldur (bar çizimi için).
    if (start && !end) end = start;
    if (end && !start) start = end;
    const res = { start, end };
    unionByKey.set(cacheKey, res);
    return res;
  };

  const roots = steps
    .filter((s) => !s.parentStepId)
    .slice()
    .sort((a, b) => a.order - b.order);

  const rows: Row[] = [];
  const pushStep = (s: PlanStep, depth: number) => {
    const own = {
      start: parseYearWeek(s.startYearWeek),
      end: parseYearWeek(s.endYearWeek),
    };
    const union = unionOf(s);
    const startOrd = ordOf(union.start);
    const endOrd = ordOf(union.end);
    const invalidRange =
      own.start != null &&
      own.end != null &&
      weekIndex(own.start) > weekIndex(own.end);
    rows.push({
      kind: "step",
      key: s.id ?? `${depth}-${s.order}-${s.title}`,
      stepId: s.id ?? "",
      depth,
      step: s,
      startOrd,
      endOrd,
      behind: isStepBehind(s, now),
      invalidRange,
    });
    const kids = (s.id ? childrenByParent.get(s.id) ?? [] : [])
      .slice()
      .sort((a, b) => a.order - b.order);
    for (const c of kids) pushStep(c, depth + 1);
  };
  for (const r of roots) pushStep(r, 0);

  // 5) Milestone'lar (plan satırlarının altına).
  const msSorted = [...milestones].sort((a, b) => {
    if (a.type !== b.type) return a.type === "CriticalPath" ? -1 : 1;
    const da = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
  for (const m of msSorted) {
    const yw = yearWeekOfDate(m.deadline);
    rows.push({
      kind: "milestone",
      key: m.id ?? `m-${m.title}`,
      depth: 0,
      milestone: m,
      atOrd: ordOf(yw),
    });
  }

  const nowOrdinal = ordOf(now);

  return { weeks, weekOrdinal, flatRows: rows, nowOrdinal };
}

function addWeeks(yw: YearWeek, n: number): YearWeek {
  const m = mondayOfYw(yw);
  m.setUTCDate(m.getUTCDate() + n * 7);
  return toYw(m);
}

function mondayOfYw(yw: YearWeek): Date {
  const jan4 = new Date(Date.UTC(yw.year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (yw.week - 1) * 7);
  return monday;
}

function toYw(d: Date): YearWeek {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstMonday.getUTCDate() - firstThursdayDay);
  const diffMs = target.getTime() - firstMonday.getTime();
  const week = 1 + Math.round(diffMs / (7 * 24 * 3600 * 1000));
  return { year: target.getUTCFullYear(), week };
}

function renderYearBands(weeks: YearWeek[]) {
  const bands: Array<{ year: number; width: number }> = [];
  let i = 0;
  while (i < weeks.length) {
    const y = weeks[i].year;
    let count = 0;
    while (i < weeks.length && weeks[i].year === y) {
      count++;
      i++;
    }
    bands.push({ year: y, width: count * WEEK_W });
  }
  return bands.map((b, idx) => (
    <div key={idx} className="gantt-year-band" style={{ width: b.width }}>
      {b.year}
    </div>
  ));
}

// ---------- Sub-components ----------

function RowLabel({ row, showInternal }: { row: Row; showInternal: boolean }) {
  if (row.kind === "step") {
    const s = row.step;
    const pad = row.depth * 14;
    return (
      <div className="gantt-row-label" style={{ paddingLeft: 10 + pad }}>
        {(row.behind || row.invalidRange) && (
          <Tooltip
            title={
              row.invalidRange
                ? "Başlangıç bitişten büyük — tarih aralığı hatalı."
                : "Adım, NOW çizgisinin gerisinde."
            }
          >
            <WarningFilled
              style={{
                color: "var(--danger)",
                marginRight: 6,
                fontSize: 12,
              }}
            />
          </Tooltip>
        )}
        <span
          className={row.depth > 0 ? "subtle" : ""}
          style={{
            fontWeight: row.depth === 0 ? 500 : 400,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={s.title}
        >
          {s.title || <i>(başlıksız)</i>}
        </span>
        <span className="grow" />
        <span className="mono subtle" style={{ fontSize: 11 }}>
          %{s.progress}
        </span>
        {showInternal &&
          (s.plannedManDays != null || s.actualManDays != null) && (
            <span
              className="mono subtle"
              style={{ fontSize: 10, marginLeft: 8 }}
              title="Planlanan / Gerçekleşen adam-gün"
            >
              {formatMd(s.plannedManDays)}/{formatMd(s.actualManDays)}
            </span>
          )}
      </div>
    );
  }
  const m = row.milestone;
  return (
    <div className="gantt-row-label gantt-row-milestone">
      <span
        className={
          "gantt-ms-dot " +
          (m.type === "CriticalPath" ? "critical" : "customer")
        }
      />
      <span
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: 12.5,
        }}
        title={m.title}
      >
        {m.title}
      </span>
      <span className="grow" />
      <span className="mono subtle" style={{ fontSize: 11 }}>
        {m.deadline ? formatDate(m.deadline) : "—"}
      </span>
    </div>
  );
}

function formatMd(v?: number | null): string {
  if (v == null) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

type DragMode = "move" | "left" | "right";

function StepBar({
  row,
  rowIdx,
  weeks,
  weekOrdinal,
  onStepUpdate,
}: {
  row: Extract<Row, { kind: "step" }>;
  rowIdx: number;
  weeks: YearWeek[];
  weekOrdinal: Map<string, number>;
  onStepUpdate?: (stepId: string, patch: GanttStepUpdate) => void;
}) {
  const s = row.step;
  void weekOrdinal;

  // Takvimi olmayan adım — bar çizme.
  if (row.startOrd === null && row.endOrd === null) return null;

  // Geçersiz aralıkta (start > end) bar çizilmez; ikaz RowLabel'da gösteriliyor.
  if (row.invalidRange) return null;

  const startOrd = row.startOrd ?? row.endOrd!;
  const endOrd = row.endOrd ?? row.startOrd!;
  const left = startOrd * WEEK_W + 2;
  const width = Math.max(WEEK_W / 2, (endOrd - startOrd + 1) * WEEK_W - 4);
  const top = rowIdx * ROW_H + 6;

  const barClass =
    s.status === "Done"
      ? "gantt-bar done"
      : s.status === "Blocked"
      ? "gantt-bar blocked"
      : s.status === "InProgress"
      ? "gantt-bar active"
      : "gantt-bar planned";

  const canEdit = !!onStepUpdate && !!row.stepId;
  const dragStateRef = useRef<{
    mode: DragMode;
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const beginDrag = (mode: DragMode) => (e: React.MouseEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = {
      mode,
      startX: e.clientX,
      origStart: startOrd,
      origEnd: endOrd,
    };
    document.body.style.cursor =
      mode === "move" ? "grabbing" : "ew-resize";

    const onMove = (ev: MouseEvent) => {
      const st = dragStateRef.current;
      if (!st) return;
      const dx = ev.clientX - st.startX;
      const deltaWeeks = Math.round(dx / WEEK_W);
      let newStart = st.origStart;
      let newEnd = st.origEnd;
      if (st.mode === "move") {
        newStart = clamp(st.origStart + deltaWeeks, 0, weeks.length - 1);
        newEnd = clamp(st.origEnd + deltaWeeks, 0, weeks.length - 1);
        // Toplam genişliği koru:
        if (newEnd < newStart) newEnd = newStart;
      } else if (st.mode === "left") {
        newStart = clamp(st.origStart + deltaWeeks, 0, st.origEnd);
      } else {
        newEnd = clamp(st.origEnd + deltaWeeks, st.origStart, weeks.length - 1);
      }
      const newStartYw = weeks[newStart];
      const newEndYw = weeks[newEnd];
      if (!newStartYw || !newEndYw) return;
      const patch: GanttStepUpdate = {};
      const oldStartYw = formatYearWeek(weeks[startOrd]);
      const oldEndYw = formatYearWeek(weeks[endOrd]);
      const newStartStr = formatYearWeek(newStartYw);
      const newEndStr = formatYearWeek(newEndYw);
      if (newStartStr !== oldStartYw) patch.startYearWeek = newStartStr;
      if (newEndStr !== oldEndYw) patch.endYearWeek = newEndStr;
      if (Object.keys(patch).length > 0) {
        onStepUpdate?.(row.stepId, patch);
      }
    };
    const onUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const wrappedTip = (
    <div>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.title}</div>
      <div>Durum: {STEP_STATUS_LABEL[s.status]}</div>
      <div>
        Aralık: {s.startYearWeek ?? "?"} → {s.endYearWeek ?? "?"}
      </div>
      <div>İlerleme: %{s.progress}</div>
      {canEdit && (
        <div className="subtle" style={{ fontSize: 11, marginTop: 4 }}>
          Sürükle: taşı · Kenardan çek: uzat/kısalt
        </div>
      )}
    </div>
  );

  return (
    <Tooltip title={wrappedTip}>
      <div
        className={
          barClass +
          (row.behind ? " behind" : "") +
          (canEdit ? " editable" : "")
        }
        style={{
          left,
          width,
          top,
          height: ROW_H - 12,
          cursor: canEdit ? "grab" : "default",
        }}
        onMouseDown={canEdit ? beginDrag("move") : undefined}
      >
        <div
          className="gantt-bar-fill"
          style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }}
        />
        {row.behind && (
          <WarningFilled className="gantt-bar-warn" aria-label="Geride" />
        )}
        {canEdit && (
          <>
            <div
              className="gantt-bar-handle left"
              onMouseDown={beginDrag("left")}
              role="slider"
              aria-label="Başlangıcı sürükle"
            />
            <div
              className="gantt-bar-handle right"
              onMouseDown={beginDrag("right")}
              role="slider"
              aria-label="Bitişi sürükle"
            />
          </>
        )}
      </div>
    </Tooltip>
  );
}

function clamp(v: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, v));
}

function MilestoneMark({
  row,
  rowIdx,
}: {
  row: Extract<Row, { kind: "milestone" }>;
  rowIdx: number;
}) {
  const m = row.milestone;
  if (row.atOrd === null) return null;
  const left = row.atOrd * WEEK_W + WEEK_W / 2 - 8;
  const top = rowIdx * ROW_H + ROW_H / 2 - 8;
  const cls =
    "gantt-ms " +
    (m.type === "CriticalPath" ? "critical " : "customer ") +
    (m.status === "Done" ? "done " : "");
  return (
    <Tooltip
      title={
        <div>
          <div style={{ fontWeight: 500, marginBottom: 2 }}>{m.title}</div>
          <div>{MILESTONE_TYPE_LABEL[m.type]}</div>
          <div>Deadline: {formatDate(m.deadline)}</div>
        </div>
      }
    >
      <div className={cls} style={{ left, top }} />
    </Tooltip>
  );
}

function GanttLegend({
  showInternal,
  isEditable,
}: {
  showInternal: boolean;
  isEditable: boolean;
}) {
  return (
    <div className="gantt-legend subtle" style={{ fontSize: 11 }}>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-bar planned mini" /> Planlandı
      </span>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-bar active mini" /> Sürüyor
      </span>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-bar done mini" /> Tamamlandı
      </span>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-bar blocked mini" /> Bloklu
      </span>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-ms critical mini" /> Kritik Yol
      </span>
      <span className="row" style={{ gap: 4 }}>
        <span className="gantt-ms customer mini" /> Müşteri-bekleyen
      </span>
      <span className="row" style={{ gap: 4 }}>
        <WarningFilled style={{ color: "var(--danger)" }} /> Geride / gecikmiş
      </span>
      {isEditable && (
        <span className="row subtle" style={{ gap: 4 }}>
          Bar: sürükle-taşı · Kenar: uzat/kısalt
        </span>
      )}
      {showInternal && (
        <span className="row subtle" style={{ gap: 4 }}>
          <span className="mono">M/D</span>: Planlanan/Gerçekleşen adam-gün (iç takip)
        </span>
      )}
    </div>
  );
}
