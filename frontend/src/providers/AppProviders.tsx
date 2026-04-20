"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App as AntdApp } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import trTR from "antd/locale/tr_TR";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      })
  );

  return (
    <AntdRegistry>
      <ConfigProvider
        locale={trTR}
        theme={{
          token: {
            colorPrimary: "#1677ff",
            borderRadius: 8,
          },
          components: {
            Layout: {
              headerBg: "#001529",
              siderBg: "#001529",
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
