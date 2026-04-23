"use client";

import {
  App as AntdApp,
  Button,
  Drawer,
  Input,
  InputNumber,
  Skeleton,
  Space,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import {
  ProjectReportsApi,
  type CreateReportPayload,
  type ProjectReportDetail,
  type WeeklyReportTemplate,
} from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { formatDate } from "./helpers";

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

/**
 * Rapor gövdesini minimum MVP olarak markdown + basit metadata ile saklıyoruz.
 * Backend tarafı `ContentJson` alanını jsonb olarak tutuyor; UI ise
 * `{"markdown": "..."}` objesi yazıyor. İleride TipTap tabanlı zengin
 * editörle değiştirilebilir.
 */
interface ReportBody {
  markdown: string;
}

function parseBody(content: unknown | null | undefined): ReportBody {
  if (!content) return { markdown: "" };
  if (typeof content === "string") {
    try {
      const o = JSON.parse(content);
      return { markdown: typeof o?.markdown === "string" ? o.markdown : "" };
    } catch {
      return { markdown: content };
    }
  }
  if (typeof content === "object" && content !== null) {
    const o = content as Record<string, unknown>;
    return { markdown: typeof o.markdown === "string" ? o.markdown : "" };
  }
  return { markdown: "" };
}

export interface ReportDrawerProps {
  projectId: string;
  reportId: string | "new" | null;
  mode: "admin" | "customer";
  onClose: () => void;
  /**
   * Yeni rapor açılırken template ile ön doldurma için. `reportId === "new"`
   * olduğunda kullanılır.
   */
  initialTemplate?: WeeklyReportTemplate | null;
}

export function ReportDrawer({
  projectId,
  reportId,
  mode,
  onClose,
  initialTemplate,
}: ReportDrawerProps) {
  const qc = useQueryClient();
  const { message, modal } = AntdApp.useApp();

  const isNew = reportId === "new";
  const open = reportId !== null;
  const effectiveId = reportId && reportId !== "new" ? reportId : null;
  const isEditable = mode === "admin";
  const [editing, setEditing] = useState(isNew);

  const detailQuery = useQuery({
    queryKey: ["project-report", projectId, effectiveId],
    queryFn: () => ProjectReportsApi.get(projectId, effectiveId!),
    enabled: !!effectiveId,
  });

  const [form, setForm] = useState<CreateReportPayload>(() => ({
    title: "",
    reportDate: new Date().toISOString(),
    overallProgress: null,
    summary: null,
    contentJson: JSON.stringify({ markdown: "" }),
  }));

  useEffect(() => {
    if (isNew) {
      setEditing(true);
      if (initialTemplate) {
        setForm({
          title: initialTemplate.title,
          reportDate: initialTemplate.reportDate,
          overallProgress: initialTemplate.overallProgress,
          summary: initialTemplate.summary,
          contentJson: JSON.stringify({ markdown: initialTemplate.markdown }),
        });
      } else {
        setForm({
          title: "",
          reportDate: new Date().toISOString(),
          overallProgress: null,
          summary: null,
          contentJson: JSON.stringify({ markdown: "" }),
        });
      }
      return;
    }
    if (detailQuery.data) {
      const d = detailQuery.data;
      const body = parseBody(d.contentJson);
      setForm({
        title: d.title,
        reportDate: d.reportDate,
        overallProgress: d.overallProgress ?? null,
        summary: d.summary ?? null,
        contentJson: JSON.stringify(body),
      });
      setEditing(false);
    }
  }, [isNew, detailQuery.data, initialTemplate]);

  const createMut = useMutation({
    mutationFn: (payload: CreateReportPayload) => ProjectReportsApi.create(projectId, payload),
    onSuccess: () => {
      message.success("Rapor oluşturuldu.");
      qc.invalidateQueries({ queryKey: ["project-reports", projectId] });
      onClose();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (payload: CreateReportPayload) =>
      ProjectReportsApi.update(projectId, effectiveId!, payload),
    onSuccess: (d: ProjectReportDetail) => {
      message.success("Rapor güncellendi.");
      qc.invalidateQueries({ queryKey: ["project-reports", projectId] });
      qc.invalidateQueries({ queryKey: ["project-report", projectId, d.id] });
      setEditing(false);
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => ProjectReportsApi.remove(projectId, effectiveId!),
    onSuccess: () => {
      message.success("Rapor silindi.");
      qc.invalidateQueries({ queryKey: ["project-reports", projectId] });
      onClose();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const onSave = () => {
    if (!form.title.trim()) {
      message.error("Başlık boş olamaz.");
      return;
    }
    if (isNew) {
      createMut.mutate(form);
    } else {
      updateMut.mutate(form);
    }
  };

  const body = useMemo(() => parseBody(form.contentJson), [form.contentJson]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={isNew ? "Yeni Rapor" : form.title || "Rapor"}
      extra={
        isEditable && !isNew && !editing ? (
          <Space>
            <Button size="small" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                modal.confirm({
                  title: "Rapor silinsin mi?",
                  content: "Bu işlem geri alınamaz.",
                  okText: "Sil",
                  okButtonProps: { danger: true },
                  onOk: () => deleteMut.mutate(),
                });
              }}
            >
              Sil
            </Button>
          </Space>
        ) : null
      }
      footer={
        editing && isEditable ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => {
                if (isNew) onClose();
                else setEditing(false);
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="primary"
              onClick={onSave}
              loading={createMut.isPending || updateMut.isPending}
            >
              Kaydet
            </Button>
          </div>
        ) : null
      }
    >
      {!isNew && detailQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : editing && isEditable ? (
        <ReportForm form={form} onChange={setForm} body={body} />
      ) : (
        <ReportRead form={form} body={body} />
      )}
    </Drawer>
  );
}

function ReportForm({
  form,
  onChange,
  body,
}: {
  form: CreateReportPayload;
  onChange: (next: CreateReportPayload) => void;
  body: ReportBody;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <label className="col" style={{ gap: 4 }}>
        <span className="kpi-label">Başlık</span>
        <Input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="Örn. 14 Nisan Haftalık Rapor"
          maxLength={256}
        />
      </label>
      <div className="row" style={{ gap: 12 }}>
        <label className="col" style={{ gap: 4 }}>
          <span className="kpi-label">Rapor Tarihi</span>
          <Input
            type="date"
            value={toDateInput(form.reportDate)}
            onChange={(e) =>
              onChange({
                ...form,
                reportDate: fromDateInput(e.target.value) ?? new Date().toISOString(),
              })
            }
            style={{ width: 180 }}
          />
        </label>
        <label className="col" style={{ gap: 4 }}>
          <span className="kpi-label">Genel İlerleme %</span>
          <InputNumber
            value={form.overallProgress ?? undefined}
            onChange={(v) =>
              onChange({
                ...form,
                overallProgress: v === null || v === undefined ? null : Math.max(0, Math.min(100, Number(v))),
              })
            }
            min={0}
            max={100}
            placeholder="Opsiyonel"
            style={{ width: 140 }}
          />
        </label>
      </div>
      <label className="col" style={{ gap: 4 }}>
        <span className="kpi-label">Özet (opsiyonel)</span>
        <Input.TextArea
          value={form.summary ?? ""}
          onChange={(e) => onChange({ ...form, summary: e.target.value || null })}
          placeholder="Tek cümlelik özet / highlight"
          autoSize={{ minRows: 1, maxRows: 3 }}
          maxLength={2000}
        />
      </label>
      <div className="col" style={{ gap: 4 }}>
        <span className="kpi-label">
          İçerik (Markdown) · <span className="subtle" style={{ fontSize: 10 }}>Sağda canlı önizleme</span>
        </span>
        <div className="report-edit-split">
          <Input.TextArea
            value={body.markdown}
            onChange={(e) =>
              onChange({
                ...form,
                contentJson: JSON.stringify({ markdown: e.target.value }),
              })
            }
            placeholder={"## Geçen Hafta\n- ...\n\n## Riskler\n- ..."}
            autoSize={{ minRows: 16, maxRows: 40 }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
          />
          <MarkdownPreview markdown={body.markdown} />
        </div>
      </div>
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = useMemo(() => {
    try {
      return marked.parse(markdown || "", { async: false }) as string;
    } catch {
      return "";
    }
  }, [markdown]);
  return (
    <article
      className="report-prose report-prose-preview"
      dangerouslySetInnerHTML={{
        __html: html || "<p class=\"subtle\">Önizleme için yazmaya başlayın.</p>",
      }}
    />
  );
}

function ReportRead({ form, body }: { form: CreateReportPayload; body: ReportBody }) {
  const html = useMemo(() => {
    try {
      return marked.parse(body.markdown || "", { async: false }) as string;
    } catch {
      return "";
    }
  }, [body.markdown]);

  return (
    <div>
      <div className="row" style={{ gap: 16, marginBottom: 12 }}>
        <span className="subtle mono" style={{ fontSize: 12 }}>
          {formatDate(form.reportDate)}
        </span>
        {form.overallProgress != null && (
          <span className="pill pill-accent">%{form.overallProgress} genel ilerleme</span>
        )}
      </div>
      {form.summary && (
        <div
          className="card-body"
          style={{
            borderLeft: "3px solid var(--accent)",
            background: "var(--surface-muted)",
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 14,
            color: "var(--ink-muted)",
          }}
        >
          {form.summary}
        </div>
      )}
      <article
        className="report-prose"
        dangerouslySetInnerHTML={{
          __html: html || "<p class=\"subtle\">Rapor içeriği boş.</p>",
        }}
      />
    </div>
  );
}
