"use client";

import {
  App as AntdApp,
  Button,
  Divider,
  Drawer,
  Input,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckOutlined,
  LeftOutlined,
  RightOutlined,
  SendOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Comment, CommentsApi } from "@/lib/apis";
import { extractErrorMessage } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { diffWordsWithSpace } from "diff";
import { useSession } from "@/lib/useSession";

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export type CommentDrawerMode =
  | {
      kind: "new";
      open: boolean;
      documentId: string;
      blockId: string;
      anchorText: string;
    }
  | {
      kind: "thread";
      open: boolean;
      documentId: string;
      commentId: string;
      /** Şu an dokümanda ilgili bloğun text'i — açık yorumlar için live diff. */
      currentBlockText?: string | null;
    }
  | { kind: "closed" };

export interface ThreadNavProps {
  position?: number;
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

interface Props {
  state: CommentDrawerMode;
  onClose: () => void;
  onCreated?: (comment: Comment) => void;
  threadNav?: ThreadNavProps;
  /** Drawer'ın render edileceği DOM elementi. Geçilirse drawer o konteynere göre mutlak konumlanır. */
  getContainer?: () => HTMLElement;
}

export function CommentDrawer({ state, onClose, onCreated, threadNav, getContainer }: Props) {
  if (state.kind === "new") return <NewCommentDrawer state={state} onClose={onClose} onCreated={onCreated} getContainer={getContainer} />;
  if (state.kind === "thread") return <ThreadDrawer state={state} onClose={onClose} nav={threadNav} getContainer={getContainer} />;
  return <Drawer open={false} onClose={onClose} />;
}

function NewCommentDrawer({
  state,
  onClose,
  onCreated,
  getContainer,
}: {
  state: Extract<CommentDrawerMode, { kind: "new" }>;
  onClose: () => void;
  onCreated?: (c: Comment) => void;
  getContainer?: () => HTMLElement;
}) {
  const [body, setBody] = useState("");
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();

  useEffect(() => {
    if (state.open) setBody("");
  }, [state.open, state.blockId]);

  const createMut = useMutation({
    mutationFn: () =>
      CommentsApi.create(state.documentId, {
        blockId: state.blockId,
        anchorText: state.anchorText,
        body,
      }),
    onSuccess: (c) => {
      message.success("Yorum eklendi.");
      setBody("");
      qc.invalidateQueries({ queryKey: ["comments", state.documentId] });
      onCreated?.(c);
      onClose();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title="Yeni Yorum"
      placement="right"
      width={420}
      destroyOnHidden
      mask={false}
      keyboard
      getContainer={getContainer}
      style={getContainer ? { position: "absolute" } : undefined}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Seçilen metin
          </Typography.Text>
          <blockquote className="cdrawer-quote" style={{ margin: "4px 0 0" }}>
            {state.anchorText || <em>(boş)</em>}
          </blockquote>
        </div>
        <Input.TextArea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Yorumunuz…"
          autoFocus
        />
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!body.trim()}
            loading={createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Gönder
          </Button>
          <Button onClick={onClose}>İptal</Button>
        </Space>
      </Space>
    </Drawer>
  );
}

function ThreadDrawer({
  state,
  onClose,
  nav,
  getContainer,
}: {
  state: Extract<CommentDrawerMode, { kind: "thread" }>;
  onClose: () => void;
  nav?: ThreadNavProps;
  getContainer?: () => HTMLElement;
}) {
  const qc = useQueryClient();
  const { message } = AntdApp.useApp();
  const { user } = useSession();
  const [replyBody, setReplyBody] = useState("");

  const { data: comment, isLoading } = useQuery<Comment | null>({
    queryKey: ["comment-thread", state.documentId, state.commentId],
    queryFn: async () => {
      for (const s of ["Open", "Resolved", "Orphaned"] as const) {
        const list = await CommentsApi.list(state.documentId, [s]);
        const found = list.find((c) => c.id === state.commentId);
        if (found) return found;
      }
      return null;
    },
    enabled: state.open,
  });

  useEffect(() => {
    if (state.open) setReplyBody("");
  }, [state.open, state.commentId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["comments", state.documentId] });
    qc.invalidateQueries({ queryKey: ["comment-thread", state.documentId, state.commentId] });
  };

  const replyMut = useMutation({
    mutationFn: () => CommentsApi.reply(state.commentId, replyBody),
    onSuccess: () => {
      setReplyBody("");
      invalidate();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const resolveMut = useMutation({
    mutationFn: () => CommentsApi.resolve(state.commentId),
    onSuccess: () => {
      message.success("Yorum çözüldü olarak işaretlendi.");
      invalidate();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const reopenMut = useMutation({
    mutationFn: () => CommentsApi.reopen(state.commentId),
    onSuccess: () => {
      message.success("Yorum yeniden açıldı.");
      invalidate();
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const isOpen = comment?.status === "Open";
  const isResolved = comment?.status === "Resolved";
  const isOrphaned = comment?.status === "Orphaned";
  const isNuevo = user?.userType === "Nuevo";
  const isOwner = !!user && !!comment && comment.createdBy === user.id;
  const canResolve = isNuevo && isOpen;
  // Müşteri sadece kendi yorumunu yeniden açabilir; Nuevo her zaman.
  const canReopen = isResolved && (isNuevo || isOwner);

  const anchor = comment?.anchorText ?? "";
  const newerText = state.currentBlockText ?? "";
  // Açık yorumlarda anchor ile şu anki blok metni arasında diff
  const hasDiff = useMemo(() => {
    if (!isOpen || !newerText) return false;
    return normalize(anchor) !== normalize(newerText);
  }, [isOpen, anchor, newerText]);
  const diffParts = useMemo(
    () => (hasDiff ? diffWordsWithSpace(anchor, newerText) : []),
    [hasDiff, anchor, newerText]
  );

  return (
    <Drawer
      open={state.open}
      onClose={onClose}
      title={
        <Space size={6} wrap>
          {nav && nav.total && nav.total > 0 && (
            <Space size={4}>
              <Tooltip title="Önceki yorum">
                <Button size="small" icon={<LeftOutlined />} onClick={nav.onPrev} />
              </Tooltip>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                <b>{nav.position}</b> / {nav.total}
              </span>
              <Tooltip title="Sıradaki yorum">
                <Button size="small" icon={<RightOutlined />} onClick={nav.onNext} />
              </Tooltip>
            </Space>
          )}
          <span>Yorum</span>
          {isResolved && (
            <span className="pill pill-ok">
              Çözüldü{comment?.resolvedByName ? ` · ${comment.resolvedByName}` : ""}
            </span>
          )}
          {isOrphaned && <span className="pill pill-danger">Blok silinmiş</span>}
        </Space>
      }
      placement="right"
      width={460}
      destroyOnHidden
      mask={false}
      keyboard
      getContainer={getContainer}
      style={getContainer ? { position: "absolute" } : undefined}
      extra={
        comment ? (
          <Space size={6}>
            {canResolve && (
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => resolveMut.mutate()}
                loading={resolveMut.isPending}
              >
                Çözüldü
              </Button>
            )}
            {canReopen && (
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={() => reopenMut.mutate()}
                loading={reopenMut.isPending}
              >
                Yeniden aç
              </Button>
            )}
          </Space>
        ) : null
      }
    >
      {isLoading && <Typography.Text type="secondary">Yükleniyor…</Typography.Text>}
      {!isLoading && !comment && <Typography.Text type="secondary">Yorum bulunamadı.</Typography.Text>}
      {comment && (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {/* Anchor */}
          {anchor && !hasDiff && (
            <blockquote className="cdrawer-quote" style={{ margin: 0 }}>
              {anchor}
            </blockquote>
          )}

          {/* Diff (yalnız açık yorumda blok değişmişse) */}
          {hasDiff && (
            <div className="track-changes" style={{ margin: 0 }}>
              <div className="tc-header">
                <span className="tc-chip tc-chip-old">
                  {comment.forVersionMajor != null ? `v${comment.forVersionMajor}.0` : "Yorumda"}
                </span>
                <span className="tc-arrow">→</span>
                <span className="tc-chip tc-chip-new">Güncel</span>
              </div>
              <div className="tc-body">
                {diffParts.map((p, i) => {
                  if (p.added) return <ins key={i} className="tc-add">{p.value}</ins>;
                  if (p.removed) return <del key={i} className="tc-del">{p.value}</del>;
                  return <span key={i}>{p.value}</span>;
                })}
              </div>
            </div>
          )}

          {/* Yorum gövdesi */}
          <div>
            <div className="row" style={{ gap: 8 }}>
              <Typography.Text strong>{comment.createdByName || "Kullanıcı"}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(comment.createdAt).toLocaleString("tr-TR")}
              </Typography.Text>
              {comment.forVersionMajor != null && (
                <span className="tag" style={{ marginLeft: "auto" }}>
                  v{comment.forVersionMajor}.0
                </span>
              )}
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{comment.body}</div>
          </div>

          {/* Yanıtlar */}
          {comment.replies?.length > 0 && (
            <>
              <Divider style={{ margin: "8px 0" }}>Yanıtlar ({comment.replies.length})</Divider>
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {comment.replies.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--surface-muted)",
                      borderRadius: 6,
                    }}
                  >
                    <div className="row" style={{ gap: 8 }}>
                      <Typography.Text strong>{r.createdByName}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(r.createdAt).toLocaleString("tr-TR")}
                      </Typography.Text>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{r.body}</div>
                  </div>
                ))}
              </Space>
            </>
          )}

          {/* Çözüldüyse bilgi + yanıt formu yine açık (yanıt yazılırsa yorum reopen
              olur — backend AddReplyHandler içinde). Orphaned ise yazma yok. */}
          {isResolved && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Yorum <b>çözüldü</b> olarak işaretli. Yanıt yazmanız halinde yeniden açılır.
            </Typography.Text>
          )}

          {!isOrphaned && (
            <>
              <Divider style={{ margin: "8px 0" }}>Yanıt Yaz</Divider>
              <Input.TextArea
                rows={3}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Yanıtınız…"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                disabled={!replyBody.trim()}
                loading={replyMut.isPending}
                onClick={() => replyMut.mutate()}
              >
                Yanıtla
              </Button>
            </>
          )}
        </Space>
      )}
    </Drawer>
  );
}
