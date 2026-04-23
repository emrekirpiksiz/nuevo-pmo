"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { clearAuth } from "@/lib/auth";
import { Sidebar, SidebarItem, SIDEBAR_ICONS } from "./Sidebar";
import { Topbar } from "./Topbar";

interface Props {
  kind: "admin" | "customer";
  children: ReactNode;
  /** Sayfa kendi crumb yığınını verirse onu kullan. Aksi halde route'tan üretilir. */
  crumbs?: string[];
}

const ADMIN_PRIMARY: SidebarItem[] = [
  { key: "dashboard", href: "/admin", label: "Panel", icon: SIDEBAR_ICONS.dashboard, exact: true },
  { key: "inbox", href: "/admin/inbox", label: "Gelen Kutusu", icon: SIDEBAR_ICONS.inbox },
  { key: "customers", href: "/admin/customers", label: "Müşteriler", icon: SIDEBAR_ICONS.customers },
  { key: "projects", href: "/admin/projects", label: "Projeler", icon: SIDEBAR_ICONS.projects },
  { key: "_sep1", label: "", icon: null, separator: true } as unknown as SidebarItem,
  { key: "reports", href: "/admin/reports", label: "Raporlar", icon: SIDEBAR_ICONS.reports },
  { key: "tickets", href: "/admin/tickets", label: "Tickets", icon: SIDEBAR_ICONS.tickets },
  { key: "analytics", href: "/admin/analytics", label: "Analitik", icon: SIDEBAR_ICONS.analytics },
];

const CUSTOMER_PRIMARY: SidebarItem[] = [
  { key: "dashboard", href: "/portal", label: "Panel", icon: SIDEBAR_ICONS.dashboard, exact: true },
  { key: "inbox", href: "/portal/inbox", label: "Gelen Kutusu", icon: SIDEBAR_ICONS.inbox },
];

const ROUTE_LABELS: Record<string, string> = {
  admin: "Nuevo PMP",
  portal: "Nuevo PMP",
  customers: "Müşteriler",
  projects: "Projeler",
  documents: "Dokümanlar",
  comments: "Yorumlar",
  inbox: "Gelen Kutusu",
  reports: "Raporlar",
  tickets: "Tickets",
  plan: "Proje Planı",
  analytics: "Analitik",
  login: "Giriş",
};

function defaultCrumbs(pathname: string, kind: "admin" | "customer"): string[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: string[] = ["Nuevo PMP"];
  // İlk segment admin/portal — başlığa zaten "Nuevo PMP" var, atla.
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    // Slug benzeri (uuid/id/sayı) segmentler için generic etiket koymayalım
    if (/^[0-9a-f-]{6,}$/i.test(seg) || /^\d+$/.test(seg)) continue;
    crumbs.push(ROUTE_LABELS[seg] ?? seg);
  }
  if (crumbs.length === 1) {
    crumbs.push(kind === "admin" ? "Panel" : "Panel");
  }
  return crumbs;
}

export function AppShell({ kind, children, crumbs }: Props) {
  const { user, ready, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/admin/login");
      return;
    }
    if (kind === "admin" && user?.userType !== "Nuevo") {
      router.replace("/portal");
    }
    if (kind === "customer" && user?.userType !== "Customer") {
      router.replace("/admin");
    }
  }, [ready, isAuthenticated, user, router, kind]);

  const primary = kind === "admin" ? ADMIN_PRIMARY : CUSTOMER_PRIMARY;

  const computedCrumbs = useMemo(
    () => crumbs && crumbs.length > 0 ? crumbs : defaultCrumbs(pathname, kind),
    [crumbs, pathname, kind]
  );

  if (!ready || !isAuthenticated) {
    return (
      <div className="page" style={{ padding: 48 }}>
        <span className="subtle">Yükleniyor…</span>
      </div>
    );
  }

  const onLogout = () => {
    clearAuth();
    router.push("/admin/login");
  };

  return (
    <div className="app">
      <Sidebar primary={primary} user={user} onLogout={onLogout} />
      <div className="main">
        <Topbar crumbs={computedCrumbs} kind={kind} />
        {children}
      </div>
    </div>
  );
}
