"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography, App as AntdApp, Modal, List } from "antd";
import { CloudDownloadOutlined, CheckOutlined } from "@ant-design/icons";
import { DocumentEditor, DocumentEditorHandle } from "@/features/editor/DocumentEditor";
import { CommentsPanel } from "@/features/comments/CommentsPanel";
import { Comment, DocumentsApi } from "@/lib/apis";
import { API_BASE_URL, extractErrorMessage } from "@/lib/api";
import { useViewTracker } from "@/features/documents/useViewTracker";

export default function CustomerDocumentPage() {
  const params = useParams<{ id: string; docId: string }>();
  const docId = params.docId;
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();

  const editorRef = useRef<DocumentEditorHandle>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{ blockId: string; text: string } | null>(null);
  const [commentBlocks, setCommentBlocks] = useState<Set<string>>(new Set());
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");

  const { data: document } = useQuery({ queryKey: ["document", docId], queryFn: () => DocumentsApi.get(docId) });
  const { data: versions = [] } = useQuery({ queryKey: ["document-versions", docId], queryFn: () => DocumentsApi.versions(docId) });

  const activeVersionId = selectedVersionId ?? document?.publishedVersionId ?? null;
  const activeVersion = useMemo(() => versions.find((v) => v.id === activeVersionId) ?? null, [versions, activeVersionId]);

  const { data: versionContent } = useQuery({
    queryKey: ["document-version-content", docId, activeVersionId],
    queryFn: () => (activeVersionId ? DocumentsApi.version(docId, activeVersionId) : Promise.resolve(null)),
    enabled: !!activeVersionId,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["document-approvals", docId],
    queryFn: () => DocumentsApi.approvals(docId),
  });

  useEffect(() => {
    if (versionContent) {
      try {
        const obj = JSON.parse(versionContent.contentJson);
        editorRef.current?.setContent(obj);
      } catch {
        // ignore
      }
    }
  }, [versionContent]);

  useViewTracker(docId, activeVersionId, true);

  const approveMut = useMutation({
    mutationFn: () => DocumentsApi.approve(docId, activeVersionId!, approveNote || undefined),
    onSuccess: () => {
      message.success("Versiyon onaylandı.");
      setApproveOpen(false);
      setApproveNote("");
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["document-approvals", docId] });
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
        const href = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = href;
        a.download = `${document?.title ?? "document"}.docx`;
        a.click();
        URL.revokeObjectURL(href);
      })
      .catch((e) => message.error(extractErrorMessage(e)));
  };

  const isApprovedHere = !!activeVersion && document?.approvedVersionId === activeVersion.id;

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
              label: `V${v.versionNumber}${v.isPublished ? " (Published)" : ""}${v.isApproved ? " ✓" : ""}`,
            }))}
          />
          <Button
            icon={<CheckOutlined />}
            type="primary"
            disabled={!activeVersion?.isPublished || isApprovedHere}
            onClick={() => setApproveOpen(true)}
          >
            {isApprovedHere ? "Onaylandı" : "Versiyonu Onayla"}
          </Button>
          <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>Word Export</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card>
            <DocumentEditor
              ref={editorRef}
              editable={false}
              initialJson={versionContent ? JSON.parse(versionContent.contentJson) : { type: "doc", content: [{ type: "paragraph" }] }}
              onBlockSelect={setSelectedBlock}
              highlightedBlockIds={commentBlocks}
            />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <CommentsPanel
            documentId={docId}
            versionId={activeVersionId ?? undefined}
            selectedBlock={selectedBlock}
            canComment={!!activeVersion?.isPublished}
            canResolve={false}
            onCommentsChange={(cs: Comment[]) => setCommentBlocks(new Set(cs.filter((c) => c.status === "Open").map((c) => c.blockId)))}
          />

          <Card size="small" title="Onay Geçmişi" style={{ marginTop: 12 }}>
            <List
              dataSource={approvals}
              locale={{ emptyText: "Henüz onay yok." }}
              renderItem={(a) => (
                <List.Item>
                  <Space direction="vertical" size={0}>
                    <div>
                      <Tag color="gold">V{a.versionNumber}</Tag>
                      <Typography.Text strong>{a.approvedByName}</Typography.Text>
                    </div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(a.approvedAt).toLocaleString()}
                    </Typography.Text>
                    {a.note && <Typography.Text>{a.note}</Typography.Text>}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Modal open={approveOpen} title="Versiyonu Onayla" onCancel={() => setApproveOpen(false)} footer={null}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Bu işlem, <b>V{activeVersion?.versionNumber}</b> versiyonunu sizin adınıza onaylayacaktır.
          </Typography.Text>
          <Input.TextArea
            rows={3}
            placeholder="Not (opsiyonel)"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
          <Space>
            <Button type="primary" loading={approveMut.isPending} onClick={() => approveMut.mutate()}>Onayla</Button>
            <Button onClick={() => setApproveOpen(false)}>İptal</Button>
          </Space>
        </Space>
      </Modal>
    </Space>
  );
}
