"use client";

import { App as AntdApp, Button, Skeleton, Space } from "antd";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ProjectReportsApi,
  type ProjectReportSummary,
  type WeeklyReportTemplate,
} from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { formatDate } from "./helpers";
import { ReportDrawer } from "./ReportDrawer";

export function ReportsList({
  projectId,
  mode,
}: {
  projectId: string;
  mode: "admin" | "customer";
}) {
  const { message } = AntdApp.useApp();
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [initialTemplate, setInitialTemplate] = useState<WeeklyReportTemplate | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project-reports", projectId],
    queryFn: () => ProjectReportsApi.list(projectId),
  });

  const generateTemplateMut = useMutation({
    mutationFn: () => ProjectReportsApi.weeklyTemplate(projectId),
    onSuccess: (tpl) => {
      setInitialTemplate(tpl);
      setSelected("new");
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const openNew = (withTemplate: boolean) => {
    if (withTemplate) {
      generateTemplateMut.mutate();
    } else {
      setInitialTemplate(null);
      setSelected("new");
    }
  };

  const onDrawerClose = () => {
    setSelected(null);
    setInitialTemplate(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title" style={{ fontSize: 18 }}>
          Raporlar
        </h2>
        <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
          {data?.length ?? 0} rapor
        </span>
        {mode === "admin" && (
          <div style={{ marginLeft: "auto" }}>
            <Space size={8}>
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => openNew(true)}
                loading={generateTemplateMut.isPending}
                title="Mevcut plan ve milestone durumundan otomatik doldurulmuş şablon üretir."
              >
                Haftalık Rapor Üret
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openNew(false)}
              >
                Yeni Rapor
              </Button>
            </Space>
          </div>
        )}
      </div>
      {isLoading ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="subtle" style={{ padding: 32, textAlign: "center" }}>
          Bu projede henüz rapor yok.
          {mode === "admin" && (
            <div style={{ marginTop: 12 }}>
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => openNew(true)}
                loading={generateTemplateMut.isPending}
              >
                Haftalık Rapor Üret
              </Button>
            </div>
          )}
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>Tarih</th>
              <th>Başlık</th>
              <th>Özet</th>
              <th style={{ textAlign: "right" }}>%</th>
              <th style={{ paddingRight: 20 }}>Yayınlayan</th>
            </tr>
          </thead>
          <tbody>
            {data!.map((r) => (
              <ReportRow key={r.id} report={r} onOpen={() => setSelected(r.id)} />
            ))}
          </tbody>
        </table>
      )}

      <ReportDrawer
        projectId={projectId}
        reportId={selected}
        mode={mode}
        onClose={onDrawerClose}
        initialTemplate={selected === "new" ? initialTemplate : null}
      />
    </div>
  );
}

function ReportRow({ report, onOpen }: { report: ProjectReportSummary; onOpen: () => void }) {
  return (
    <tr onClick={onOpen} style={{ cursor: "pointer" }}>
      <td style={{ paddingLeft: 20 }} className="mono">
        {formatDate(report.reportDate)}
      </td>
      <td style={{ fontWeight: 500 }}>{report.title}</td>
      <td className="subtle" style={{ fontSize: 12.5, maxWidth: 360 }}>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {report.summary ?? "—"}
        </div>
      </td>
      <td className="num" style={{ textAlign: "right" }}>
        {report.overallProgress != null ? `%${report.overallProgress}` : "—"}
      </td>
      <td className="subtle" style={{ paddingRight: 20 }}>
        {report.createdByName ?? "—"}
      </td>
    </tr>
  );
}
