"use client";

import { Button, Card, Form, Modal, Popconfirm, Select, Space, Table, Tag, App as AntdApp } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectsApi, ProjectRole } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";

const ROLE_LABEL: Record<ProjectRole, string> = {
  PMOwner: "PM Owner",
  PMOMember: "PM Member",
  CustomerViewer: "Customer Viewer",
  CustomerContributor: "Customer Contributor",
};

export function ProjectMembersPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useQuery({ queryKey: ["project-members", projectId], queryFn: () => ProjectsApi.members(projectId) });
  const { data: available } = useQuery({
    queryKey: ["project-available-users", projectId, search],
    queryFn: () => ProjectsApi.availableUsers(projectId, search),
    enabled: open,
  });

  const addMut = useMutation({
    mutationFn: (v: { userId: string; role: ProjectRole }) => ProjectsApi.addMember(projectId, v.userId, v.role),
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
    <Card
      title="Üyeler"
      extra={<Button type="primary" onClick={() => setOpen(true)}>Üye Ekle</Button>}
    >
      <Table
        rowKey="id"
        pagination={false}
        dataSource={data}
        columns={[
          { title: "Ad", dataIndex: "userDisplayName" },
          { title: "E-posta", dataIndex: "userEmail" },
          {
            title: "Tip",
            dataIndex: "userType",
            render: (v) => <Tag color={v === "Nuevo" ? "purple" : "blue"}>{v}</Tag>,
          },
          { title: "Rol", dataIndex: "role", render: (r: ProjectRole) => ROLE_LABEL[r] },
          {
            title: "Aksiyon",
            key: "x",
            width: 120,
            render: (_, row) => (
              <Popconfirm title="Üye kaldırılsın mı?" onConfirm={() => removeMut.mutate(row.userId)}>
                <Button size="small" danger>Kaldır</Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal open={open} title="Üye Ekle" onCancel={() => setOpen(false)} footer={null} destroyOnClose>
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
              options={[
                { value: "PMOwner", label: "PM Owner" },
                { value: "PMOMember", label: "PM Member" },
                { value: "CustomerViewer", label: "Customer Viewer" },
                { value: "CustomerContributor", label: "Customer Contributor" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={addMut.isPending}>Ekle</Button>
              <Button onClick={() => setOpen(false)}>İptal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
