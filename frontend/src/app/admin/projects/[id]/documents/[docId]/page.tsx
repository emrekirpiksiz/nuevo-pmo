"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App as AntdApp,
  Button,
  Divider,
  Input,
  Modal,
  Popover,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MessageOutlined,
  SaveOutlined,
  StarFilled,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DocumentEditor,
  DocumentEditorHandle,
} from "@/features/editor/DocumentEditor";
import { CommentsPanel } from "@/features/comments/CommentsPanel";
import { CommentDrawer } from "@/features/comments/CommentDrawer";
import { useCommentNavigation } from "@/features/comments/useCommentNavigation";
import { Comment, CommentsApi, DocumentApprovalDto, DocumentsApi } from "@/lib/apis";
import { API_BASE_URL, extractErrorMessage } from "@/lib/api";
import { AnalyticsView } from "@/features/documents/AnalyticsView";
import { ChangesView } from "@/features/documents/ChangesView";
import { CommentNavigator } from "@/features/documents/CommentNavigator";
import { computeEffectiveBlockIdMap } from "@/features/editor/effectiveBlockId";
import { SegTabs } from "@/components/SegTabs";
import { useCrumbsStore } from "@/lib/useCrumbsStore";

type ViewMode = "editor" | "comments" | "changes" | "analytics";
const EMPTY_COMMENTS: Comment[] = [];
const EMPTY_APPROVALS: DocumentApprovalDto[] = [];

