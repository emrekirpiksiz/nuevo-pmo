"use client";

import { Avatar, Dropdown, Layout, Menu, Space, theme, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo } from "react";
import { useSession } from "@/lib/useSession";
import { clearAuth, SessionUser } from "@/lib/auth";
import {
  AppstoreOutlined,
  CommentOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

interface Props {
  kind: "admin" | "customer";
  children: ReactNode;
}

export function AppShell({ kind, children }: Props) {
  const { user, ready, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace(kind === "admin" ? "/admin/login" : "/login");
      return;
    }
    if (kind === "admin" && user?.userType !== "Nuevo") {
      router.replace("/portal");
    }
    if (kind === "customer" && user?.userType !== "Customer") {
      router.replace("/admin");
    }
  }, [ready, isAuthenticated, user, router, kind]);

  const menuItems = useMemo(() => {
    if (kind === "admin") {
      return [
        { key: "/admin", icon: <HomeOutlined />, label: "Panel" },
        { key: "/admin/customers", icon: <TeamOutlined />, label: "Müşteriler" },
        { key: "/admin/projects", icon: <AppstoreOutlined />, label: "Projeler" },
      ];
    }
    return [
      { key: "/portal", icon: <HomeOutlined />, label: "Panel" },
    ];
  }, [kind]);

  const selectedKey = useMemo(() => {
    const items = menuItems.map((m) => m.key);
    return items
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0] ?? menuItems[0].key;
  }, [pathname, menuItems]);

  if (!ready || !isAuthenticated) {
    return <div style={{ padding: 48 }}>Yükleniyor…</div>;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={240} breakpoint="lg" collapsedWidth="60">
        <div
          style={{
            padding: "16px 12px",
            color: "#fff",
            fontSize: 18,
            fontWeight: 600,
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          Nuevo PMO
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={(e) => router.push(e.key as string)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: colorBgContainer, padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {kind === "admin" ? "Yönetici Paneli" : user?.customerName ?? "Müşteri Portalı"}
          </Typography.Text>
          <UserMenu user={user} onLogout={() => { clearAuth(); router.push(kind === "admin" ? "/admin/login" : "/login"); }} />
        </Header>
        <Content style={{ margin: 24 }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

function UserMenu({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  return (
    <Dropdown
      menu={{
        items: [
          { key: "logout", icon: <LogoutOutlined />, label: "Çıkış", onClick: onLogout },
        ],
      }}
      trigger={["click"]}
    >
      <Space style={{ cursor: "pointer" }}>
        <Avatar icon={<UserOutlined />} />
        <div>
          <div style={{ fontWeight: 500 }}>{user?.displayName}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{user?.email}</div>
        </div>
      </Space>
    </Dropdown>
  );
}
