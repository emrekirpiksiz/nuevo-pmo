"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App as AntdApp,
  Button,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MessageOutlined,
  StarFilled,
} from "@ant-design/icons";
import { DocumentEditor, DocumentEditorHandle } from "@/features/editor/DocumentEditor";
import { CommentsPanel } from "@/features/comments/CommentsPanel";
import { CommentDrawer } from "@/features/comments/CommentDrawer";
import { useCommentNavigation } from "@/features/comments/useCommentNavigation";
import { Comment, CommentsApi, DocumentsApi } from "@/lib/apis";
import { API_BASE_URL, extractErrorMessage } from "@/lib/api";
import { useViewTracker } from "@/features/documents/useViewTracker";
import { computeEffectiveBlockIdMap } from "@/features/editor/effectiveBlockId";
import { CommentNavigator } from "@/features/documents/CommentNavigator";
import { ChangesView } from "@/features/documents/ChangesView";
import { SegTabs } from "@/components/SegTabs";
import { useCrumbsStore } from "@/lib/useCrumbsStore";

type ViewMode = "editor" | "comments" | "changes" | "approvals";
const EMPTY_COMMENTS: Comment[] = [];

export default function CustomerDocumentPage() {
  const params = useParams<{ id: string; docId: string }>();
  const router = useRouter();
  const docId = params.docId;
  const projectId = params.id;
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const { setCrumbs, clearCrumbs } = useCrumbsStore();

  const editorRef = useRef<DocumentEditorHandle>(null);
  const [mode, setMode] = useState<ViewMode>("editor");
  const [selectedBlock, setSelectedBlock] = useState<{ blockId: string; text: string } | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [newCommentDrawer, setNewCommentDrawer] = useState<null | {
    blockId: string;
    anchorText: string;
  }>(null);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ["document", docId],
    queryFn: () => DocumentsApi.get(docId),
  });
  const { data: content } = useQuery({
    queryKey: ["document-content", docId],
    queryFn: () => DocumentsApi.content(docId),
    enabled: !!document?.customerVersionId,
  });
  const { data: approvals = [] } = useQuery({
    queryKey: ["document-approvals", docId],
    queryFn: () => DocumentsApi.approvals(docId),
  });
  const { data: allComments = EMPTY_COMMENTS } = useQuery({
    queryKey: ["comments", docId],
    queryFn: () => CommentsApi.list(docId),
    enabled: !!document?.customerVersionId,
  });

  useViewTracker(docId, !!content);

  // Topbar breadcrumb güncelle
  useEffect(() => {
    if (document) {
      setCrumbs(["Nuevo PMP", "Projeler", document.projectName, document.title]);
    }
    return () => clearCrumbs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id, document?.projectName, document?.title]);

  const [blockTextMap, setBlockTextMap] = useState<Map<string, string>>(new Map());
  const refreshBlockTextMap = useCallback(() => {
    const m = editorRef.current?.extractLiveBlockTextMap();
    if (m && m.size > 0) setBlockTextMap(m);
  }, []);

  const effectiveBlockIdMap = useMemo(
    () => computeEffectiveBlockIdMap(allComments, blockTextMap),
    [allComments, blockTextMap]
  );

  const ensureEditorMounted = useCallback(() => {
    // Yoruma tıklanınca editor tab'ına otomatik geç.
    setMode((m) => (m === "editor" ? m : "editor"));
  }, []);

  const onMissingBlock = useCallback(
    () =>
      message.warning(
        "Bu yoruma ait blok güncel içerikte bulunamadı. Yorum paneli açıldı.",
        3
      ),
    [message]
  );

  const nav = useCommentNavigation({
    docId,
    allComments,
    effectiveBlockIdMap,
    blockTextMap,
    editorRef,
    ensureEditorMounted,
    onMissingBlock,
  });

  const { consumePendingFocus } = nav;
  const lastLoadedContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!content || !editorRef.current) return;
    const sig = `${content.documentId}|${(content.contentJson ?? "").length}`;
    if (lastLoadedContentRef.current !== sig) {
      lastLoadedContentRef.current = sig;
      const md = content.contentMarkdown ?? "";
      const mdHasTable = /^\s*\|[^\n]*\|\s*$/m.test(md);
      const jsonHasTable = content.contentJson?.includes('"type":"table"');
      if (mdHasTable && !jsonHasTable) {
        editorRef.current.setContentFromMarkdown(md);
      } else {
        try {
          const obj = JSON.parse(content.contentJson);
          editorRef.current.setContent(obj, md);
        } catch {
          editorRef.current.setContentFromMarkdown(md);
        }
      }
      requestAnimationFrame(() => refreshBlockTextMap());
      setTimeout(() => refreshBlockTextMap(), 250);
    }
    // Editor tab aktifken pending focus'u tüket — yorumdan gelen scroll
    // isteği mount'tan hemen sonra tutunabilir.
    if (mode === "editor") consumePendingFocus();
  }, [content, mode, consumePendingFocus, refreshBlockTextMap]);

  const commentBadges = useMemo(() => {
    const map = new Map<string, number>();
    allComments
      .filter((c) => c.status === "Open")
      .forEach((c) => {
        const eff = effectiveBlockIdMap.get(c.blockId);
        if (!eff) return;
        map.set(eff, (map.get(eff) ?? 0) + 1);
      });
    return Array.from(map.entries()).map(([blockId, count]) => ({ blockId, count }));
  }, [allComments, effectiveBlockIdMap]);

  const highlightedBlockIds = useMemo(
    () =>
      new Set(
        allComments
          .filter((c) => c.status === "Open")
          .map((c) => effectiveBlockIdMap.get(c.blockId))
          .filter((x): x is string => !!x)
      ),
    [allComments, effectiveBlockIdMap]
  );

  const handleBadgeClick = useCallback(
    (effectiveBlockId: string) => {
      const match = allComments.find(
        (c) => (effectiveBlockIdMap.get(c.blockId) ?? c.blockId) === effectiveBlockId
      );
      if (match) nav.goTo(match);
    },
    [allComments, effectiveBlockIdMap, nav]
  );

  const handleCommentRequest = useCallback(
    (payload: { blockId: string; anchorText: string }) => {
      if (!content) return;
      setNewCommentDrawer(payload);
    },
    [content]
  );

  const approveMut = useMutation({
    mutationFn: () => DocumentsApi.approve(docId, approveNote || undefined),
    onSuccess: () => {
      message.success("Onaylandı.");
      setApproveOpen(false);
      setApproveNote("");
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-approvals", docId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const handleExport = () => {
    const token = localStorage.getItem("nuevo_pmo_token");
    const url = `${API_BASE_URL}/api/documents/${docId}/export.docx`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Export failed");
        const blob = await r.blob();
        const href = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = href;
        a.download = `${document?.title ?? "document"}.docx`;
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch((e) => message.error(extractErrorMessage(e)));
  };

  const alreadyApproved = useMemo(() => {
    if (!document?.customerVersionId) return false;
    return approvals.some((a) => a.documentVersionId === document.customerVersionId);
  }, [approvals, document?.customerVersionId]);

  if (docLoading) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (document && !document.customerVersionId) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/portal/projects/${projectId}`)}
            style={{ marginLeft: -8, color: "var(--ink-muted)" }}
          >
            {document.projectName}
          </Button>
        </div>
        <div className="card" style={{ padding: 60 }}>
          <Empty description="Bu doküman henüz sizinle paylaşılmadı. Nuevo ekibi taslağı yayınladığında görüntüleyebilirsiniz." />
        </div>
      </div>
    );
  }

  const openCount = allComments.filter((c) => c.status === "Open").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      <div
        style={{
          padding: "10px 32px 0",
          borderBottom: "1px solid var(--border)",
          background: "var(--canvas)",
          position: "sticky",
          top: 56,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div className="row" style={{ marginBottom: 4, minHeight: 22 }}>
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/portal/projects/${projectId}`)}
            style={{ marginLeft: -8, color: "var(--ink-muted)", height: 22, padding: "0 6px" }}
          >
            {document?.projectName ?? "Proje"}
          </Button>
          <span className="subtle">/</span>
          <span className="subtle" style={{ fontSize: 12 }}>
            Dokümanlar
          </span>
          <div
            className="row subtle ellipsis"
            style={{
              marginLeft: "auto",
              fontSize: 11.5,
              gap: 8,
              flexShrink: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {document?.customerVersionMarkedAt && (
              <span>
                Yayınlandı: {new Date(document.customerVersionMarkedAt).toLocaleString("tr-TR")}
              </span>
            )}
          </div>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 10, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 26,
              margin: 0,
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
              lineHeight: 1.15,
            }}
            title={document?.title ?? ""}
          >
            {document?.title}
          </h1>
          {document?.customerDisplay && (
            <span className="pill pill-accent" style={{ flexShrink: 0 }}>
              <StarFilled style={{ fontSize: 10 }} /> {document.customerDisplay}
            </span>
          )}
          {alreadyApproved && (
            <span className="pill pill-ok" style={{ flexShrink: 0 }}>
              <CheckCircleFilled style={{ fontSize: 10 }} /> Onayladınız
            </span>
          )}
        </div>

        <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SegTabs<ViewMode>
              value={mode}
              onChange={setMode}
              items={[
                { key: "editor", label: "Doküman", icon: <FileTextOutlined /> },
                {
                  key: "comments",
                  label: "Yorumlar",
                  icon: <MessageOutlined />,
                  count: openCount,
                },
                { key: "changes", label: "Değişiklikler", icon: <HistoryOutlined /> },
                {
                  key: "approvals",
                  label: "Onaylar",
                  count: approvals.length,
                },
              ]}
            />
          </div>
          <div
            className="row"
            style={{
              gap: 6,
              flexShrink: 0,
              paddingBottom: 6,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {mode === "editor" && (
              <CommentNavigator
                total={nav.openComments.length}
                currentIndex={nav.currentIndex}
                onPrev={nav.prev}
                onNext={nav.next}
              />
            )}
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              disabled={alreadyApproved}
              onClick={() => setApproveOpen(true)}
            >
              {alreadyApproved ? "Onayladınız" : "Onayla"}
            </Button>
            <Button size="small" icon={<CloudDownloadOutlined />} onClick={handleExport}>
              Word
            </Button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding: "20px 24px",
            visibility: mode === "editor" ? "visible" : "hidden",
            pointerEvents: mode === "editor" ? "auto" : "none",
          }}
          aria-hidden={mode !== "editor"}
        >
          <Alert
            showIcon
            type="info"
            message="Bu dokümanı yalnızca okuyabilir, metin seçip yorum yapabilirsiniz."
            style={{ marginBottom: 12, maxWidth: 808, margin: "0 auto 12px" }}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            <DocumentEditor
              ref={editorRef}
              editable={false}
              initialJson={
                content
                  ? safeParse(content.contentJson)
                  : { type: "doc", content: [{ type: "paragraph" }] }
              }
              initialMarkdown={content?.contentMarkdown ?? ""}
              onBlockSelect={setSelectedBlock}
              highlightedBlockIds={highlightedBlockIds}
              commentBadges={commentBadges}
              onBadgeClick={handleBadgeClick}
              selectedBlockId={nav.focusBlockId}
              activeSelectionBlockId={selectedBlock?.blockId ?? null}
              onCommentRequest={handleCommentRequest}
            />
          </div>
        </div>

        {mode === "comments" && (
          <div style={{ position: "absolute", inset: 0, overflow: "auto", padding: "20px 24px", background: "var(--canvas)" }}>
            <CommentsPanel
              documentId={docId}
              focusBlockId={nav.focusBlockId}
              onCommentSelect={nav.goTo}
              blockTextMap={blockTextMap}
            />
          </div>
        )}

        {mode === "changes" && (
          <div style={{ position: "absolute", inset: 0, overflow: "auto", background: "var(--canvas)" }}>
            <ChangesView
              documentId={docId}
              versionId={document?.customerVersionId ?? undefined}
            />
          </div>
        )}

        {mode === "approvals" && (
          <div style={{ position: "absolute", inset: 0, overflow: "auto", padding: "20px 24px", background: "var(--canvas)" }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <div className="card">
                <div className="card-head">
                  <h2 className="card-title">Onay Geçmişi</h2>
                  <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
                    {approvals.length} onay
                  </span>
                </div>
                {approvals.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }} className="subtle">
                    Henüz onay yok.
                  </div>
                ) : (
                  approvals.map((a, i) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "16px 20px",
                        borderBottom: i < approvals.length - 1 ? "1px solid var(--border)" : "none",
                        display: "grid",
                        gridTemplateColumns: "70px 1fr",
                        gap: 16,
                      }}
                    >
                      <div>
                        <span className="tag tag-accent">{a.versionDisplay}</span>
                      </div>
                      <div>
                        <div className="row" style={{ marginBottom: 4, gap: 8 }}>
                          <strong>{a.approvedByName}</strong>
                          <span className="subtle mono" style={{ fontSize: 11.5 }}>
                            {new Date(a.approvedAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        {a.note && (
                          <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                            {a.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={approveOpen}
        title="Onay"
        onCancel={() => setApproveOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Bu dokümanı (<b>{document?.customerDisplay}</b>) onaylıyor musunuz?
          </Typography.Text>
          <Input.TextArea
            rows={3}
            placeholder="Not (opsiyonel)"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
          <Space>
            <Button
              type="primary"
              loading={approveMut.isPending}
              onClick={() => approveMut.mutate()}
            >
              Onayla
            </Button>
            <Button onClick={() => setApproveOpen(false)}>İptal</Button>
          </Space>
        </Space>
      </Modal>

      <CommentDrawer
        state={
          newCommentDrawer
            ? {
                kind: "new",
                open: true,
                documentId: docId,
                blockId: newCommentDrawer.blockId,
                anchorText: newCommentDrawer.anchorText,
              }
            : nav.drawer
        }
        onClose={() => {
          if (newCommentDrawer) setNewCommentDrawer(null);
          else nav.setDrawer({ kind: "closed" });
        }}
        threadNav={{
          position: nav.currentIndex >= 0 ? nav.currentIndex + 1 : undefined,
          total: nav.openComments.length,
          onPrev: nav.prev,
          onNext: nav.next,
        }}
      />
    </div>
  );
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}
