"use client";

import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
} from "antd";
import {
  CheckCircleFilled,
  FileTextOutlined,
  PlusOutlined,
  StarFilled,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DocumentsApi, DocumentType } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

const TYPE_LABEL: Record<DocumentType, string> = {
  Analysis: "Analiz",
  Scope: "Kapsam",
  Meeting: "Toplantı",
  Other: "Diğer",
};

export function DocumentsPanel({
  projectId,
  mode,
}: {
  projectId: string;
  mode: "admin" | "customer";
}) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => DocumentsApi.listByProject(projectId),
  });

  const createMut = useMutation({
    mutationFn: (v: { title: string; type: DocumentType }) =>
      DocumentsApi.create(projectId, v.title, v.type),
    onSuccess: () => {
      message.success("Doküman oluşturuldu.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["project-documents", projectId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const docPathPrefix =
    mode === "admin"
      ? `/admin/projects/${projectId}/documents`
      : `/portal/projects/${projectId}/documents`;

  const totalOpen = data?.reduce((a, d) => a + d.openCommentCount, 0) ?? 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Dokümanlar</h2>
        <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
          {data?.length ?? 0} doküman · {totalOpen} açık yorum
        </span>
        {mode === "admin" && (
          <div style={{ marginLeft: "auto" }}>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              Yeni Doküman
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div style={{ padding: 48, textAlign: "center" }} className="subtle">
          Henüz doküman yok.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>Başlık</th>
              <th>Tür</th>
              <th>Yayın</th>
              <th>Taslak</th>
              <th>Açık Yorum</th>
              <th>Onay</th>
              <th>Son Düzenleme</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {data!.map((d) => (
              <tr key={d.id}>
                <td style={{ paddingLeft: 20 }}>
                  <Link
                    href={`${docPathPrefix}/${d.id}`}
                    style={{ color: "inherit", display: "block" }}
                  >
                    <div className="row" style={{ gap: 10 }}>
                      <FileTextOutlined style={{ color: "var(--ink-subtle)", fontSize: 14 }} />
                      <span style={{ fontWeight: 500 }}>{d.title}</span>
                    </div>
                  </Link>
                </td>
                <td>
                  <span className="pill pill-neutral">{TYPE_LABEL[d.type]}</span>
                </td>
                <td>
                  {d.customerDisplay ? (
                    <div>
                      <span className="pill pill-accent">
                        <StarFilled style={{ fontSize: 10 }} /> {d.customerDisplay}
                      </span>
                      {d.customerVersionMarkedAt && (
                        <div className="subtle mono" style={{ fontSize: 11, marginTop: 2 }}>
                          {new Date(d.customerVersionMarkedAt).toLocaleDateString("tr-TR")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="pill pill-neutral">Yayınlanmadı</span>
                  )}
                </td>
                <td>
                  {d.hasDraftChanges ? (
                    <span className="pill pill-warn">Taslak değişiklik</span>
                  ) : (
                    <span className="subtle">—</span>
                  )}
                </td>
                <td>
                  {d.openCommentCount > 0 ? (
                    <span
                      className="mono"
                      style={{ color: "var(--accent)", fontWeight: 600 }}
                    >
                      {d.openCommentCount}
                    </span>
                  ) : (
                    <span className="subtle">—</span>
                  )}
                </td>
                <td>
                  {d.approvalCount > 0 ? (
                    <span className="pill pill-ok">
                      <CheckCircleFilled style={{ fontSize: 10 }} /> {d.approvalCount} onay
                    </span>
                  ) : (
                    <span className="subtle">—</span>
                  )}
                </td>
                <td className="subtle mono" style={{ fontSize: 11.5 }}>
                  {d.updatedAt
                    ? new Date(d.updatedAt).toLocaleString("tr-TR")
                    : new Date(d.createdAt).toLocaleString("tr-TR")}
                </td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  <Link
                    href={`${docPathPrefix}/${d.id}`}
                    style={{ color: "var(--ink-subtle)" }}
                    aria-label="Aç"
                  >
                    ›
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mode === "admin" && (
        <Modal
          open={open}
          title="Yeni Doküman"
          onCancel={() => setOpen(false)}
          footer={null}
          destroyOnHidden
        >
          <Form
            layout="vertical"
            initialValues={{ type: "Analysis" }}
            onFinish={(v) => createMut.mutate(v)}
          >
            <Form.Item name="title" label="Başlık" rules={[{ required: true, max: 256 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="type" label="Tür" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Analysis", label: "Analiz" },
                  { value: "Scope", label: "Kapsam" },
                  { value: "Meeting", label: "Toplantı" },
                  { value: "Other", label: "Diğer" },
                ]}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={createMut.isPending}>
                  Oluştur
                </Button>
                <Button onClick={() => setOpen(false)}>İptal</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
