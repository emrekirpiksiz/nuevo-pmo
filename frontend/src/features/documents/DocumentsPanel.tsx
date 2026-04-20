"use client";

import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, App as AntdApp } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

export function DocumentsPanel({ projectId, mode }: { projectId: string; mode: "admin" | "customer" }) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: () => DocumentsApi.listByProject(projectId),
  });

  const createMut = useMutation({
    mutationFn: (v: { title: string; type: DocumentType }) => DocumentsApi.create(projectId, v.title, v.type),
    onSuccess: () => {
      message.success("Doküman oluşturuldu.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["project-documents", projectId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const docPathPrefix = mode === "admin" ? `/admin/projects/${projectId}/documents` : `/portal/projects/${projectId}/documents`;

  return (
    <Card
      title="Dokümanlar"
      extra={
        mode === "admin" && (
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>
            Yeni Doküman
          </Button>
        )
      }
    >
      <Table
        loading={isLoading}
        rowKey="id"
        dataSource={data}
        pagination={false}
        columns={[
          { title: "Başlık", dataIndex: "title", render: (v, row) => <Link href={`${docPathPrefix}/${row.id}`}>{v}</Link> },
          { title: "Tür", dataIndex: "type", width: 120, render: (t: DocumentType) => <Tag>{TYPE_LABEL[t]}</Tag> },
          {
            title: "Yayınlanan",
            dataIndex: "publishedVersionNumber",
            width: 140,
            render: (v: string | null) => v ? <Tag color="green">V{v}</Tag> : <Tag>Yayınlanmadı</Tag>,
          },
          {
            title: "Onaylı",
            dataIndex: "approvedVersionNumber",
            width: 140,
            render: (v: string | null) => v ? <Tag color="gold">V{v}</Tag> : "—",
          },
          {
            title: "Açık Yorum",
            dataIndex: "openCommentCount",
            width: 140,
            render: (v) => v > 0 ? <Tag color="orange">{v}</Tag> : "—",
          },
        ]}
      />

      {mode === "admin" && (
        <Modal open={open} title="Yeni Doküman" onCancel={() => setOpen(false)} footer={null} destroyOnClose>
          <Form layout="vertical" initialValues={{ type: "Analysis" }} onFinish={(v) => createMut.mutate(v)}>
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
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={createMut.isPending}>Oluştur</Button>
                <Button onClick={() => setOpen(false)}>İptal</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </Card>
  );
}
