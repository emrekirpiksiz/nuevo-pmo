"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { CustomersApi, ProjectsApi } from "@/lib/apis";
import Link from "next/link";

export default function AdminHomePage() {
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => CustomersApi.list() });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => ProjectsApi.list() });

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Hoş geldiniz
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="Müşteri" value={customers?.length ?? 0} />
            <Link href="/admin/customers">Tümünü gör →</Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="Aktif Proje" value={projects?.filter((p) => p.status === "Active").length ?? 0} />
            <Link href="/admin/projects">Tümünü gör →</Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="Toplam Proje" value={projects?.length ?? 0} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
