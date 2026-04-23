"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Empty, Skeleton, Tag, Tooltip } from "antd";
import {
  ArrowRightOutlined,
  BellOutlined,
  CommentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  NotificationsApi,
  NotificationType,
  Project,
  ProjectPlanApi,
  ProjectsApi,
  ProjectStatus,
  CustomersApi,
} from "@/lib/apis";
import { useSession } from "@/lib/useSession";
import { PageHeader } from "@/components/PageHeader";
import { Kpi, KpiGrid } from "@/components/Kpi";
import { StatusPill } from "@/components/StatusPill";
import { isMilestoneOverdue, formatDate } from "@/features/projectPlan/helpers";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  Active: "Aktif",
  OnHold: "Beklemede",
  Completed: "Tamamlandı",
  Cancelled: "İptal",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  Active: "#6b7a5a",
  OnHold: "#b8903e",
  Completed: "#4a6a8a",
  Cancelled: "#a74c3a",
};

const ACTIVITY_ICON: Record<NotificationType, React.ReactNode> = {
  DocumentPublished: <FileTextOutlined style={{ color: "#4a6a8a" }} />,
  CommentCreated: <CommentOutlined style={{ color: "#6b7a5a" }} />,
  CommentReplied: <BellOutlined style={{ color: "#b8903e" }} />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 2) return "az önce";
  if (min < 60) return `${min}d önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}s önce`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}g önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function AdminHomePage() {
  const { user } = useSession();

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => CustomersApi.list(),
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectsApi.list(),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["notifications", "admin-feed"],
    queryFn: () => NotificationsApi.list({ take: 15 }),
  });

  const activeProjects = useMemo(
    () => projects?.filter((p) => p.status === "Active") ?? [],
    [projects]
  );

  const planQueries = useQueries({
    queries: activeProjects.map((p) => ({
      queryKey: ["project-plan", p.id],
      queryFn: () => ProjectPlanApi.getCurrent(p.id),
    })),
  });

  const greetingName = useMemo(() => {
    const dn = user?.displayName ?? "";
    return dn.split(" ")[0] || dn || "Hoş geldiniz";
  }, [user]);

  const today = useMemo(() => {
    const d = new Date();
    const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const totalDocs = projects?.reduce((acc, p) => acc + (p.documentCount ?? 0), 0) ?? 0;
  const totalMembers = projects?.reduce((acc, p) => acc + (p.memberCount ?? 0), 0) ?? 0;

  const byStatus = useMemo(() => {
    const map: Record<ProjectStatus, number> = {
      Active: 0, OnHold: 0, Completed: 0, Cancelled: 0,
    };
    (projects ?? []).forEach((p) => { map[p.status] = (map[p.status] ?? 0) + 1; });
    return (Object.keys(map) as ProjectStatus[])
      .filter((k) => map[k] > 0)
      .map((k) => ({ k, label: STATUS_LABEL[k], v: map[k], c: STATUS_COLOR[k] }));
  }, [projects]);

  const topProjects: Project[] = activeProjects.slice(0, 5);

  const plansLoading = planQueries.some((q) => q.isLoading);
  const customerPendingItems = useMemo(() => {
    return planQueries.flatMap((q, i) => {
      if (!q.data) return [];
      const project = activeProjects[i];
      return q.data.milestones
        .filter((m) => m.type === "CustomerPending" && m.status === "Pending")
        .map((m) => ({ ...m, projectId: project?.id ?? "", projectName: project?.name ?? "" }));
    });
  }, [planQueries, activeProjects]);

  const overdueCount = customerPendingItems.filter(isMilestoneOverdue).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={today}
        title={`Günaydın, ${greetingName}.`}
        description={
          <>
            Portföyünüzde <strong>{customersLoading ? "—" : customers?.length ?? 0}</strong> müşteri ve{" "}
            <strong>{projectsLoading ? "—" : projects?.length ?? 0}</strong> proje var.
            {overdueCount > 0 && (
              <> <strong style={{ color: "var(--danger)" }}>{overdueCount} müşteri beklentisi</strong> gecikmiş durumda.</>
            )}
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi
          label="Aktif Proje"
          value={projectsLoading ? <Skeleton.Button active size="small" /> : activeProjects.length}
          hint={projectsLoading ? "" : `${projects?.length ?? 0} toplam projeden`}
        />
        <Kpi
          label="Müşteri"
          value={customersLoading ? <Skeleton.Button active size="small" /> : customers?.length ?? 0}
          hint={
            customersLoading
              ? ""
              : `${customers?.reduce((a, c) => a + (c.userCount ?? 0), 0) ?? 0} kullanıcı`
          }
        />
        <Kpi
          label="Toplam Doküman"
          value={projectsLoading ? <Skeleton.Button active size="small" /> : totalDocs}
          hint="Tüm projeler arası"
        />
        <Kpi
          label="Toplam Üye"
          value={projectsLoading ? <Skeleton.Button active size="small" /> : totalMembers}
          hint="Proje üyelikleri"
        />
      </KpiGrid>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        {/* Aktif Projeler */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Aktif Projeler</h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Sürmekte olan portföy
              </div>
            </div>
            <Link
              href="/admin/projects"
              className="btn btn-ghost btn-sm"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--ink-muted)",
                padding: "0 10px",
                height: 28,
                borderRadius: 6,
                fontSize: 12.5,
              }}
            >
              Tümü <ArrowRightOutlined style={{ fontSize: 11 }} />
            </Link>
          </div>
          {projectsLoading ? (
            <div style={{ padding: 20 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : topProjects.length === 0 ? (
            <div style={{ padding: 32 }}>
              <Empty description="Aktif proje yok" />
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Proje</th>
                  <th>Müşteri</th>
                  <th>Doküman</th>
                  <th>Üye</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((p) => (
                  <tr key={p.id} style={{ cursor: "pointer" }}>
                    <td style={{ paddingLeft: 20 }}>
                      <Link
                        href={`/admin/projects/${p.id}`}
                        style={{ display: "block", color: "inherit" }}
                      >
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div className="subtle mono" style={{ fontSize: 11.5 }}>{p.code}</div>
                      </Link>
                    </td>
                    <td className="muted">{p.customerName}</td>
                    <td className="num mono">{p.documentCount}</td>
                    <td className="num mono">{p.memberCount}</td>
                    <td style={{ textAlign: "right", paddingRight: 16 }}>
                      <ArrowRightOutlined style={{ color: "var(--ink-subtle)", fontSize: 11 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Müşteriden Beklenenler */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Müşteriden Beklenenler</h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Aktif proje planlarından
              </div>
            </div>
            {overdueCount > 0 && (
              <Tag
                color="red"
                style={{ marginLeft: "auto", borderRadius: 6, fontSize: 11 }}
              >
                {overdueCount} gecikmiş
              </Tag>
            )}
          </div>
          {plansLoading || projectsLoading ? (
            <div style={{ padding: 20 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : customerPendingItems.length === 0 ? (
            <div style={{ padding: 32 }}>
              <Empty description="Bekleyen müşteri beklentisi yok" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <div style={{ padding: "0 0 8px" }}>
              {customerPendingItems.map((m, idx) => {
                const overdue = isMilestoneOverdue(m);
                return (
                  <Link
                    key={`${m.projectId}-${idx}`}
                    href={`/admin/projects/${m.projectId}?tab=plan`}
                    style={{ display: "block", color: "inherit" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 20px",
                        borderBottom: "1px solid var(--border)",
                        background: overdue ? "rgba(167,76,58,0.04)" : "transparent",
                        transition: "background 0.12s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = overdue
                          ? "rgba(167,76,58,0.08)"
                          : "var(--surface-muted)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background = overdue
                          ? "rgba(167,76,58,0.04)"
                          : "transparent";
                      }}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        {overdue ? (
                          <ExclamationCircleOutlined
                            style={{ color: "var(--danger)", fontSize: 14 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--warn)",
                              margin: "3px 3px",
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>
                          {m.title}
                        </div>
                        <div
                          className="muted"
                          style={{ fontSize: 11.5, marginTop: 2, display: "flex", gap: 8 }}
                        >
                          <span>{m.projectName}</span>
                          {m.deadline && (
                            <>
                              <span>·</span>
                              <Tooltip title={overdue ? "Süre geçti!" : "Son tarih"}>
                                <span style={{ color: overdue ? "var(--danger)" : undefined }}>
                                  {formatDate(m.deadline)}
                                </span>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginTop: 20 }}>
        {/* Portföy Dağılımı */}
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Portföy Dağılımı</h2>
          </div>
          <div style={{ padding: 20 }}>
            {projectsLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : byStatus.length === 0 ? (
              <Empty description="Henüz proje yok" />
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    height: 8,
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 20,
                  }}
                >
                  {byStatus.map((b) => (
                    <div key={b.k} style={{ flex: b.v, background: b.c }} />
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {byStatus.map((b) => (
                    <div key={b.k} className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: b.c }} />
                        <span style={{ fontSize: 13 }}>{b.label}</span>
                      </div>
                      <span className="mono subtle">{b.v} proje</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Son Aktiviteler */}
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Son Aktiviteler</h2>
            <span className="subtle" style={{ marginLeft: "auto", fontSize: 12 }}>
              Tüm projeler
            </span>
          </div>
          {activityLoading ? (
            <div style={{ padding: 20 }}>
              <Skeleton active paragraph={{ rows: 5 }} />
            </div>
          ) : !activity || activity.items.length === 0 ? (
            <div style={{ padding: 32 }}>
              <Empty
                description="Henüz aktivite yok"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <div style={{ padding: "0 0 8px" }}>
              {activity.items.map((n) => (
                <Link
                  key={n.id}
                  href={n.actionUrl ?? "#"}
                  style={{ display: "block", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 20px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "var(--surface-muted)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "var(--surface-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 13,
                      }}
                    >
                      {ACTIVITY_ICON[n.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                        className="ellipsis"
                      >
                        {n.title}
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: 11.5, marginTop: 2, display: "flex", gap: 6 }}
                      >
                        {n.projectName && <span className="ellipsis">{n.projectName}</span>}
                        {n.projectName && <span>·</span>}
                        <span style={{ flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--accent)",
                          flexShrink: 0,
                          marginTop: 5,
                        }}
                      />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
