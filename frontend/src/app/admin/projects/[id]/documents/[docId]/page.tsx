"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Dropdown, Row, Select, Space, Tag, Typography, App as AntdApp, Tabs, List } from "antd";
import { CloudDownloadOutlined, SaveOutlined, SendOutlined, BarChartOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentEditor, DocumentEditorHandle } from "@/features/editor/DocumentEditor";
import { CommentsPanel } from "@/features/comments/CommentsPanel";
import { Comment, DocumentsApi, DocumentVersionDto } from "@/lib/apis";
import { API_BASE_URL, extractErrorMessage } from "@/lib/api";
import { AnalyticsView } from "@/features/documents/AnalyticsView";

export default function AdminDocumentEditorPage() {
  const params = useParams<{ id: string; docId: string }>();
  const router = useRouter();
  const { message, modal } = AntdApp.useApp();
  const qc = useQueryClient();
  const docId = params.docId;

  const editorRef = useRef<DocumentEditorHandle>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{ blockId: string; text: string } | null>(null);
  const [commentBlocks, setCommentBlocks] = useState<Set<string>>(new Set());

  const { data: document } = useQuery({ queryKey: ["document", docId], queryFn: () => DocumentsApi.get(docId) });
  const { data: versions = [] } = useQuery({ queryKey: ["document-versions", docId], queryFn: () => DocumentsApi.versions(docId) });

  const activeVersionId = selectedVersionId ?? document?.currentDraftVersionId ?? document?.publishedVersionId ?? null;
  const activeVersion = useMemo(() => versions.find((v) => v.id === activeVersionId) ?? null, [versions, activeVersionId]);
  const isEditing = !!activeVersion && !activeVersion.isPublished && activeVersion.id === document?.currentDraftVersionId;

  const { data: versionContent, refetch: refetchContent } = useQuery({
    queryKey: ["document-version-content", docId, activeVersionId],
    queryFn: () => (activeVersionId ? DocumentsApi.version(docId, activeVersionId) : Promise.resolve(null)),
    enabled: !!activeVersionId,
  });

  useEffect(() => {
    if (versionContent) {
      try {
        const obj = JSON.parse(versionContent.contentJson);
        editorRef.current?.setContent(obj);
      } catch {
        // invalid json
      }
    }
  }, [versionContent]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const json = editorRef.current?.getContentJson() ?? "{}";
      const md = editorRef.current?.getContentMarkdown() ?? "";
      const v = await DocumentsApi.saveContent(docId, json, md);
      return v;
    },
    onSuccess: (v: DocumentVersionDto) => {
      message.success(`V${v.versionNumber} kaydedildi.`);
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-versions", docId] });
      qc.invalidateQueries({ queryKey: ["comments", docId] });
      setSelectedVersionId(v.id);
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const publishMut = useMutation({
    mutationFn: (vid: string) => DocumentsApi.publish(docId, vid).then(() => vid),
    onSuccess: () => {
      message.success("Yayınlandı.");
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-versions", docId] });
    },
    onError: (e) => message.error(extractErrorMessage(e)),
  });

  const handleExport = () => {
    const token = localStorage.getItem("nuevo_pmo_token");
    const url = `${API_BASE_URL}/api/documents/${docId}/export.docx${activeVersionId ? `?versionId=${activeVersionId}` : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Export failed");
        const blob = await r.blob();
        const cd = r.headers.get("content-disposition") ?? "";
        const fname = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? `${document?.title ?? "document"}.docx`;
        const href = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = href;
        a.download = decodeURIComponent(fname);
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch((e) => message.error(extractErrorMessage(e)));
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>{document?.title}</Typography.Title>
          <Space size="small">
            <Typography.Text type="secondary">{document?.projectName}</Typography.Text>
            {document?.publishedVersionNumber && <Tag color="green">Published V{document.publishedVersionNumber}</Tag>}
            {document?.approvedVersionNumber && <Tag color="gold">Approved V{document.approvedVersionNumber}</Tag>}
          </Space>
        </div>
        <Space wrap>
          <Select
            style={{ minWidth: 200 }}
            value={activeVersionId ?? undefined}
            onChange={(v) => setSelectedVersionId(v)}
            options={versions.map((v) => ({
              value: v.id,
              label: `V${v.versionNumber}${v.isPublished ? " (Published)" : v.isDraft ? " (Draft)" : ""}${v.isApproved ? " ✓" : ""}`,
            }))}
          />
          <Button icon={<SaveOutlined />} type="primary" onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            Draft Kaydet
          </Button>
          {activeVersion && !activeVersion.isPublished && (
            <Button
              icon={<SendOutlined />}
              onClick={() =>
                modal.confirm({
                  title: `V${activeVersion.versionNumber} yayınlansın mı?`,
                  content: "Yayınlanan versiyonlar müşteri tarafından görünür olur.",
                  onOk: () => publishMut.mutateAsync(activeVersion.id),
                })
              }
            >
              Publish
            </Button>
          )}
          <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>Word Export</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card>
            <DocumentEditor
              ref={editorRef}
              editable={isEditing}
              initialJson={versionContent ? JSON.parse(versionContent.contentJson) : { type: "doc", content: [{ type: "paragraph" }] }}
              onBlockSelect={setSelectedBlock}
              highlightedBlockIds={commentBlocks}
            />
            {!isEditing && activeVersion && (
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Bu versiyon {activeVersion.isPublished ? "published" : "geçmiş draft"} olduğundan salt okunurdur.
                Yeni değişiklik yapmak için <a onClick={() => setSelectedVersionId(document?.currentDraftVersionId ?? null)}>güncel draft'a</a> geçin.
              </Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Tabs
            items={[
              {
                key: "comments",
                label: "Yorumlar",
                children: (
                  <CommentsPanel
                    documentId={docId}
                    versionId={activeVersionId ?? undefined}
                    selectedBlock={selectedBlock}
                    canComment={!!isEditing === false ? true : true}
                    canResolve={true}
                    onCommentsChange={(cs: Comment[]) => setCommentBlocks(new Set(cs.filter((c) => c.status === "Open").map((c) => c.blockId)))}
                  />
                ),
              },
              {
                key: "versions",
                label: "Versiyonlar",
                children: (
                  <Card size="small">
                    <List
                      dataSource={versions}
                      renderItem={(v) => (
                        <List.Item
                          onClick={() => setSelectedVersionId(v.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <Space>
                            <Tag color={v.isPublished ? "green" : "default"}>V{v.versionNumber}</Tag>
                            {v.isDraft && <Tag>Current Draft</Tag>}
                            {v.isApproved && <Tag color="gold">Approved</Tag>}
                            <Typography.Text type="secondary">{new Date(v.createdAt).toLocaleString()}</Typography.Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </Card>
                ),
              },
              {
                key: "analytics",
                label: (
                  <span>
                    <BarChartOutlined /> Analitik
                  </span>
                ),
                children: <AnalyticsView documentId={docId} />,
              },
            ]}
          />
        </Col>
      </Row>
    </Space>
  );
}
