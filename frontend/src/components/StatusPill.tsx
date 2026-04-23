"use client";

import { ProjectStatus } from "@/lib/apis";

const LABEL: Record<ProjectStatus, string> = {
  Active: "Aktif",
  OnHold: "Beklemede",
  Completed: "Tamamlandı",
  Cancelled: "İptal",
};

const PILL: Record<ProjectStatus, string> = {
  Active: "pill pill-ok",
  OnHold: "pill pill-warn",
  Completed: "pill pill-info",
  Cancelled: "pill pill-danger",
};

const DOT: Record<ProjectStatus, string> = {
  Active: "dot dot-ok",
  OnHold: "dot dot-warn",
  Completed: "dot dot-info",
  Cancelled: "dot dot-danger",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span className={PILL[status]}>
      <span className={DOT[status]} />
      {LABEL[status]}
    </span>
  );
}
