"use client";

import { useParams, useRouter } from "next/navigation";
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Skeleton,
} from "antd";
import { ArrowLeftOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi, ProjectsApi } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => CustomersApi.get(id),
  });
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["customer-users", id],
    queryFn: () => CustomersApi.users(id),
  });
  const { data: projects } = useQuery({
    queryKey: ["projects", { customerId: id }],
    queryFn: () => ProjectsApi.list(id),
  });

  const inviteMut = useMutation({
    mutationFn: (email: string) => CustomersApi.invite(id, email),
    onSuccess: (res) => {
      message.success("Davet gönderildi: " + res.email);
      setInviteOpen(false);
      qc.invalidateQueries({ queryKey: ["customer-users", id] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  if (isLoading || !customer) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/customers")}
          style={{ marginLeft: -8, color: "var(--ink-muted)" }}
        >
          Müşteriler
        </Button>
      </div>

      <PageHeader
        eyebrow={`Müşteri · ${customer.userCount} kullanıcı · ${customer.projectCount} proje`}
        title={
          <span className="row" style={{ gap: 14, alignItems: "center" }}>
            <span
              className="av av-lg"
              style={{
                background: "var(--surface-muted)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-display)",
                fontSize: 18,
                width: 48,
                height: 48,
              }}
            >
              {initials(customer.name)}
            </span>
            <span>{customer.name}</span>
          </span>
        }
        description={
          <>
            İletişim e-postası: <strong>{customer.contactEmail}</strong> · Eklendi:{" "}
            {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
          </>
        }
        actions={
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setInviteOpen(true)}
          >
            Kullanıcı Davet Et
          </Button>
        }
      />

      {/* Projeler */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
        <div className="card-head">
          <h2 className="card-title">Projeler</h2>
          <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
            {projects?.length ?? 0} proje
          </span>
        </div>
        {!projects ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }} className="subtle">
            Bu müşteriye ait proje yok.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Proje</th>
                <th>Durum</th>
                <th>Doküman</th>
                <th>Üye</th>
                <th>Eklendi</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      style={{ color: "inherit", display: "block" }}
                    >
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div className="subtle mono" style={{ fontSize: 11.5 }}>
                        {p.code}
                      </div>
                    </Link>
                  </td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td className="num mono">{p.documentCount}</td>
                  <td className="num mono">{p.memberCount}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Müşteri kullanıcıları */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-head">
          <h2 className="card-title">Kullanıcılar</h2>
          <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
            {users?.length ?? 0} kullanıcı
          </span>
        </div>
        {usersLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : (users?.length ?? 0) === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }} className="subtle">
            Bu müşteriye ait kullanıcı yok.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Ad</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Son Giriş</th>
              </tr>
            </thead>
            <tbody>
              {users!.map((u) => (
                <tr key={u.id}>
                  <td style={{ paddingLeft: 20, fontWeight: 500 }}>{u.displayName}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    {u.isPending ? (
                      <span className="pill pill-warn">
                        <span className="dot dot-warn" /> Davet beklemede
                      </span>
                    ) : u.isActive ? (
                      <span className="pill pill-ok">
                        <span className="dot dot-ok" /> Aktif
                      </span>
                    ) : (
                      <span className="pill pill-neutral">Pasif</span>
                    )}
                  </td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString("tr-TR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={inviteOpen}
        title="Müşteri Kullanıcısı Davet Et"
        onCancel={() => setInviteOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={(v) => inviteMut.mutate(v.email)}>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={inviteMut.isPending}>
              Davet Gönder
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
