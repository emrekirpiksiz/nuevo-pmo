"use client";

import { Button, Card, Space, Typography } from "antd";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)",
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 560, width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={2} style={{ margin: 0 }}>
              Nuevo PMO
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              Proje dokümanlarını, toplantılarını ve kapsamlarını şeffaf bir şekilde yönetin.
            </Typography.Paragraph>
          </div>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Button type="primary" size="large" block onClick={() => router.push("/admin/login")}>
              Nuevo Yönetici Girişi
            </Button>
            <Button size="large" block onClick={() => router.push("/login")}>
              Müşteri Girişi
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
