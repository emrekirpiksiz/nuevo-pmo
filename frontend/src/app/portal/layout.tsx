"use client";

import { AppShell } from "@/components/AppShell";
import { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <AppShell kind="customer">{children}</AppShell>;
}
