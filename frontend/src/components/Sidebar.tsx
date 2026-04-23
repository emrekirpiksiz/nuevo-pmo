"use client";

import { Dropdown } from "antd";
import {
  AppstoreOutlined,
  BellOutlined,
  HomeOutlined,
  InboxOutlined,
  LineChartOutlined,
  LogoutOutlined,
  ProfileOutlined,
  ProjectOutlined,
  RightOutlined,
  TeamOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";

export interface SidebarItem {
  key: string;
  href?: string;
  label: string;
  icon: ReactNode;
  count?: number;
  soon?: boolean;
  /** Tam eşleşme — yalnızca bu href'te aktif sayılır, alt route'larda değil. */
  exact?: boolean;
  /** Görsel ayraç satırı. */
  separator?: boolean;
}

export interface SidebarProps {
  primary: SidebarItem[];
  user: SessionUser | null;
  onLogout: () => void;
}

export function Sidebar({ primary, user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (it: SidebarItem) => {
    if (!it.href) return false;
    if (it.exact) return pathname === it.href;
    if (pathname === it.href) return true;
    return pathname.startsWith(it.href + "/");
  };

  const handleClick = (it: SidebarItem) => {
    if (it.soon || it.separator || !it.href) return;
    router.push(it.href);
  };

  const initials = user
    ? user.displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : "—";

  return (
    <aside className="sb">
      <div className="sb-brand" style={{ padding: "6px 8px 16px", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        {/* SVG'nin yalnızca yeşil "nuevo" wordmark kısmını göster */}
        <div style={{ overflow: "hidden", height: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nuevo-logo.svg"
            alt="Nuevo PMP"
            style={{ width: 130, height: "auto", display: "block" }}
          />
        </div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            color: "var(--sidebar-text)",
            opacity: 0.55,
            fontFamily: "var(--font-mono)",
            paddingLeft: 1,
          }}
        >
          Project Management Portal
        </div>
      </div>

      <div>
        {primary.map((it) => {
          if (it.separator) {
            return (
              <div
                key={it.key}
                style={{
                  height: 1,
                  background: "var(--sidebar-border)",
                  margin: "8px 10px",
                }}
              />
            );
          }
          const active = isActive(it);
          return (
            <button
              key={it.key}
              type="button"
              className={
                "sb-item" + (active ? " active" : "") + (it.soon ? " disabled" : "")
              }
              onClick={() => handleClick(it)}
            >
              <span className="ic">{it.icon}</span>
              <span>{it.label}</span>
              {it.count != null ? (
                <span className="count">{it.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="sb-footer">
        <Dropdown
          trigger={["click"]}
          placement="topRight"
          menu={{
            items: [
              {
                key: "logout",
                icon: <LogoutOutlined />,
                label: "Çıkış",
                onClick: onLogout,
              },
            ],
          }}
        >
          <div className="sb-user" role="button" tabIndex={0}>
            <div className="av">{initials}</div>
            <div className="who">
              <div className="nm ellipsis">{user?.displayName ?? "—"}</div>
              <div className="em ellipsis">
                {user?.email}
                {user?.userType === "Nuevo"
                  ? " · PMO"
                  : user?.customerName
                    ? ` · ${user.customerName}`
                    : ""}
              </div>
            </div>
            <RightOutlined style={{ fontSize: 11, opacity: 0.5 }} />
          </div>
        </Dropdown>
      </div>
    </aside>
  );
}

export const SIDEBAR_ICONS = {
  dashboard: <HomeOutlined />,
  inbox: <InboxOutlined />,
  customers: <TeamOutlined />,
  projects: <AppstoreOutlined />,
  reports: <ProjectOutlined />,
  tickets: <ProfileOutlined />,
  analytics: <LineChartOutlined />,
  search: <FileSearchOutlined />,
  bell: <BellOutlined />,
};
