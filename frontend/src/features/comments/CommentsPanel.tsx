"use client";

import { Empty, Input, Segmented, Space, Tooltip, Typography } from "antd";
import { HistoryOutlined, MessageFilled, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Comment, CommentsApi, CommentStatus } from "@/lib/apis";
import { useEffect, useMemo, useRef, useState } from "react";
import { diffWordsWithSpace } from "diff";

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const STATUS_TABS: { value: CommentStatus; label: string }[] = [
  { value: "Open", label: "Açık" },
  { value: "Resolved", label: "Çözüldü" },
  { value: "Orphaned", label: "Silinmiş blok" },
];

const EMPTY: Comment[] = [];

interface Props {
  documentId: string;
  focusBlockId?: string | null;
  onCommentSelect?: (comment: Comment) => void;
  blockTextMap?: Map<string, string>;
}

export function CommentsPanel({
  documentId,
  focusBlockId,
  onCommentSelect,
  blockTextMap,
}: Props) {
  const [activeStatus, setActiveStatus] = useState<CommentStatus>("Open");
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data } = useQuery({
    queryKey: ["comments", documentId, activeStatus],
    queryFn: () => CommentsApi.list(documentId, [activeStatus]),
  });
  const comments = data ?? EMPTY;

  const filteredComments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter((c) => {
      const haystack = [
        c.body,
        c.anchorText,
        c.createdByName,
        ...(c.replies ?? []).map((r) => `${r.body} ${r.createdByName}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [comments, query]);

  const counts = useMemo(() => {
    return { activeStatus, filtered: filteredComments.length, total: comments.length };
  }, [filteredComments, comments, activeStatus]);

  useEffect(() => {
    if (!focusBlockId) return;
    const firstMatch = filteredComments.find((c) => c.blockId === focusBlockId);
    if (!firstMatch) return;
    setHighlightId(firstMatch.id);
    const el = itemRefs.current[firstMatch.id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBlockId, filteredComments.length]);

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      <div className="card">
        <div className="card-head">
          <Space>
            <MessageFilled style={{ color: "var(--accent)" }} />
            <h2 className="card-title">Yorumlar</h2>
          </Space>
          <span className="subtle" style={{ fontSize: 12, marginLeft: 8 }}>
            {query
              ? `${counts.filtered}/${counts.total}`
              : counts.total}{" "}
            {STATUS_TABS.find((s) => s.value === counts.activeStatus)?.label.toLowerCase()}
          </span>
          <div style={{ marginLeft: "auto" }}>
            <Segmented
              size="small"
              value={activeStatus}
              onChange={(v) => setActiveStatus(v as CommentStatus)}
              options={STATUS_TABS.map((o) => ({ label: o.label, value: o.value }))}
            />
          </div>
        </div>

        <div style={{ padding: "12px 20px 0" }}>
          <Input
            allowClear
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yorumlarda ara — kişi, anahtar kelime, anchor metni…"
            prefix={<SearchOutlined style={{ color: "var(--ink-subtle)" }} />}
          />
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginTop: 8 }}
          >
            Dokümanda metin seçip sağ tıkla → <b>Yorum Yap</b>. Yoruma tıklayınca ilgili
            bloğa gider.
          </Typography.Text>
        </div>

        {filteredComments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }} className="subtle">
            <Empty description={query ? "Eşleşen yorum yok" : "Yorum yok"} />
          </div>
        ) : (
          filteredComments.map((c, i) => (
            <CommentItem
              key={c.id}
              c={c}
              isLast={i === filteredComments.length - 1}
              highlight={highlightId === c.id}
              blockTextMap={blockTextMap}
              onClick={() => onCommentSelect?.(c)}
              itemRef={(el) => {
                itemRefs.current[c.id] = el;
              }}
              query={query}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  c,
  isLast,
  highlight,
  blockTextMap,
  onClick,
  itemRef,
  query,
}: {
  c: Comment;
  isLast: boolean;
  highlight: boolean;
  blockTextMap?: Map<string, string>;
  onClick: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
  query?: string;
}) {
  const anchorText = (c.anchorText ?? "").trim();
  const isResolved = c.status === "Resolved";
  const isOrphaned = c.status === "Orphaned";

  // Açık yorumlar için dokümandaki güncel blok metniyle diff göster
  // (Nuevo yorumu düzeltirken ne değişti görür).
  const comparisonText = !isResolved ? blockTextMap?.get(c.blockId) ?? "" : "";
  const hasDiff =
    !!comparisonText && normalize(anchorText) !== normalize(comparisonText);
  const diffParts = hasDiff ? diffWordsWithSpace(anchorText, comparisonText) : [];

  return (
    <div
      ref={itemRef}
      onClick={onClick}
      style={{
        padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        background: highlight
          ? "rgba(74, 106, 138, 0.08)"
          : isResolved
            ? "var(--surface-muted)"
            : "transparent",
        transition: "background 0.15s ease",
      }}
    >
      <div className="row" style={{ gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Typography.Text strong>{c.createdByName || "Kullanıcı"}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(c.createdAt).toLocaleString("tr-TR")}
        </Typography.Text>
        {c.forVersionMajor != null && (
          <span className="tag">v{c.forVersionMajor}.0</span>
        )}
        {isResolved && (
          <span className="pill pill-ok">
            Çözüldü
            {c.resolvedByName ? ` · ${c.resolvedByName}` : ""}
          </span>
        )}
        {isOrphaned && <span className="pill pill-danger">Blok silinmiş</span>}
        {c.replies?.length > 0 && (
          <span className="tag" style={{ marginLeft: "auto" }}>
            {c.replies.length} yanıt
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 8 }}>
        {highlightQuery(c.body, query)}
      </div>

      {/* Anchor text */}
      {anchorText && !hasDiff && (
        <blockquote className="cdrawer-quote" style={{ margin: 0 }}>
          {highlightQuery(
            anchorText.length > 220 ? anchorText.slice(0, 220) + "…" : anchorText,
            query
          )}
        </blockquote>
      )}

      {/* Diff (track-changes) — sadece açık yorumlarda blok değişmişse */}
      {hasDiff && (
        <div className="track-changes" style={{ margin: "4px 0 0" }}>
          <div className="tc-header">
            <span className="tc-chip tc-chip-old">
              {c.forVersionMajor != null ? `v${c.forVersionMajor}.0` : "Yorumda"}
            </span>
            <span className="tc-arrow">→</span>
            <span className="tc-chip tc-chip-new">Güncel</span>
            <Tooltip title="Yorumun yazıldığı andan bu yana blok değişmiş.">
              <HistoryOutlined style={{ color: "var(--ink-subtle)" }} />
            </Tooltip>
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
    </div>
  );
}

function highlightQuery(text: string, query?: string): React.ReactNode {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark key={idx} style={{ background: "rgba(184, 144, 62, 0.35)", padding: 0 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
  }
  return <>{out}</>;
}
