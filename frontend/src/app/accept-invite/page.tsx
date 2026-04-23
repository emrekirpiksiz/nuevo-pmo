"use client";

import { Alert, Button, Card, Form, Input, Space, Typography, App as AntdApp } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthApi } from "@/lib/apis";
import { setSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/api";
import { useState, Suspense } from "react";

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const token = params.get("token") ?? "";

  const onSubmit = async (values: { displayName: string; password: string }) => {
    if (!token) {
      message.error("Davet token'ı eksik.");
      return;
    }
    setLoading(true);
    try {
      const res = await AuthApi.acceptInvite(token, values.displayName, values.password);
      setSession(res.accessToken, res.user);
      message.success("Hesabınız oluşturuldu, hoş geldiniz!");
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
      <Card style={{ maxWidth: 500, width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Hesabınızı Oluşturun
            </Typography.Title>
            <Typography.Text type="secondary">
              Nuevo Project Management Portal davetiyenizi tamamlayın
            </Typography.Text>
          </div>
          {!token && <Alert type="error" showIcon message="Token bulunamadı. Lütfen e-postadaki bağlantıyı kullanın." />}
          <Form layout="vertical" onFinish={onSubmit} disabled={!token}>
            <Form.Item label="Görünen Adınız" name="displayName" rules={[{ required: true, max: 256 }]}>
              <Input placeholder="Ad Soyad" />
            </Form.Item>
            <Form.Item
              label="Parola"
              name="password"
              rules={[
                { required: true },
                { min: 10, message: "En az 10 karakter." },
                { pattern: /[A-Za-z]/, message: "En az bir harf." },
                { pattern: /[0-9]/, message: "En az bir rakam." },
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              label="Parola (Tekrar)"
              name="passwordConfirm"
              dependencies={["password"]}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator: (_, v) => (v === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Parolalar eşleşmiyor."))),
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Hesabı Oluştur
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteInner />
    </Suspense>
  );
}
