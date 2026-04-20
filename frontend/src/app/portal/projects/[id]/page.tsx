"use client";

import { useParams } from "next/navigation";
import { Badge, Card, Descriptions, Space, Tabs, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { ProjectsApi } from "@/lib/apis";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";

export default function CustomerProjectPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => ProjectsApi.get(id) });

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{project?.name}</Typography.Title>
          <Typography.Text type="secondary">{project?.code}</Typography.Text>
        </div>
        {project && <Tag color={project.status === "Active" ? "green" : "blue"}>{project.status}</Tag>}
      </div>

      <Card>
        <Descriptions column={2}>
          <Descriptions.Item label="Kod">{project?.code}</Descriptions.Item>
          <Descriptions.Item label="Durum">{project?.status}</Descriptions.Item>
          <Descriptions.Item label="Açıklama" span={2}>{project?.description || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="documents"
        items={[
          {
            key: "documents",
            label: "Dokümanlar",
            children: <DocumentsPanel projectId={id} mode="customer" />,
          },
          {
            key: "plan",
            label: (
              <span>
                Proje Planı <Badge status="processing" text="Yakında" />
              </span>
            ),
            children: <ComingSoon title="Proje Planı" description="Timeline/epic bazlı proje ilerleyişi yakında." />,
          },
          {
            key: "reports",
            label: (
              <span>
                Haftalık Raporlar <Badge status="processing" text="Yakında" />
              </span>
            ),
            children: <ComingSoon title="Haftalık Raporlar" description="Proje ilerleme raporları yakında." />,
          },
          {
            key: "tickets",
            label: (
              <span>
                Tickets <Badge status="processing" text="Yakında" />
              </span>
            ),
            children: <ComingSoon title="Tickets" description="Görev/ticket yönetimi yakında." />,
          },
        ]}
      />
    </Space>
  );
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <Space direction="vertical" size="small">
        <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
        <Tag color="blue">Coming Soon</Tag>
      </Space>
    </Card>
  );
}
