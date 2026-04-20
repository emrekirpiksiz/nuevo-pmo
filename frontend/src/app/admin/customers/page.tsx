"use client";

import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  App as AntdApp,
  Tag,
} from "antd";
import { PlusOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";

export default function CustomersPage() {
  const qc = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => CustomersApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (v: { name: string; contactEmail: string }) => CustomersApi.create(v.name, v.contactEmail),
    onSuccess: () => {
      message.success("Müşteri oluşturuldu.");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const inviteMut = useMutation({
    mutationFn: (v: { id: string; email: string }) => CustomersApi.invite(v.id, v.email),
    onSuccess: (res) => {
      message.success("Davet gönderildi: " + res.email);
      setInviteOpen(null);
      modal.info({
        title: "Dev ortamı için davet URL",
        content: (
          <div>
            <Typography.Paragraph copyable style={{ wordBreak: "break-all" }}>
              {res.acceptUrl}
            </Typography.Paragraph>
          </div>
        ),
      });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Müşteriler</Typography.Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>
          Yeni Müşteri
        </Button>
      </div>
      <Card>
        <Table
          loading={isLoading}
          rowKey="id"
          dataSource={data}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: "Ad", dataIndex: "name", render: (v, row) => <Link href={`/admin/customers/${row.id}`}>{v}</Link> },
            { title: "İletişim", dataIndex: "contactEmail" },
            { title: "Kullanıcı", dataIndex: "userCount", width: 120, render: (v) => <Tag>{v}</Tag> },
            { title: "Proje", dataIndex: "projectCount", width: 120, render: (v) => <Tag color="blue">{v}</Tag> },
            {
              title: "Aksiyon",
              key: "actions",
              width: 200,
              render: (_, row) => (
                <Space>
                  <Button size="small" icon={<SendOutlined />} onClick={() => setInviteOpen(row.id)}>
                    Davet
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <CreateCustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(v) => createMut.mutate(v)}
        loading={createMut.isPending}
      />
      <InviteModal
        customerId={inviteOpen}
        onClose={() => setInviteOpen(null)}
        onSubmit={(email) => inviteMut.mutate({ id: inviteOpen!, email })}
        loading={inviteMut.isPending}
      />
    </div>
  );
}

function CreateCustomerModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: { name: string; contactEmail: string }) => void;
  loading: boolean;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      open={open}
      title="Yeni Müşteri"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => {
          onSubmit(v);
          form.resetFields();
        }}
      >
        <Form.Item name="name" label="Müşteri Adı" rules={[{ required: true, max: 200 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contactEmail" label="İletişim E-posta" rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function InviteModal({
  customerId, onClose, onSubmit, loading,
}: {
  customerId: string | null;
  onClose: () => void;
  onSubmit: (email: string) => void;
  loading: boolean;
}) {
  const [form] = Form.useForm<{ email: string }>();
  return (
    <Modal
      open={!!customerId}
      title="Müşteri Kullanıcısı Davet Et"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => { onSubmit(v.email); form.resetFields(); }}>
        <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email" }]}>
          <Input placeholder="user@customer.com" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
