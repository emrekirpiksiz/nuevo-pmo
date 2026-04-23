"use client";

import "@ant-design/v5-patch-for-react-19";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App as AntdApp, theme as antdTheme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import trTR from "antd/locale/tr_TR";
import { applyTweaks, loadTweaks, Tweaks } from "@/lib/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      })
  );

  // İlk yüklemede tema/aksan/sidebar tercihlerini uygula. Hidrasyondan sonra
  // body sınıfı + CSS değişkenleri yerleşir; AntD token'ı da buna göre güncellenir.
  const [tweaks, setTweaks] = useState<Tweaks | null>(null);
  useEffect(() => {
    const t = loadTweaks();
    applyTweaks(t);
    setTweaks(t);
  }, []);

  const isDark = tweaks?.theme === "dark";

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={trTR}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: "#1a1d21",
            colorInfo: "#4a6a8a",
            colorSuccess: "#5a7a5a",
            colorWarning: "#b8903e",
            colorError: "#a74c3a",
            colorBgLayout: isDark ? "#0e1012" : "#faf9f6",
            colorBgContainer: isDark ? "#16181b" : "#ffffff",
            colorBgElevated: isDark ? "#1e2125" : "#ffffff",
            colorBorder: isDark ? "#262a30" : "#e6e1d5",
            colorBorderSecondary: isDark ? "#1e2125" : "#e6e1d5",
            colorText: isDark ? "#e8e4d8" : "#1a1d21",
            colorTextSecondary: isDark ? "#9a958a" : "#5a5852",
            colorTextTertiary: isDark ? "#6a6660" : "#8a8479",
            borderRadius: 6,
            borderRadiusLG: 8,
            borderRadiusSM: 4,
            fontFamily:
              "var(--font-inter), -apple-system, 'Segoe UI', system-ui, sans-serif",
            fontSize: 13,
          },
          components: {
            Layout: {
              headerBg: "transparent",
              siderBg: "var(--sidebar-bg)",
              bodyBg: "var(--canvas)",
            },
            Button: {
              fontWeight: 500,
              controlHeight: 32,
              controlHeightSM: 28,
              controlHeightLG: 36,
              primaryShadow: "none",
              defaultShadow: "none",
            },
            Table: {
              headerBg: "var(--surface)",
              headerColor: "var(--ink-subtle)",
              headerSplitColor: "transparent",
              rowHoverBg: "var(--surface-muted)",
              borderColor: "var(--border)",
            },
            Card: {
              colorBorderSecondary: "var(--border)",
              headerBg: "var(--surface)",
            },
            Tag: {
              defaultBg: "var(--surface-muted)",
              defaultColor: "var(--ink-muted)",
            },
            Modal: {
              titleFontSize: 18,
            },
            Segmented: {
              itemSelectedBg: "var(--surface)",
              itemSelectedColor: "var(--ink)",
              trackBg: "var(--surface-muted)",
            },
            Tabs: {
              titleFontSize: 13,
              inkBarColor: "var(--ink)",
              itemActiveColor: "var(--ink)",
              itemSelectedColor: "var(--ink)",
              itemHoverColor: "var(--ink)",
            },
            Input: {
              colorBgContainer: "var(--surface)",
              activeBorderColor: "var(--accent)",
              hoverBorderColor: "var(--border-strong)",
            },
            Select: {
              colorBgContainer: "var(--surface)",
            },
          },
        }}
      >
        <AntdApp>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
