"use client";

import {
  App as AntdApp,
  Button,
  Form,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectsApi, ProjectMember, ProjectRole } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useMemo, useState } from "react";

const ROLE_LABEL: Record<ProjectRole, string> = {
  PMOwner: "PM Owner",
  PMOMember: "PM Member",
  CustomerViewer: "Customer Viewer",
  CustomerContributor: "Customer Contributor",
};

const AV_COLORS = ["#8a6d3b", "#6b7a5a", "#935d4c", "#4a6a8a", "#7a5a8a", "#5a5852"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function ProjectMembersPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => ProjectsApi.members(projectId),
  });
  const { data: available } = useQuery({
    queryKey: ["project-available-users", projectId, search],
    queryFn: () => ProjectsApi.availableUsers(projectId, search),
    enabled: open,
  });

  const { nuevo, customer } = useMemo(() => {
    const n: ProjectMember[] = [];
    const c: ProjectMember[] = [];
    (data ?? []).forEach((m) =>
      m.userType === "Nuevo" ? n.push(m) : c.push(m)
    );
    return { nuevo: n, customer: c };
  }, [data]);

  const addMut = useMutation({
    mutationFn: (v: { userId: string; role: ProjectRole }) =>
      ProjectsApi.addMember(projectId, v.userId, v.role),
    onSuccess: () => {
      message.success("Üye eklendi.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => ProjectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      message.success("Üye kaldırıldı.");
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Proje Ekibi</h2>
        <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
          {(data?.length ?? 0)} üye
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Üye Ekle
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 20 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          <MemberColumn
            title={`Nuevo Ekibi · ${nuevo.length} kişi`}
            members={nuevo}
            onRemove={(id) => removeMut.mutate(id)}
          />
          <MemberColumn
            title={`Müşteri Tarafı · ${customer.length} kişi`}
            members={customer}
            onRemove={(id) => removeMut.mutate(id)}
          />
        </div>
      )}

      <Modal
        open={open}
        title="Üye Ekle"
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={(v) => addMut.mutate(v)}>
          <Form.Item name="userId" label="Kullanıcı" rules={[{ required: true }]}>
            <Select
              showSearch
              onSearch={setSearch}
              filterOption={false}
              placeholder="İsim / e-posta"
              options={available?.map((u) => ({
                value: u.id,
                label: `${u.displayName} — ${u.email} [${u.userType}]`,
              }))}
            />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select
              options={(Object.keys(ROLE_LABEL) as ProjectRole[]).map((r) => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={addMut.isPending}>
                Ekle
              </Button>
              <Button onClick={() => setOpen(false)}>İptal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function MemberColumn({
  title,
  members,
  onRemove,
}: {
  title: string;
  members: ProjectMember[];
  onRemove: (userId: string) => void;
}) {
  return (
    <div>
      <div className="eyebrow">{title}</div>
      {members.length === 0 ? (
        <div
          className="subtle"
          style={{
            padding: "16px 0",
            fontSize: 13,
            borderTop: "1px solid var(--border)",
            marginTop: 4,
          }}
        >
          Henüz üye yok.
        </div>
      ) : (
        members.map((m, i) => (
          <div
            key={m.id}
            className="row"
            style={{
              padding: "10px 0",
              borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none",
              gap: 12,
            }}
          >
            <div className="av av-lg" style={{ background: colorFor(m.userId) }}>
              {initials(m.userDisplayName)}
            </div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }} className="ellipsis">
                {m.userDisplayName}
              </div>
              <div className="subtle ellipsis" style={{ fontSize: 12 }}>
                {ROLE_LABEL[m.role]} · {m.userEmail}
              </div>
            </div>
            <Popconfirm
              title="Üye kaldırılsın mı?"
              onConfirm={() => onRemove(m.userId)}
              okText="Kaldır"
              cancelText="İptal"
            >
              <Button size="small" danger type="text">
                Kaldır
              </Button>
            </Popconfirm>
          </div>
        ))
      )}
    </div>
  );
}
