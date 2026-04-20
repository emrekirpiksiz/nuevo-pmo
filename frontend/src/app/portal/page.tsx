"use client";

import { Card, Col, Empty, Row, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { ProjectsApi } from "@/lib/apis";
import Link from "next/link";

export default function CustomerHomePage() {
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => ProjectsApi.list() });

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Projeleriniz</Typography.Title>
      {projects?.length === 0 && <Empty description="Henüz atanmış projeniz yok." />}
      <Row gutter={[16, 16]}>
        {projects?.map((p) => (
          <Col xs={24} md={12} lg={8} key={p.id}>
            <Card
              title={<Link href={`/portal/projects/${p.id}`}>{p.name}</Link>}
              extra={<Tag color={p.status === "Active" ? "green" : "blue"}>{p.status}</Tag>}
            >
              <Typography.Text type="secondary">{p.code}</Typography.Text>
              <div style={{ marginTop: 8 }}>{p.description ?? "—"}</div>
              <div style={{ marginTop: 12 }}>
                <Tag>{p.documentCount} doküman</Tag>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
