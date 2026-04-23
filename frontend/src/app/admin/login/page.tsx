"use client";

import { App as AntdApp, Button, Divider, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { AuthApi } from "@/lib/apis";
import { setSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { generatePkceVerifier, generateState, storePkceSession } from "@/lib/pkce";

export default function LoginPage() {
  const router = useRouter();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [o365Loading, setO365Loading] = useState(false);

  const onCustomerLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await AuthApi.customerLogin(values.email, values.password);
      setSession(res.accessToken, res.user);
      message.success("Giriş başarılı");
      router.push(res.user.userType === "Nuevo" ? "/admin" : "/portal");
    } catch (err) {
      message.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onO365Login = async () => {
    setO365Loading(true);
    try {
      const state = generateState();
      const verifier = generatePkceVerifier();
      storePkceSession(state, verifier);
      const res = await AuthApi.o365Redirect(state, verifier);
      window.location.href = res.url;
    } catch (err) {
      message.error(extractErrorMessage(err));
      setO365Loading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Nuevo Project Management Portal"
      title="Giriş Yap"
      description="Nuevo ekibi Microsoft 365 ile, müşteriler e-posta ve parola ile giriş yapar."
    >
      <Button
        type="primary"
        size="large"
        block
        loading={o365Loading}
        onClick={onO365Login}
        icon={<MicrosoftIcon />}
        style={{ height: 48, fontWeight: 500 }}
      >
        Microsoft 365 ile Giriş
      </Button>
      <Typography.Text
        type="secondary"
        style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 8 }}
      >
        Yalnızca Nuevo hesapları (@nuevo.com.tr)
      </Typography.Text>

      <Divider style={{ margin: "24px 0 20px", color: "var(--ink-subtle)", fontSize: 11 }}>
        veya müşteri hesabı ile
      </Divider>

      <Form layout="vertical" onFinish={onCustomerLogin} requiredMark={false}>
        <Form.Item
          label="E-posta"
          name="email"
          rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin" }]}
        >
          <Input placeholder="siz@sirketiniz.com" size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item
          label="Parola"
          name="password"
          rules={[{ required: true, message: "Parola gerekli" }]}
        >
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button htmlType="submit" block loading={loading} size="large" style={{ height: 44 }}>
            Giriş Yap
          </Button>
        </Form.Item>
      </Form>

      <Typography.Text
        type="secondary"
        style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 16 }}
      >
        Davet e-postanızdaki bağlantıdan hesabınızı oluşturmadıysanız, Nuevo ekibiyle iletişime geçin.
      </Typography.Text>
    </AuthLayout>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 4 }}
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
