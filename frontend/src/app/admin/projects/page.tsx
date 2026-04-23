"use client";

import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  App as AntdApp,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomersApi, ProjectsApi, ProjectStatus } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";

const STATUS_FILTERS: Array<{ key: "all" | ProjectStatus; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "Active", label: "Aktif" },
  { key: "OnHold", label: "Beklemede" },
  { key: "Completed", label: "Tamamlandı" },
  { key: "Cancelled", label: "İptal" },
];

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectsApi.list(),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => CustomersApi.list(),
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

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
    <div className="page">
      <PageHeader
        eyebrow={`Portföy · ${data?.length ?? 0} proje`}
        title="Projeler"
        description="Yürüttüğünüz tüm projelerin durumu, müşterisi ve doküman özeti. Detay için bir projeye tıklayın."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Yeni Proje
          </Button>
        }
      />

      <div className="row" style={{ marginBottom: 12, gap: 8 }}>
        <div className="tweak-seg-host">
          <div
            style={{
              display: "inline-flex",
              background: "var(--surface-muted)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 2,
              height: 32,
            }}
          >
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setFilter(s.key)}
                style={{
                  padding: "0 10px",
                  fontSize: 12.5,
                  borderRadius: 4,
                  border: "none",
                  background: filter === s.key ? "var(--surface)" : "transparent",
                  color: filter === s.key ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: filter === s.key ? 500 : 400,
                  cursor: "pointer",
                  boxShadow: filter === s.key ? "var(--shadow-xs)" : "none",
                  fontFamily: "inherit",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Input.Search
          placeholder="Proje, kod veya müşteri ara…"
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
                <th style={{ paddingLeft: 20 }}>Proje</th>
                <th>Müşteri</th>
                <th>Durum</th>
                <th>Doküman</th>
                <th>Üye</th>
                <th>Eklendi</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 20 }}>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      style={{ color: "inherit", display: "block" }}
                    >
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                      <div className="subtle mono" style={{ fontSize: 11.5 }}>
                        {p.code}
                      </div>
                    </Link>
                  </td>
                  <td className="muted">{p.customerName}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td className="num mono">{p.documentCount}</td>
                  <td className="num mono">{p.memberCount}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <Link
                      href={`/admin/projects/${p.id}`}
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
      </div>

      <Modal
        open={open}
        title="Yeni Proje"
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
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
    </div>
  );
}
