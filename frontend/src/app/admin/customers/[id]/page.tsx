"use client";

import { useParams } from "next/navigation";
import { Button, Card, Descriptions, Space, Table, Typography, App as AntdApp, Tag, Modal, Form, Input } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: customer } = useQuery({ queryKey: ["customer", id], queryFn: () => CustomersApi.get(id) });
  const { data: users } = useQuery({ queryKey: ["customer-users", id], queryFn: () => CustomersApi.users(id) });

  const inviteMut = useMutation({
    mutationFn: (email: string) => CustomersApi.invite(id, email),
    onSuccess: (res) => {
      message.success("Davet gönderildi: " + res.email);
      setInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["customer-users", id] });
      modal.info({
        title: "Dev ortamı için davet URL",
        content: (
          <Typography.Paragraph copyable style={{ wordBreak: "break-all" }}>
            {res.acceptUrl}
          </Typography.Paragraph>
        ),
      });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>{customer?.name}</Typography.Title>
      <Card>
        <Descriptions column={2}>
          <Descriptions.Item label="Müşteri Adı">{customer?.name}</Descriptions.Item>
          <Descriptions.Item label="İletişim E-posta">{customer?.contactEmail}</Descriptions.Item>
          <Descriptions.Item label="Oluşturma">{customer && new Date(customer.createdAt).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card
        title="Müşteri Kullanıcıları"
        extra={<Button type="primary" icon={<SendOutlined />} onClick={() => setInviteOpen(true)}>Davet Et</Button>}
      >
        <Table
          rowKey="id"
          dataSource={users}
          pagination={false}
          columns={[
            { title: "Ad", dataIndex: "displayName" },
            { title: "E-posta", dataIndex: "email" },
            {
              title: "Durum",
              dataIndex: "isActive",
              render: (v) => (v ? <Tag color="green">Aktif</Tag> : <Tag color="red">Pasif</Tag>),
            },
            {
              title: "Son giriş",
              dataIndex: "lastLoginAt",
              render: (v) => (v ? new Date(v).toLocaleString() : "-"),
            },
          ]}
        />
      </Card>

      <Modal
        open={inviteOpen}
        title="Müşteri Kullanıcısı Davet Et"
        onCancel={() => setInviteOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={(v) => inviteMut.mutate(v.email)}>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={inviteMut.isPending}>
              Davet Gönder
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
