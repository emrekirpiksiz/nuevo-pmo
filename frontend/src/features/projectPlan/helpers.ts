import type {
  PlanMilestone,
  PlanMilestoneStatus,
  PlanMilestoneType,
  PlanStep,
  PlanStepStatus,
} from "@/lib/apis";

export const STEP_STATUS_LABEL: Record<PlanStepStatus, string> = {
  Planned: "Planlandı",
  InProgress: "Sürüyor",
  Done: "Tamamlandı",
  Blocked: "Bloklu",
};

export const STEP_STATUS_PILL: Record<PlanStepStatus, string> = {
  Planned: "pill pill-neutral",
  InProgress: "pill pill-info",
  Done: "pill pill-ok",
  Blocked: "pill pill-danger",
};

export const STEP_STATUS_BAR: Record<PlanStepStatus, string> = {
  Planned: "bar",
  InProgress: "bar accent",
  Done: "bar sage",
  Blocked: "bar danger",
};

export const MILESTONE_TYPE_LABEL: Record<PlanMilestoneType, string> = {
  CriticalPath: "Kritik Yol",
  CustomerPending: "Müşteriden Beklenen",
};

export const MILESTONE_STATUS_LABEL: Record<PlanMilestoneStatus, string> = {
  Pending: "Beklemede",
  Done: "Tamamlandı",
};

/**
 * Backend ile aynı formül: leaf (alt kırılımı olmayan) adımların Progress
 * ortalaması (0..100). Adım yoksa 0 döner.
 */
export function computeOverallProgress(steps: PlanStep[]): number {
  if (!steps || steps.length === 0) return 0;
  const parentIds = new Set(
    steps.filter((s) => s.parentStepId).map((s) => s.parentStepId!)
  );
  const leaves = steps.filter((s) => !s.id || !parentIds.has(s.id));
  const list = leaves.length > 0 ? leaves : steps;
  const total = list.reduce(
    (a, s) => a + Math.max(0, Math.min(100, s.progress)),
    0
  );
  return Math.round(total / list.length);
}

export function isMilestoneOverdue(m: PlanMilestone): boolean {
  if (m.status === "Done" || !m.deadline) return false;
  return new Date(m.deadline).getTime() < Date.now();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return "—";
  }
}

// ===== ISO Year-Week utils =====

export interface YearWeek {
  year: number;
  week: number;
}

/** `2025-W12` → { year: 2025, week: 12 }. Geçersizse null. */
export function parseYearWeek(v?: string | null): YearWeek | null {
  if (!v) return null;
  const m = v.trim().toUpperCase().match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return null;
  if (week < 1 || week > 53) return null;
  return { year, week };
}

export function formatYearWeek(yw: YearWeek | null | undefined): string {
  if (!yw) return "";
  return `${yw.year}-W${String(yw.week).padStart(2, "0")}`;
}

/** ISO 8601: Belirli bir tarihin (UTC) ait olduğu yıl ve hafta. */
export function toYearWeek(d: Date): YearWeek {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // ISO: Pazartesi 1..Pazar 7; hedefin Perşembesine kay.
  const dayNum = (target.getUTCDay() + 6) % 7; // 0..6 (Pzt..Paz)
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstMonday.getUTCDate() - firstThursdayDay);
  const diffMs = target.getTime() - firstMonday.getTime();
  const week = 1 + Math.round(diffMs / (7 * 24 * 3600 * 1000));
  return { year: target.getUTCFullYear(), week };
}

/** ISO yıl-hafta için Pazartesi tarihini (UTC) döndürür. */
export function mondayOfYearWeek(yw: YearWeek): Date {
  const jan4 = new Date(Date.UTC(yw.year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (yw.week - 1) * 7);
  return monday;
}

/** Lineer bir indekse çevir: yw1 < yw2 olsun diye kıyaslanabilir sayı döndürür. */
export function weekIndex(yw: YearWeek): number {
  return yw.year * 53 + yw.week;
}

/** yw <= target sağlanıyor mu? null'lar false. */
export function weekLe(a: YearWeek | null, b: YearWeek | null): boolean {
  if (!a || !b) return false;
  return weekIndex(a) <= weekIndex(b);
}

/** İki hafta arasındaki (a..b dahil) haftaları sırayla üretir. */
export function weeksBetween(a: YearWeek, b: YearWeek): YearWeek[] {
  const result: YearWeek[] = [];
  let cur = { ...a };
  let guard = 0;
  while (weekIndex(cur) <= weekIndex(b) && guard < 300) {
    result.push({ ...cur });
    cur = nextWeek(cur);
    guard++;
  }
  return result;
}

export function nextWeek(yw: YearWeek): YearWeek {
  const next = new Date(mondayOfYearWeek(yw));
  next.setUTCDate(next.getUTCDate() + 7);
  return toYearWeek(next);
}

export function currentYearWeek(): YearWeek {
  return toYearWeek(new Date());
}

/** Deadline ISO tarihi için ait olduğu yıl-hafta. */
export function yearWeekOfDate(iso?: string | null): YearWeek | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return toYearWeek(d);
  } catch {
    return null;
  }
}

/**
 * Bir adımın "geride kalmış" olup olmadığını NOW çizgisine göre hesaplar:
 * - EndYearWeek geçmişte ise ve status !== Done → geride.
 * - StartYearWeek geçmişte ise ve status === Planned (başlamadı) → geride.
 */
export function isStepBehind(step: PlanStep, now: YearWeek = currentYearWeek()): boolean {
  if (step.status === "Done") return false;
  const end = parseYearWeek(step.endYearWeek);
  if (end && weekIndex(end) < weekIndex(now)) return true;
  const start = parseYearWeek(step.startYearWeek);
  if (start && weekIndex(start) < weekIndex(now) && step.status === "Planned") return true;
  return false;
}

// ===== helpers for new-step creation =====

let refKeyCounter = 0;
export function nextRefKey(): string {
  refKeyCounter++;
  return `n-${Date.now().toString(36)}-${refKeyCounter}`;
}
