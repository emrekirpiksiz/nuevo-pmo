"use client";

import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, App as AntdApp } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi, ProjectsApi, ProjectStatus } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

const STATUS_COLOR: Record<ProjectStatus, string> = {
  Active: "green",
  OnHold: "orange",
  Completed: "blue",
  Cancelled: "red",
};

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => ProjectsApi.list() });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => CustomersApi.list() });

  const createMut = useMutation({
    mutationFn: (v: { code: string; name: string; description?: string; customerId: string }) =>
      ProjectsApi.create(v),
    onSuccess: () => {
      message.success("Proje oluşturuldu.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Projeler</Typography.Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setOpen(true)}>Yeni Proje</Button>
      </div>
      <Card>
        <Table
          loading={isLoading}
          rowKey="id"
          dataSource={data}
          columns={[
            { title: "Kod", dataIndex: "code", width: 140 },
            { title: "Ad", dataIndex: "name", render: (v, row) => <Link href={`/admin/projects/${row.id}`}>{v}</Link> },
            { title: "Müşteri", dataIndex: "customerName" },
            { title: "Doküman", dataIndex: "documentCount", width: 120 },
            { title: "Üye", dataIndex: "memberCount", width: 100 },
            { title: "Durum", dataIndex: "status", width: 140, render: (s: ProjectStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
          ]}
        />
      </Card>

      <Modal
        open={open}
        title="Yeni Proje"
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={(v) => createMut.mutate(v)}>
          <Form.Item name="code" label="Proje Kodu" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="NUEVO-2026-001" />
          </Form.Item>
          <Form.Item name="name" label="Proje Adı" rules={[{ required: true, max: 256 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customerId" label="Müşteri" rules={[{ required: true }]}>
            <Select
              showSearch
              options={customers?.map((c) => ({ value: c.id, label: c.name }))}
              optionFilterProp="label"
              placeholder="Müşteri seçin"
            />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMut.isPending}>Oluştur</Button>
              <Button onClick={() => setOpen(false)}>İptal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
