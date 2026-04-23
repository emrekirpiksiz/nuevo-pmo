"use client";

import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
} from "antd";
import { PlusOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => CustomersApi.list(),
  });

  const filtered = useMemo(() => {
    if (!search) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q)
    );
  }, [data, search]);

  const createMut = useMutation({
    mutationFn: (v: { name: string; contactEmail: string }) =>
      CustomersApi.create(v.name, v.contactEmail),
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
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Portföy · ${data?.length ?? 0} müşteri`}
        title="Müşteriler"
        description="Nuevo'nun aktif müşteri şirketleri. Her müşteri için kullanıcı ve proje sayılarını görebilir, davet gönderebilirsiniz."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Yeni Müşteri
          </Button>
        }
      />

      <div className="row" style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="Müşteri ara…"
          allowClear
          style={{ width: 280 }}
          onSearch={setSearch}
          onChange={(e) => {
            if (!e.target.value) setSearch("");
          }}
        />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }} className="subtle">
            Sonuç bulunamadı.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Müşteri</th>
                <th>İletişim</th>
                <th>Kullanıcı</th>
                <th>Proje</th>
                <th>Eklendi</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      style={{ color: "inherit", display: "block" }}
                    >
                      <div className="row" style={{ gap: 12 }}>
                        <div
                          className="av av-lg"
                          style={{
                            background: "var(--surface-muted)",
                            color: "var(--ink)",
                            border: "1px solid var(--border)",
                            fontFamily: "var(--font-display)",
                            fontSize: 15,
                            fontWeight: 400,
                          }}
                        >
                          {initials(c.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                          <div className="subtle ellipsis" style={{ fontSize: 12 }}>
                            {c.contactEmail}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="muted ellipsis" style={{ maxWidth: 240 }}>
                    {c.contactEmail}
                  </td>
                  <td className="num mono">{c.userCount}</td>
                  <td className="num mono">{c.projectCount}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <Button
                      size="small"
                      icon={<SendOutlined />}
                      onClick={() => setInviteOpen(c.id)}
                    >
                      Davet
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
  open,
  onClose,
  onSubmit,
  loading,
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
      destroyOnHidden
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
        <Form.Item
          name="contactEmail"
          label="İletişim E-posta"
          rules={[{ required: true, type: "email" }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function InviteModal({
  customerId,
  onClose,
  onSubmit,
  loading,
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
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => {
          onSubmit(v.email);
          form.resetFields();
        }}
      >
        <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email" }]}>
          <Input placeholder="user@customer.com" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
