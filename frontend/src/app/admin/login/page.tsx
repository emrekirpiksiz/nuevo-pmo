"use client";

import { Alert, Button, Card, Form, Input, Space, Typography, Divider, App as AntdApp } from "antd";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/lib/apis";
import { setSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);

  const onDevLogin = async (values: { email: string; displayName?: string }) => {
    setLoading(true);
    try {
      const res = await AuthApi.devLogin(values.email, values.displayName ?? "");
      setSession(res.accessToken, res.user);
      message.success("Giriş başarılı");
      router.push("/admin");
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onO365Login = async () => {
    message.info("O365 SSO config yapılandırılmalı. Şimdilik dev login kullanın.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #001529 0%, #0050b3 100%)",
        padding: 16,
      }}
    >
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Nuevo Yönetici Girişi
            </Typography.Title>
            <Typography.Text type="secondary">O365 SSO ile giriş yapın</Typography.Text>
          </div>

          <Button type="primary" size="large" block onClick={onO365Login}>
            Microsoft 365 ile Giriş
          </Button>

          <Divider>Geliştirme Girişi</Divider>

          <Alert
            type="info"
            showIcon
            message="Dev login yalnızca geliştirme ortamında aktiftir."
          />

          <Form layout="vertical" onFinish={onDevLogin} initialValues={{ email: "admin@nuevo.local", displayName: "Nuevo Admin" }}>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
              <Input placeholder="admin@nuevo.local" />
            </Form.Item>
            <Form.Item label="Görünen Ad" name="displayName">
              <Input placeholder="Nuevo Admin" />
            </Form.Item>
            <Form.Item>
              <Button type="default" htmlType="submit" block loading={loading}>
                Dev login ile Giriş
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
