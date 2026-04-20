"use client";

import { AppShell } from "@/components/AppShell";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return <AppShell kind="admin">{children}</AppShell>;
}