export default function AdminDocumentEditorPage() {
  const params = useParams<{ id: string; docId: string }>();
  const router = useRouter();
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const docId = params.docId;
  const projectId = params.id;
  const { setCrumbs, clearCrumbs } = useCrumbsStore();

  const editorRef = useRef<DocumentEditorHandle>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>("editor");
  const [selectedBlock, setSelectedBlock] = useState<{
    blockId: string;
    text: string;
  } | null>(null);
  const [newCommentDrawer, setNewCommentDrawer] = useState<null | {
    blockId: string;
    anchorText: string;
  }>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLabel, setPublishLabel] = useState("");

  const { data: document } = useQuery({
    queryKey: ["document", docId],
    queryFn: () => DocumentsApi.get(docId),
  });

  const { data: approvals = EMPTY_APPROVALS } = useQuery({
    queryKey: ["document-approvals", docId],
    queryFn: () => DocumentsApi.approvals(docId),
    enabled: (document?.approvalCount ?? 0) > 0,
  });

  const { data: allComments = EMPTY_COMMENTS } = useQuery({
    queryKey: ["comments", docId],
    queryFn: () => CommentsApi.list(docId),
  });

  const { data: content } = useQuery({
    queryKey: ["document-content", docId],
    queryFn: () => DocumentsApi.content(docId),
  });

  // Topbar breadcrumb'ı dinamik olarak güncelle
  useEffect(() => {
    if (document) {
      setCrumbs(["Nuevo PMP", "Projeler", document.projectName, document.title]);
    }
    return () => clearCrumbs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id, document?.projectName, document?.title]);

  // Canlı blockTextMap
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
    setMode((m) => (m === "editor" ? m : "editor"));
  }, []);

  const onMissingBlock = useCallback(
    () =>
      message.warning(
        "Bu yoruma ait blok güncel içerikte bulunamadı (blok silinmiş olabilir). Yorum paneli açıldı.",
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

  const commentingAllowed = !!document?.customerVersionId;

  const handleCommentRequest = useCallback(
    (payload: { blockId: string; anchorText: string }) => {
      if (!commentingAllowed) {
        message.info(
          "Yorumlar yalnız yayınlanmış müşteri sürümü üzerinde yapılır. Önce 'Müşteri Sürümü Yayınla'."
        );
        return;
      }
      setNewCommentDrawer(payload);
    },
    [commentingAllowed, message]
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const json = editorRef.current?.getContentJson() ?? "{}";
      const md = editorRef.current?.getContentMarkdown() ?? "";
      return DocumentsApi.save(docId, json, md);
    },
    onSuccess: () => {
      message.success("Taslak kaydedildi.");
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-content", docId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      const json = editorRef.current?.getContentJson() ?? "{}";
      const md = editorRef.current?.getContentMarkdown() ?? "";
      await DocumentsApi.save(docId, json, md);
      return DocumentsApi.publish(docId, publishLabel.trim() || undefined);
    },
    onSuccess: (d) => {
      const major = d.customerMajor ?? d.currentMajor;
      message.success(`v${major}.0 olarak yayınlandı.`);
      setPublishOpen(false);
      setPublishLabel("");
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-content", docId] });
      qc.invalidateQueries({ queryKey: ["comments", docId] });
      qc.invalidateQueries({ queryKey: ["document-changes", docId] });
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
        const cd = r.headers.get("content-disposition") ?? "";
        const fname =
          /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ??
          `${document?.title ?? "document"}.docx`;
        const href = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = href;
        a.download = decodeURIComponent(fname);
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch((e) => message.error(extractErrorMessage(e)));
  };

  const openCount = allComments.filter((c) => c.status === "Open").length;
  const hasDraft = document?.hasDraftChanges ?? false;
  const approvalCount = document?.approvalCount ?? 0;

  // Onay detayları popover içeriği
  const approvalPopoverContent = (
    <div style={{ maxWidth: 320, minWidth: 220 }}>
      {approvals.length === 0 ? (
        <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>Yükleniyor…</span>
      ) : (
        approvals.map((a, i) => (
          <div key={a.id} style={{ marginBottom: i < approvals.length - 1 ? 12 : 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.approvedByName}</div>
            <div style={{ color: "var(--ink-muted)", fontSize: 12, marginTop: 2 }}>
              {a.versionDisplay} sürümünü onayladı
            </div>
            <div style={{ color: "var(--ink-subtle)", fontSize: 11, marginTop: 1 }}>
              {new Date(a.approvedAt).toLocaleString("tr-TR")}
            </div>
            {a.note && (
              <div style={{ fontSize: 12, fontStyle: "italic", marginTop: 4, color: "var(--ink-muted)" }}>
                "{a.note}"
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Sticky sub-topbar */}
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
        {/* Breadcrumb satırı */}
        <div className="row" style={{ marginBottom: 4, minHeight: 22 }}>
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/admin/projects/${projectId}`)}
            style={{ marginLeft: -8, color: "var(--ink-muted)", height: 22, padding: "0 6px" }}
          >
            {document?.projectName ?? "Proje"}
          </Button>
          <span className="subtle">/</span>
          <span className="subtle" style={{ fontSize: 12 }}>
            Dokümanlar
          </span>
          {document?.title && (
            <>
              <span className="subtle">/</span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ink-muted)",
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {document.title}
              </span>
            </>
          )}
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
            {document?.draftUpdatedAt && (
              <span>
                Taslak: {new Date(document.draftUpdatedAt).toLocaleString("tr-TR")}
              </span>
            )}
            {openCount > 0 && (
              <>
                <span>·</span>
                <span>{openCount} açık yorum</span>
              </>
            )}
          </div>
        </div>

        {/* Başlık + pill'ler */}
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
            {document?.title ?? "—"}
          </h1>
          {document?.customerDisplay ? (
            <span className="pill pill-accent" style={{ flexShrink: 0 }}>
              <StarFilled style={{ fontSize: 10 }} /> Yayın: {document.customerDisplay}
            </span>
          ) : (
            <span className="pill pill-neutral" style={{ flexShrink: 0 }}>
              Henüz yayınlanmadı
            </span>
          )}
          {hasDraft && (
            <span className="pill pill-warn" style={{ flexShrink: 0 }}>
              Taslak değişiklik
            </span>
          )}
          {approvalCount > 0 && (
            <Popover
              title={`${approvalCount} Onay`}
              content={approvalPopoverContent}
              trigger="hover"
              placement="bottomRight"
            >
              <span
                className="pill pill-ok"
                style={{ flexShrink: 0, cursor: "pointer" }}
              >
                <CheckOutlined style={{ fontSize: 10 }} /> {approvalCount} onay
              </span>
            </Popover>
          )}
        </div>

        {/* Tab bar + aksiyonlar */}
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
                { key: "analytics", label: "Analitik", icon: <BarChartOutlined /> },
              ]}
            />
          </div>

          {/* Aksiyon butonları — yeniden tasarlandı */}
          <div
            className="row"
            style={{
              gap: 0,
              flexShrink: 0,
              paddingBottom: 6,
              alignItems: "center",
            }}
          >
            {/* Yorum navigasyonu */}
            {mode === "editor" && openCount > 0 && (
              <>
                <CommentNavigator
                  total={nav.openComments.length}
                  currentIndex={nav.currentIndex}
                  onPrev={nav.prev}
                  onNext={nav.next}
                />
                <Divider type="vertical" style={{ height: 20, margin: "0 8px" }} />
              </>
            )}

            {/* Kaydet — ikincil aksiyon, daha soluk */}
            <Tooltip title="Taslağı kaydet — henüz müşteriye açılmaz">
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={() => saveMut.mutate()}
                loading={saveMut.isPending}
                style={{ marginRight: 4, color: "var(--ink-muted)", borderColor: "var(--border)" }}
              >
                Kaydet
              </Button>
            </Tooltip>

            {/* Yayınla — birincil aksiyon */}
            <Tooltip title="Taslağı yeni müşteri sürümü olarak yayınla">
              <Button
                type="primary"
                size="small"
                icon={<CloudUploadOutlined />}
                onClick={() => setPublishOpen(true)}
                style={{ marginRight: 8 }}
              >
                Yayınla
              </Button>
            </Tooltip>

            <Divider type="vertical" style={{ height: 16, margin: "0 4px 0 0" }} />

            {/* Word indirme */}
            <Tooltip title="Word (.docx) olarak indir">
              <Button
                size="small"
                icon={<CloudDownloadOutlined />}
                onClick={handleExport}
                type="text"
                style={{ color: "var(--ink-muted)" }}
              >
                Word
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Body — drawer bu wrapper içinde render edilir, header'ı kapatamaz */}
      <div ref={bodyWrapperRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* İçerik panoları — overflow: hidden bu iç sarmalayıcıda */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            visibility: mode === "editor" ? "visible" : "hidden",
            pointerEvents: mode === "editor" ? "auto" : "none",
          }}
          aria-hidden={mode !== "editor"}
        >
          {!commentingAllowed && (
            <div
              className="card"
              style={{
                padding: "10px 14px",
                margin: "12px auto 0",
                maxWidth: 860,
                width: "100%",
                fontSize: 13,
                color: "var(--ink-muted)",
                flexShrink: 0,
              }}
            >
              Bu doküman henüz yayınlanmadı. Yorumlar ve müşteri etkileşimi ilk{" "}
              <strong>Yayınla</strong> sonrasında açılır.
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <DocumentEditor
              ref={editorRef}
              editable
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
            <ChangesView documentId={docId} />
          </div>
        )}

        {mode === "analytics" && (
          <div style={{ position: "absolute", inset: 0, overflow: "auto", background: "var(--canvas)" }}>
            <AnalyticsView documentId={docId} />
          </div>
        )}
        </div>{/* /içerik panoları */}

        {/* CommentDrawer — body wrapper içinde, sticky header'ın altında */}
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
          getContainer={() => bodyWrapperRef.current!}
        />
      </div>

      <Modal
        open={publishOpen}
        title="Müşteri Sürümü Yayınla"
        onCancel={() => setPublishOpen(false)}
        okText={`v${(document?.currentMajor ?? 0) + 1}.0 olarak yayınla`}
        okButtonProps={{ type: "primary", icon: <CloudUploadOutlined /> }}
        confirmLoading={publishMut.isPending}
        onOk={() => publishMut.mutate()}
        destroyOnHidden
      >
        <p style={{ marginTop: 0 }}>
          Taslak içerik <strong>v{(document?.currentMajor ?? 0) + 1}.0</strong> olarak
          yayınlanacak. Açık yorumlar <strong>açık kalmaya devam eder</strong> — yorumları
          manuel olarak <em>Çözüldü</em> işaretleyerek kapatabilirsiniz.
        </p>
        <p className="subtle" style={{ fontSize: 13 }}>
          İsteğe bağlı etiket — iç audit için (örn. &quot;şube onayı sonrası&quot;).
        </p>
        <Input
          value={publishLabel}
          onChange={(e) => setPublishLabel(e.target.value)}
          placeholder="Etiket (opsiyonel)"
          maxLength={256}
        />
      </Modal>

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
