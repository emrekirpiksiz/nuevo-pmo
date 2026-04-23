"use client";

import { Empty, Skeleton, Tooltip } from "antd";
import { CommentOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { DocumentsApi } from "@/lib/apis";
import { diffWordsWithSpace } from "diff";
import { useMemo } from "react";

interface Props {
  documentId: string;
  /** Belirli bir yayınlı sürümün değişikliklerini göster; boşsa tüm geçmiş. */
  versionId?: string | null;
}

export function ChangesView({ documentId, versionId }: Props) {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["document-changes", documentId, versionId ?? "all"],
    queryFn: () => DocumentsApi.changes(documentId, versionId ?? undefined),
  });

  const grouped = useMemo(() => {
    const byVersion = new Map<string, typeof changes>();
    for (const c of changes) {
      const key = c.toVersionId;
      const arr = byVersion.get(key) ?? [];
      arr.push(c);
      byVersion.set(key, arr);
    }
    // En yeni yayın üstte
    return Array.from(byVersion.entries())
      .map(([vid, items]) => ({
        versionId: vid,
        major: items[0]?.toVersionMajor ?? 0,
        fromMajor: items[0]?.fromVersionMajor ?? null,
        publishedAt: items[0]?.publishedAt ?? items[0]?.createdAt,
        publishedByName: items[0]?.publishedByName ?? null,
        items,
      }))
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
  }, [changes]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 24px" }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px" }}>
        <Empty
          description={
            <>
              Henüz kayıtlı bir değişiklik yok.
              <br />
              <span className="subtle" style={{ fontSize: 12 }}>
                İlk yayın "baseline" kabul edilir — aradaki farklar sonraki yayınlarda
                listelenir.
              </span>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 24px" }}>
      {grouped.map((g) => (
        <div key={g.versionId} style={{ marginBottom: 24 }}>
          <div className="row" style={{ marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
            <span className="tag tag-accent">v{g.major}.0</span>
            {g.fromMajor != null && g.fromMajor >= 0 && (
              <span className="subtle mono" style={{ fontSize: 12 }}>
                ← v{g.fromMajor}.0
              </span>
            )}
            <span className="subtle" style={{ fontSize: 12 }}>
              · {g.items.length} değişiklik
            </span>
            <span className="subtle mono" style={{ fontSize: 11.5, marginLeft: "auto" }}>
              {g.publishedByName ? `${g.publishedByName} · ` : ""}
              {new Date(g.publishedAt).toLocaleString("tr-TR")}
            </span>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            {g.items.map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: i < g.items.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                  <KindPill kind={c.kind} />
                  {c.relatedCommentId && (
                    <Tooltip title={c.relatedCommentBody ?? "İlgili yorum"}>
                      <span className="pill pill-accent">
                        <CommentOutlined style={{ fontSize: 10 }} /> Yorum karşılandı
                      </span>
                    </Tooltip>
                  )}
                  <span className="subtle mono" style={{ fontSize: 11, marginLeft: "auto" }}>
                    {c.blockId.slice(0, 8)}
                  </span>
                </div>
                <DiffBody oldText={c.oldText ?? ""} newText={c.newText ?? ""} kind={c.kind} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KindPill({ kind }: { kind: "Added" | "Modified" | "Removed" }) {
  if (kind === "Added") return <span className="pill pill-ok">Eklendi</span>;
  if (kind === "Removed") return <span className="pill pill-danger">Silindi</span>;
  return <span className="pill pill-info">Değiştirildi</span>;
}

function DiffBody({ oldText, newText, kind }: { oldText: string; newText: string; kind: string }) {
  if (kind === "Added") {
    return (
      <div className="track-changes" style={{ margin: 0 }}>
        <div className="tc-body">
          <ins className="tc-add">{newText}</ins>
        </div>
      </div>
    );
  }
  if (kind === "Removed") {
    return (
      <div className="track-changes" style={{ margin: 0 }}>
        <div className="tc-body">
          <del className="tc-del">{oldText}</del>
        </div>
      </div>
    );
  }
  const parts = diffWordsWithSpace(oldText ?? "", newText ?? "");
  return (
    <div className="track-changes" style={{ margin: 0 }}>
      <div className="tc-body">
        {parts.map((p, i) => {
          if (p.added) return <ins key={i} className="tc-add">{p.value}</ins>;
          if (p.removed) return <del key={i} className="tc-del">{p.value}</del>;
          return <span key={i}>{p.value}</span>;
        })}
      </div>
    </div>
  );
}
