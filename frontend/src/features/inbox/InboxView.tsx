"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckOutlined,
  CommentOutlined,
  FileTextOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Button, Empty, List, Segmented, Space, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import {
  NotificationDto,
  NotificationsApi,
  NotificationType,
} from "@/lib/apis";

type FilterKey = "all" | "unread" | "comments" | "documents";

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "unread", label: "Okunmamış" },
  { value: "comments", label: "Yorumlar" },
  { value: "documents", label: "Dokümanlar" },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  DocumentPublished: "Yayın",
  CommentCreated: "Yorum",
  CommentReplied: "Yanıt",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  DocumentPublished: "blue",
  CommentCreated: "orange",
  CommentReplied: "green",
};

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  DocumentPublished: <FileTextOutlined />,
  CommentCreated: <CommentOutlined />,
  CommentReplied: <MessageOutlined />,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByProject(items: NotificationDto[]): Array<{ key: string; label: string; items: NotificationDto[] }> {
  const map = new Map<string, { label: string; items: NotificationDto[] }>();
  for (const n of items) {
    const key = n.projectId ?? "__none__";
    const label = n.projectName ?? "Genel";
    if (!map.has(key)) map.set(key, { label, items: [] });
    map.get(key)!.items.push(n);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items }));
}

export function InboxView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "inbox", filter],
    queryFn: () =>
      NotificationsApi.list({
        unreadOnly: filter === "unread",
        take: 200,
      }),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => NotificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => NotificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const filtered = useMemo(() => {
    if (filter === "comments") {
      return items.filter(
        (n) => n.type === "CommentCreated" || n.type === "CommentReplied"
      );
    }
    if (filter === "documents") {
      return items.filter((n) => n.type === "DocumentPublished");
    }
    return items;
  }, [items, filter]);

  const groups = useMemo(() => groupByProject(filtered), [filtered]);

  const handleClick = async (n: NotificationDto) => {
    if (!n.isRead) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        // yönlendirme yine de yapılsın
      }
    }
    if (n.actionUrl) router.push(n.actionUrl);
  };

  return (
    <div className="page" style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <PageHeader
        eyebrow="Workspace · Bildirimler"
        title="Gelen Kutusu"
        description="Yayın, yorum ve yanıtlar tek bir akışta toplanır. Tıklayarak ilgili dokümana gidin."
        actions={
          unreadCount > 0 ? (
            <Button
              icon={<CheckOutlined />}
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              Tümünü okundu yap ({unreadCount})
            </Button>
          ) : null
        }
      />

      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
          options={FILTERS.map((f) => ({ label: f.label, value: f.value }))}
        />
      </div>

      {isLoading ? (
        <div className="subtle" style={{ padding: 32, textAlign: "center" }}>
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 32 }}>
          <Empty description="Bu filtreye uygun bildirim yok" />
        </div>
      ) : (
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          {groups.map((g) => (
            <div key={g.key} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border, #eee)",
                  background: "var(--surface-muted, #fafafa)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {g.label}
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                  ({g.items.length})
                </Typography.Text>
              </div>
              <List
                dataSource={g.items}
                renderItem={(n) => (
                  <List.Item
                    onClick={() => handleClick(n)}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      background: n.isRead ? "transparent" : "rgba(22,119,255,0.04)",
                    }}
                    actions={[
                      !n.isRead ? (
                        <Button
                          key="read"
                          size="small"
                          type="text"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate(n.id);
                          }}
                        >
                          Okundu
                        </Button>
                      ) : null,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={
                        <span style={{ fontSize: 20, marginTop: 2 }}>
                          {TYPE_ICONS[n.type]}
                        </span>
                      }
                      title={
                        <Space size={8}>
                          <Tag color={TYPE_COLORS[n.type]} style={{ margin: 0 }}>
                            {TYPE_LABELS[n.type]}
                          </Tag>
                          <span style={{ fontWeight: n.isRead ? 400 : 600 }}>
                            {n.title}
                          </span>
                        </Space>
                      }
                      description={
                        <div>
                          <div
                            style={{
                              color: "var(--ink-muted, #666)",
                              marginBottom: 4,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {n.body}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-subtle, #aaa)" }}>
                            {n.documentTitle ? (
                              <>
                                <span>{n.documentTitle}</span>
                                <span style={{ margin: "0 6px" }}>·</span>
                              </>
                            ) : null}
                            <span>{formatDate(n.createdAt)}</span>
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ))}
        </Space>
      )}
    </div>
  );
}
