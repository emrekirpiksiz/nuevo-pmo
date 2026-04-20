"use client";

import { Button, Card, Empty, Input, List, Segmented, Space, Tag, Tooltip, Typography, App as AntdApp } from "antd";
import { CheckOutlined, UndoOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Comment, CommentsApi, CommentStatus } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useState } from "react";

const STATUS_TABS: { value: "Open" | "Resolved" | "Orphaned"; label: string }[] = [
  { value: "Open", label: "Açık" },
  { value: "Resolved", label: "Kapalı" },
  { value: "Orphaned", label: "Orphaned" },
];

interface Props {
  documentId: string;
  versionId?: string;
  canResolve: boolean;
  selectedBlock: { blockId: string; text: string } | null;
  canComment: boolean;
  onCommentsChange?: (comments: Comment[]) => void;
}

export function CommentsPanel({ documentId, versionId, canResolve, canComment, selectedBlock, onCommentsChange }: Props) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const [activeStatus, setActiveStatus] = useState<"Open" | "Resolved" | "Orphaned">("Open");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});

  const statuses: CommentStatus[] = [activeStatus];

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", documentId, activeStatus],
    queryFn: async () => {
      const list = await CommentsApi.list(documentId, statuses);
      onCommentsChange?.(list);
      return list;
    },
  });

  const createMut = useMutation({
    mutationFn: () => {
      if (!versionId || !selectedBlock) throw new Error("Lütfen bir blok seçin.");
      return CommentsApi.create(documentId, {
        versionId,
        blockId: selectedBlock.blockId,
        anchorText: selectedBlock.text,
        body: newBody,
      });
    },
    onSuccess: () => {
      message.success("Yorum eklendi.");
      setNewBody("");
      qc.invalidateQueries({ queryKey: ["comments", documentId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const replyMut = useMutation({
    mutationFn: (v: { id: string; body: string }) => CommentsApi.reply(v.id, v.body),
    onSuccess: (_res, vars) => {
      setReplyBody((p) => ({ ...p, [vars.id]: "" }));
      qc.invalidateQueries({ queryKey: ["comments", documentId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => CommentsApi.resolve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", documentId] }),
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const reopenMut = useMutation({
    mutationFn: (id: string) => CommentsApi.reopen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", documentId] }),
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <Card
      size="small"
      title="Yorumlar"
      extra={
        <Segmented
          size="small"
          value={activeStatus}
          onChange={(v) => setActiveStatus(v as typeof activeStatus)}
          options={STATUS_TABS.map((o) => ({ label: o.label, value: o.value }))}
        />
      }
    >
      {canComment && (
        <Card size="small" type="inner" title="Yeni Yorum" style={{ marginBottom: 12 }}>
          {selectedBlock ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Seçili blok:
              </Typography.Text>
              <blockquote style={{ margin: 0, padding: "6px 10px", background: "#fafafa", borderLeft: "3px solid #1677ff", fontSize: 13 }}>
                {selectedBlock.text || <em>(boş blok)</em>}
              </blockquote>
              <Input.TextArea rows={3} value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Yorumunuz…" />
              <Button
                type="primary"
                size="small"
                disabled={!newBody.trim() || !versionId}
                loading={createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                Gönder
              </Button>
            </Space>
          ) : (
            <Typography.Text type="secondary">Doküman üzerinde bir bloğu seçtiğinizde burada yorum ekleyebilirsiniz.</Typography.Text>
          )}
        </Card>
      )}

      {comments.length === 0 ? (
        <Empty description="Yorum yok" />
      ) : (
        <List
          dataSource={comments}
          renderItem={(c) => (
            <List.Item key={c.id} style={{ display: "block", padding: "8px 0" }}>
              <Space direction="vertical" style={{ width: "100%" }} size={4}>
                <Space size="small">
                  <Tag color="blue">V{c.versionNumber}</Tag>
                  <Typography.Text strong>{c.createdByName || "Kullanıcı"}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </Typography.Text>
                  {c.status === "Orphaned" && <Tag color="red">Orphaned</Tag>}
                </Space>
                {c.anchorText && (
                  <blockquote style={{ margin: 0, padding: "4px 8px", background: "#fafafa", borderLeft: "2px solid #d9d9d9", fontSize: 12 }}>
                    {c.anchorText}
                  </blockquote>
                )}
                <div>{c.body}</div>
                {c.replies?.length > 0 && (
                  <div style={{ marginLeft: 16, borderLeft: "2px solid #f0f0f0", paddingLeft: 12 }}>
                    {c.replies.map((r) => (
                      <div key={r.id} style={{ marginBottom: 6 }}>
                        <Typography.Text strong>{r.createdByName}</Typography.Text>{" "}
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(r.createdAt).toLocaleString()}
                        </Typography.Text>
                        <div>{r.body}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Space>
                  <Input
                    size="small"
                    value={replyBody[c.id] ?? ""}
                    onChange={(e) => setReplyBody((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="Yanıt yaz"
                    style={{ width: 240 }}
                  />
                  <Button
                    size="small"
                    disabled={!replyBody[c.id]?.trim()}
                    onClick={() => replyMut.mutate({ id: c.id, body: replyBody[c.id] })}
                  >
                    Yanıtla
                  </Button>
                  {canResolve && c.status === "Open" && (
                    <Tooltip title="Resolved olarak işaretle">
                      <Button size="small" icon={<CheckOutlined />} onClick={() => resolveMut.mutate(c.id)}>Resolve</Button>
                    </Tooltip>
                  )}
                  {canResolve && c.status === "Resolved" && (
                    <Tooltip title="Yeniden aç">
                      <Button size="small" icon={<UndoOutlined />} onClick={() => reopenMut.mutate(c.id)}>Reopen</Button>
                    </Tooltip>
                  )}
                </Space>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
