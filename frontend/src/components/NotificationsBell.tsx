"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellOutlined,
  CheckOutlined,
  CommentOutlined,
  FileTextOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Badge, Button, Empty, Popover, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationDto, NotificationsApi, NotificationType } from "@/lib/apis";

const POLL_INTERVAL_MS = 30_000;

const ICONS: Record<NotificationType, React.ReactNode> = {
  DocumentPublished: <FileTextOutlined style={{ color: "#1677ff" }} />,
  CommentCreated: <CommentOutlined style={{ color: "#b8903e" }} />,
  CommentReplied: <MessageOutlined style={{ color: "#5a7a5a" }} />,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.round((now - d.getTime()) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}g önce`;
  return d.toLocaleDateString("tr-TR");
}

export function NotificationsBell() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const inboxHref = pathname.startsWith("/portal") ? "/portal/inbox" : "/admin/inbox";

  const { data } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => NotificationsApi.list({ take: 10 }),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => NotificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => NotificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleItemClick = async (n: NotificationDto) => {
    setOpen(false);
    if (!n.isRead) {
      try {
        await markRead.mutateAsync(n.id);
      } catch {
        // yine de yönlendirme yapılsın
      }
    }
    if (n.actionUrl) router.push(n.actionUrl);
  };

  const content = useMemo(
    () => (
      <div style={{ width: 380, maxHeight: 480, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 4px 10px",
            borderBottom: "1px solid var(--border, #eee)",
            marginBottom: 6,
          }}
        >
          <Typography.Text strong>Bildirimler</Typography.Text>
          {unreadCount > 0 ? (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              Tümünü okundu yap
            </Button>
          ) : null}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {items.length === 0 ? (
            <div style={{ padding: 16 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Henüz bildirim yok" />
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 8px",
                  width: "100%",
                  background: n.isRead ? "transparent" : "rgba(22,119,255,0.06)",
                  border: "none",
                  borderBottom: "1px solid var(--border, #f0f0f0)",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, marginTop: 2 }}>{ICONS[n.type]}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: n.isRead ? 400 : 600,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-muted, #888)",
                      marginBottom: 4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.body}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-subtle, #aaa)",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    {n.projectName ? <span>{n.projectName}</span> : null}
                    <span>·</span>
                    <span>{formatTime(n.createdAt)}</span>
                  </div>
                </span>
                {!n.isRead ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#1677ff",
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
              </button>
            ))
          )}
        </div>
        <div
          style={{
            padding: "8px 4px 2px",
            borderTop: "1px solid var(--border, #eee)",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          <Button
            type="link"
            size="small"
            onClick={() => {
              setOpen(false);
              router.push(inboxHref);
            }}
          >
            Tümünü göster
          </Button>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, unreadCount, markAllRead.isPending]
  );

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={content}
      styles={{ body: { padding: 8 } }}
    >
      <button type="button" className="tb-btn" aria-label="Bildirimler">
        <Badge count={unreadCount} size="small" overflowCount={99}>
          <BellOutlined style={{ fontSize: 15 }} />
        </Badge>
      </button>
    </Popover>
  );
}
