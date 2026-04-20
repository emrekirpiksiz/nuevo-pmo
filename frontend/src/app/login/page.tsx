"use client";

import { Button, Card, Form, Input, Space, Typography, App as AntdApp } from "antd";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/lib/apis";
import { setSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await AuthApi.customerLogin(values.email, values.password);
      setSession(res.accessToken, res.user);
      message.success("Giriş başarılı");
      router.push("/portal");
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Müşteri Girişi
            </Typography.Title>
            <Typography.Text type="secondary">
              Davet e-postanızdan belirlediğiniz parolayla giriş yapın
            </Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onSubmit}>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
              <Input placeholder="name@example.com" />
            </Form.Item>
            <Form.Item label="Parola" name="password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Giriş Yap
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
