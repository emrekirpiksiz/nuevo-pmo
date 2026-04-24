"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  BlockIdAssigner,
  BlockIdNodeExtensions,
  STARTERKIT_DISABLED_NODES,
} from "./BlockIdExtension";
import {
  DocumentSearchExtension,
  documentSearchPluginKey,
} from "./DocumentSearchExtension";
import { Space, Button, Tooltip, Segmented, Input } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
  EyeOutlined,
  EditOutlined,
  MessageFilled,
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { useEffect, useImperativeHandle, forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { htmlToMarkdown, markdownToHtml } from "./markdownHelpers";

export type EditorMode = "preview" | "source";

export interface DocumentEditorHandle {
  getContentJson: () => string;
  getContentMarkdown: () => string;
  getSelectedBlock: () => { blockId: string; text: string } | null;
  setContent: (json: unknown, markdown?: string) => void;
  setContentFromMarkdown: (markdown: string) => void;
  focusBlock: (blockId: string) => void;
  getMode: () => EditorMode;
  setMode: (m: EditorMode) => void;
  /**
   * DOM'daki güncel blockId → textContent haritası.
   */
  extractLiveBlockTextMap: () => Map<string, string>;

  /** Arama sorgusunu günceller (boş string sıfırlar). */
  setSearchQuery: (query: string, caseSensitive?: boolean) => { matches: number; current: number };
  /** Arama sonuçları arasında gez. */
  nextSearchMatch: () => void;
  prevSearchMatch: () => void;
  /** Aktif arama durumu (match sayısı + şu anki index). */
  getSearchStatus: () => { matches: number; current: number; query: string };
}

interface CommentBadge {
  blockId: string;
  count: number;
}

interface Props {
  initialJson: unknown;
  initialMarkdown?: string;
  editable: boolean;
  onBlockSelect?: (b: { blockId: string; text: string } | null) => void;
  highlightedBlockIds?: Set<string>;
  commentBadges?: CommentBadge[];
  onBadgeClick?: (blockId: string) => void;
  selectedBlockId?: string | null;
  /** Kullanıcının editörde cursor/selection üzerinden seçtiği blok — yeşil vurgu */
  activeSelectionBlockId?: string | null;
  /** Kullanıcı sağ tık > Yorum Yap'a basınca çağrılır. */
  onCommentRequest?: (payload: { blockId: string; anchorText: string; position: { x: number; y: number } }) => void;
  defaultMode?: EditorMode;
  hideToolbar?: boolean;
}

interface BadgePosition {
  blockId: string;
  count: number;
  top: number;
  left: number;
}

interface SourceMatch {
  start: number;
  end: number;
}

export const DocumentEditor = forwardRef<DocumentEditorHandle, Props>(function DocumentEditor(
  {
    initialJson,
    initialMarkdown = "",
    editable,
    onBlockSelect,
    highlightedBlockIds,
    commentBadges,
    onBadgeClick,
    selectedBlockId,
    activeSelectionBlockId,
    onCommentRequest,
    defaultMode = "preview",
    hideToolbar = false,
  },
  ref
) {
  const [mode, setModeState] = useState<EditorMode>(defaultMode);
  const [sourceValue, setSourceValue] = useState<string>(initialMarkdown ?? "");
  const sourceRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [badgePositions, setBadgePositions] = useState<BadgePosition[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; blockId: string; anchorText: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<{ matches: number; current: number }>({
    matches: 0,
    current: -1,
  });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Source-mode search state
  const [sourceMatches, setSourceMatches] = useState<SourceMatch[]>([]);
  const [sourceMatchIndex, setSourceMatchIndex] = useState(-1);

  const editor = useEditor({
    extensions: [
      StarterKit.configure(STARTERKIT_DISABLED_NODES),
      ...BlockIdNodeExtensions,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      Table.configure({ resizable: false, HTMLAttributes: { class: "md-table" } }),
      TableRow,
      TableHeader,
      TableCell,
      BlockIdAssigner,
      DocumentSearchExtension,
      Placeholder.configure({ placeholder: "Buraya yazın…" }),
    ],
    content: initialJson ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "editor-content" },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    setSourceValue(initialMarkdown ?? "");
  }, [initialMarkdown]);

  // ----- Selection reporting -----
  const prevSelectionRef = useRef<{ blockId: string | null; text: string }>({ blockId: null, text: "" });
  const onBlockSelectRef = useRef(onBlockSelect);
  useEffect(() => { onBlockSelectRef.current = onBlockSelect; }, [onBlockSelect]);

  const reportSelection = useCallback(() => {
    if (!editor) return;
    const cb = onBlockSelectRef.current;
    if (!cb) return;
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    let next: { blockId: string; text: string } | null = null;
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.isBlock && node.attrs?.blockId) {
        next = { blockId: node.attrs.blockId as string, text: node.textContent.slice(0, 1000) };
        break;
      }
    }
    const prev = prevSelectionRef.current;
    if ((prev.blockId ?? null) === (next?.blockId ?? null) && prev.text === (next?.text ?? "")) {
      return;
    }
    prevSelectionRef.current = { blockId: next?.blockId ?? null, text: next?.text ?? "" };
    cb(next);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", reportSelection);
    editor.on("transaction", reportSelection);
    return () => {
      editor.off("selectionUpdate", reportSelection);
      editor.off("transaction", reportSelection);
    };
  }, [editor, reportSelection]);

  // ----- Highlight class toggles -----
  const onBadgeClickRef = useRef(onBadgeClick);
  useEffect(() => { onBadgeClickRef.current = onBadgeClick; }, [onBadgeClick]);

  const badgeSignature = useMemo(
    () =>
      (commentBadges ?? [])
        .slice()
        .sort((a, b) => a.blockId.localeCompare(b.blockId))
        .map((b) => `${b.blockId}:${b.count}`)
        .join("|"),
    [commentBadges]
  );
  const highlightSignature = useMemo(
    () => Array.from(highlightedBlockIds ?? []).sort().join("|"),
    [highlightedBlockIds]
  );

  const [editorUpdateTick, setEditorUpdateTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setEditorUpdateTick((c) => c + 1);
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (mode !== "preview") return;
    const dom = editor.view.dom as HTMLElement;
    const wantHighlight = new Set(highlightedBlockIds ?? []);
    const domObserver: { stop?: () => void; start?: () => void } = (editor.view as any).domObserver ?? {};
    try { domObserver.stop?.(); } catch { /* noop */ }
    try {
      dom.querySelectorAll(".comment-badge").forEach((el) => el.remove());
      dom.querySelectorAll("[data-block-id]").forEach((el) => {
        const he = el as HTMLElement;
        const id = he.getAttribute("data-block-id") ?? "";
        const wantHC = wantHighlight.has(id);
        if (he.classList.contains("has-comment") !== wantHC) he.classList.toggle("has-comment", wantHC);
        const wantSel = selectedBlockId === id;
        if (he.classList.contains("is-selected-comment") !== wantSel)
          he.classList.toggle("is-selected-comment", wantSel);
        const wantActive = activeSelectionBlockId === id;
        if (he.classList.contains("is-active-selection") !== wantActive)
          he.classList.toggle("is-active-selection", wantActive);
      });
    } finally {
      try { domObserver.start?.(); } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, mode, highlightSignature, selectedBlockId, activeSelectionBlockId, editorUpdateTick]);

  // ----- Badge overlay positioning -----
  const computeBadgePositions = useCallback(() => {
    if (!editor || mode !== "preview") { setBadgePositions([]); return; }
    const inner = innerRef.current;
    if (!inner) return;
    const items = commentBadges ?? [];
    if (items.length === 0) { setBadgePositions([]); return; }

    const editorDom = editor.view.dom as HTMLElement;
    const seen = new Set<string>();
    const positions: BadgePosition[] = [];
    for (const b of items) {
      if (seen.has(b.blockId)) continue;
      seen.add(b.blockId);
      const el = editorDom.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(b.blockId)}"]`);
      if (!el) continue;
      let top = 0;
      let left = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== inner) {
        top += cur.offsetTop;
        left += cur.offsetLeft;
        cur = cur.offsetParent as HTMLElement | null;
        if (!cur) break;
      }
      const right = left + el.offsetWidth;
      positions.push({
        blockId: b.blockId,
        count: b.count,
        top: top + 4,
        left: right - 44,
      });
    }
    setBadgePositions(positions);
  }, [editor, mode, commentBadges]);

  useEffect(() => {
    computeBadgePositions();
  }, [computeBadgePositions, badgeSignature, editorUpdateTick, mode]);

  useEffect(() => {
    const handler = () => computeBadgePositions();
    window.addEventListener("resize", handler);
    const wrapper = wrapperRef.current;
    const onScroll = () => computeBadgePositions();
    wrapper?.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("resize", handler);
      wrapper?.removeEventListener("scroll", onScroll);
    };
  }, [computeBadgePositions]);

  // Editor içinde Cmd/Ctrl+F → search aç
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      const isSearch =
        (e.key === "f" || e.key === "F") && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey;
      if (!isSearch) return;
      const inEditor = wrapperRef.current?.contains(e.target as Node) ?? false;
      const inSearchInput = searchInputRef.current?.contains?.(e.target as Node) ?? false;
      if (!inEditor && !inSearchInput) return;
      e.preventDefault();
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 10);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!searchOpen) return;
      if (searchInputRef.current && document.activeElement !== searchInputRef.current) return;
      e.preventDefault();
      closeSearch();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, searchOpen]);

  // Source-mode: kaynak metinde eşleşen konuma git
  const selectSourceMatch = useCallback((match: SourceMatch) => {
    const ta = sourceRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(match.start, match.end);
    // Tahmini satır sayısına göre scroll pozisyonunu hesapla
    const linesBefore = sourceValue.substring(0, match.start).split("\n").length - 1;
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    const targetScroll = Math.max(0, linesBefore * lineHeight - ta.clientHeight / 3);
    ta.scrollTop = targetScroll;
  }, [sourceValue]);

  // Arama sorgusu değiştikçe extension veya source state'ini güncelle
  useEffect(() => {
    if (mode === "source") {
      const q = searchQuery.trim();
      if (!q) {
        setSourceMatches([]);
        setSourceMatchIndex(-1);
        setSearchStatus({ matches: 0, current: -1 });
        return;
      }
      const matches: SourceMatch[] = [];
      const lowerSrc = sourceValue.toLowerCase();
      const lowerQ = q.toLowerCase();
      let pos = 0;
      while (pos <= lowerSrc.length - lowerQ.length) {
        const found = lowerSrc.indexOf(lowerQ, pos);
        if (found === -1) break;
        matches.push({ start: found, end: found + q.length });
        pos = found + 1;
      }
      setSourceMatches(matches);
      const idx = matches.length > 0 ? 0 : -1;
      setSourceMatchIndex(idx);
      setSearchStatus({ matches: matches.length, current: idx });
      if (idx >= 0) {
        // Bir sonraki render'da seç (textarea henüz güncel olmayabilir)
        requestAnimationFrame(() => selectSourceMatch(matches[0]));
      }
      return;
    }

    // Preview mode: TipTap extension
    if (!editor) return;
    const q = searchQuery;
    const t = setTimeout(() => {
      try {
        editor.view.dispatch(
          editor.state.tr.setMeta(documentSearchPluginKey, {
            query: q,
            caseSensitive: false,
            currentIndex: q ? 0 : -1,
          })
        );
      } catch (err) {
        console.warn("[search] dispatch failed:", err);
        setSearchStatus({ matches: 0, current: -1 });
        return;
      }
      const s = documentSearchPluginKey.getState(editor.view.state);
      setSearchStatus({
        matches: s?.matches.length ?? 0,
        current: s?.currentIndex ?? -1,
      });
      if ((s?.matches.length ?? 0) > 0) {
        requestAnimationFrame(() => scrollSearchCurrent(editor));
      }
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, mode, editor, sourceValue]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSourceMatches([]);
    setSourceMatchIndex(-1);
    if (editor) {
      editor.view.dispatch(
        editor.state.tr.setMeta(documentSearchPluginKey, {
          query: "",
          caseSensitive: false,
          currentIndex: -1,
        })
      );
    }
    setSearchStatus({ matches: 0, current: -1 });
  };

  const stepSearch = (dir: 1 | -1) => {
    if (mode === "source") {
      if (sourceMatches.length === 0) return;
      const n = sourceMatches.length;
      const next = dir === 1
        ? (sourceMatchIndex + 1) % n
        : (sourceMatchIndex - 1 + n) % n;
      setSourceMatchIndex(next);
      setSearchStatus({ matches: n, current: next });
      selectSourceMatch(sourceMatches[next]);
      return;
    }
    if (!editor) return;
    const s = documentSearchPluginKey.getState(editor.view.state);
    if (!s || s.matches.length === 0) return;
    const n = s.matches.length;
    const next = dir === 1 ? (s.currentIndex + 1) % n : (s.currentIndex - 1 + n) % n;
    editor.view.dispatch(editor.state.tr.setMeta(documentSearchPluginKey, { currentIndex: next }));
    setSearchStatus({ matches: n, current: next });
    requestAnimationFrame(() => scrollSearchCurrent(editor));
  };

  useImperativeHandle(
    ref,
    () => ({
      getContentJson: () => {
        if (mode === "source") {
          const html = markdownToHtml(sourceValue);
          editor?.commands.setContent(html as any, false);
        }
        return JSON.stringify(editor?.getJSON() ?? {});
      },
      getContentMarkdown: () => {
        if (mode === "source") return sourceValue;
        if (!editor) return "";
        try {
          return htmlToMarkdown(editor.getHTML());
        } catch {
          return editor.getText();
        }
      },
      getSelectedBlock: () => {
        if (!editor) return null;
        const { from } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        for (let depth = $pos.depth; depth >= 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.isBlock && node.attrs?.blockId) {
            return { blockId: node.attrs.blockId as string, text: node.textContent.slice(0, 1000) };
          }
        }
        return null;
      },
      setContent: (json, markdown) => {
        if (!editor) return;
        editor.commands.setContent(json as any, false);
        if (typeof markdown === "string") setSourceValue(markdown);
        requestAnimationFrame(() => computeBadgePositions());
      },
      setContentFromMarkdown: (md) => {
        setSourceValue(md);
        const html = markdownToHtml(md);
        editor?.commands.setContent(html as any, false);
        requestAnimationFrame(() => computeBadgePositions());
      },
      focusBlock: (blockId) => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const el = dom.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`) as HTMLElement | null;
        if (!el) return;
        const wrapper = wrapperRef.current;
        const TOP_MARGIN = 120;
        if (wrapper) {
          const elRect = el.getBoundingClientRect();
          const wRect = wrapper.getBoundingClientRect();
          const target = Math.max(
            0,
            wrapper.scrollTop + (elRect.top - wRect.top) - TOP_MARGIN
          );
          wrapper.scrollTop = target;
          requestAnimationFrame(() => {
            const elRect2 = el.getBoundingClientRect();
            const wRect2 = wrapper.getBoundingClientRect();
            const outOfView = elRect2.top < wRect2.top || elRect2.bottom > wRect2.bottom;
            if (outOfView) {
              wrapper.scrollTop = Math.max(
                0,
                wrapper.scrollTop + (elRect2.top - wRect2.top) - TOP_MARGIN
              );
            }
          });
        } else {
          try {
            el.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
          } catch {
            el.scrollIntoView(true);
          }
        }
        dom.querySelectorAll(".block-flash").forEach((e) => e.classList.remove("block-flash"));
        el.classList.add("block-flash");
        setTimeout(() => el.classList.remove("block-flash"), 1200);
        setTimeout(() => computeBadgePositions(), 400);
      },
      getMode: () => mode,
      setMode: (m) => switchMode(m),
      extractLiveBlockTextMap: () => {
        const map = new Map<string, string>();
        if (!editor) return map;
        editor.state.doc.descendants((node) => {
          if (!node.type.isBlock) return true;
          const bid = node.attrs?.blockId as string | undefined | null;
          if (bid && !map.has(bid)) {
            map.set(bid, (node.textContent ?? "").trim());
          }
          return true;
        });
        return map;
      },
      setSearchQuery: (query, caseSensitive = false) => {
        if (!editor) return { matches: 0, current: -1 };
        try {
          editor.view.dispatch(
            editor.state.tr.setMeta(documentSearchPluginKey, {
              query,
              caseSensitive,
              currentIndex: query ? 0 : -1,
            })
          );
        } catch (err) {
          console.warn("[search] dispatch failed:", err);
          return { matches: 0, current: -1 };
        }
        const latest = documentSearchPluginKey.getState(editor.view.state);
        const matches = latest?.matches.length ?? 0;
        const current = latest?.currentIndex ?? -1;
        if (matches > 0) requestAnimationFrame(() => scrollSearchCurrent(editor));
        return { matches, current };
      },
      nextSearchMatch: () => {
        if (!editor) return;
        const s = documentSearchPluginKey.getState(editor.view.state);
        if (!s || s.matches.length === 0) return;
        const next = (s.currentIndex + 1) % s.matches.length;
        editor.view.dispatch(
          editor.state.tr.setMeta(documentSearchPluginKey, { currentIndex: next })
        );
        requestAnimationFrame(() => scrollSearchCurrent(editor));
      },
      prevSearchMatch: () => {
        if (!editor) return;
        const s = documentSearchPluginKey.getState(editor.view.state);
        if (!s || s.matches.length === 0) return;
        const prev = (s.currentIndex - 1 + s.matches.length) % s.matches.length;
        editor.view.dispatch(
          editor.state.tr.setMeta(documentSearchPluginKey, { currentIndex: prev })
        );
        requestAnimationFrame(() => scrollSearchCurrent(editor));
      },
      getSearchStatus: () => {
        if (!editor) return { matches: 0, current: -1, query: "" };
        const s = documentSearchPluginKey.getState(editor.view.state);
        return {
          matches: s?.matches.length ?? 0,
          current: s?.currentIndex ?? -1,
          query: s?.query ?? "",
        };
      },
    }),
    [editor, mode, sourceValue, computeBadgePositions]
  );

  const switchMode = (next: EditorMode) => {
    if (!editor) {
      setModeState(next);
      return;
    }
    if (next === mode) return;
    if (next === "source") {
      let md = "";
      try {
        md = htmlToMarkdown(editor.getHTML());
      } catch {
        md = editor.getText();
      }

      // Önizlemede seçili / imlecin üzerinde olduğu bloğun metnini bul
      let blockText = "";
      try {
        const { from } = editor.state.selection;
        const $pos = editor.state.doc.resolve(from);
        for (let d = $pos.depth; d >= 0; d--) {
          const node = $pos.node(d);
          if (node.type.isBlock && node.textContent.trim().length > 0) {
            blockText = node.textContent.slice(0, 80);
            break;
          }
        }
      } catch { /* ignore */ }

      setSourceValue(md);
      setModeState("source");

      // Textarea render olduktan sonra ilgili satıra konumlan
      if (blockText) {
        setTimeout(() => {
          const ta = sourceRef.current;
          if (!ta) return;
          const searchFor = blockText.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const match = md.search(new RegExp(searchFor));
          const idx = match >= 0 ? match : md.indexOf(blockText.slice(0, 20));
          if (idx >= 0) {
            ta.focus();
            ta.setSelectionRange(idx, idx + blockText.length);
            const linesBefore = md.substring(0, idx).split("\n").length - 1;
            const lineHeight = 22; // 13px font * 1.7 satır yüksekliği ≈ 22px
            ta.scrollTop = Math.max(0, linesBefore * lineHeight - ta.clientHeight / 3);
          }
        }, 60);
      }
    } else {
      const html = markdownToHtml(sourceValue);
      editor.commands.setContent(html as any, false);
      setModeState("preview");
    }
    // Mod değişince arama sıfırla
    setSearchQuery("");
    setSourceMatches([]);
    setSourceMatchIndex(-1);
    setSearchStatus({ matches: 0, current: -1 });
  };

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Toolbar */}
      <div style={{ padding: "10px 24px 10px", background: "var(--canvas)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Segmented
          size="small"
          value={mode}
          onChange={(v) => switchMode(v as EditorMode)}
          options={[
            { value: "preview", icon: <EyeOutlined />, label: "Önizleme" },
            { value: "source", icon: <EditOutlined />, label: "Kaynak" },
          ]}
        />
        <Tooltip title="Dokümanda ara (⌘F)">
          <Button
            size="small"
            icon={<SearchOutlined />}
            onClick={() => {
              setSearchOpen((o) => !o);
              if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 10);
            }}
            type={searchOpen ? "primary" : "default"}
            style={{ marginLeft: "auto" }}
          >
            Ara
          </Button>
        </Tooltip>
        {editable && mode === "preview" && !hideToolbar && (
          <Space wrap>
            <Tooltip title="H1"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button></Tooltip>
            <Tooltip title="H2"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button></Tooltip>
            <Tooltip title="H3"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button></Tooltip>
            <Tooltip title="Bold"><Button size="small" icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} /></Tooltip>
            <Tooltip title="Italic"><Button size="small" icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} /></Tooltip>
            <Tooltip title="Bullet list"><Button size="small" icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} /></Tooltip>
            <Tooltip title="Ordered list"><Button size="small" icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} /></Tooltip>
            <Tooltip title="Code block"><Button size="small" icon={<CodeOutlined />} onClick={() => editor.chain().focus().toggleCodeBlock().run()} /></Tooltip>
            <Tooltip title="Quote"><Button size="small" onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Button></Tooltip>
            <Tooltip title="Tablo ekle (3×3)">
              <Button size="small" icon={<TableOutlined />} onClick={insertTable} />
            </Tooltip>
          </Space>
        )}
      </div>
      </div>{/* /toolbar padding wrapper */}

      {/* Arama çubuğu */}
      {searchOpen && (
        <div
          style={{
            background: "var(--canvas)",
            borderBottom: "1px solid var(--border)",
            padding: "6px 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SearchOutlined style={{ color: "var(--ink-subtle)" }} />
          <Input
            ref={(node) => {
              searchInputRef.current = (node?.input as HTMLInputElement | null) ?? null;
            }}
            size="small"
            placeholder="Dokümanda ara…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) stepSearch(-1);
                else stepSearch(1);
              }
            }}
            style={{ flex: 1, minWidth: 0 }}
            autoFocus
          />
          {mode === "source" && searchStatus.matches > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--ink-subtle)",
                background: "var(--accent-soft)",
                padding: "1px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
              }}
            >
              Kaynak modunda aranıyor
            </span>
          )}
          <span className="subtle mono" style={{ fontSize: 11, minWidth: 60, textAlign: "right" }}>
            {searchStatus.matches === 0
              ? searchQuery
                ? "sonuç yok"
                : ""
              : `${searchStatus.current + 1} / ${searchStatus.matches}`}
          </span>
          <Tooltip title="Önceki (Shift+Enter)">
            <Button
              size="small"
              icon={<LeftOutlined />}
              disabled={searchStatus.matches === 0}
              onClick={() => stepSearch(-1)}
            />
          </Tooltip>
          <Tooltip title="Sıradaki (Enter)">
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={searchStatus.matches === 0}
              onClick={() => stepSearch(1)}
            />
          </Tooltip>
          <Tooltip title="Kapat (Esc)">
            <Button size="small" icon={<CloseOutlined />} onClick={closeSearch} />
          </Tooltip>
        </div>
      )}

      {/* İçerik alanı — A4 kağıt düzeni */}
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--surface-muted)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px" }}>
          {mode === "preview" ? (
            <div
              ref={innerRef}
              className="a4-paper"
              onContextMenu={(e) => {
                if (!editor || !onCommentRequest) return;
                const { from, to } = editor.state.selection;
                const $pos = editor.state.doc.resolve(from);
                let blockId: string | null = null;
                for (let d = $pos.depth; d >= 0; d--) {
                  const node = $pos.node(d);
                  if (node.type.isBlock && node.attrs?.blockId) { blockId = node.attrs.blockId as string; break; }
                }
                if (!blockId) return;
                let anchorText = "";
                if (from !== to) {
                  anchorText = editor.state.doc.textBetween(from, to, "\n").slice(0, 1000);
                }
                if (!anchorText) {
                  for (let d = $pos.depth; d >= 0; d--) {
                    const node = $pos.node(d);
                    if (node.type.isBlock && node.attrs?.blockId === blockId) {
                      anchorText = node.textContent.slice(0, 1000);
                      break;
                    }
                  }
                }
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, blockId, anchorText });
              }}
            >
              <EditorContent editor={editor} />
              <div className="badge-overlay" aria-hidden="true">
                {badgePositions.map((p) => (
                  <button
                    key={p.blockId}
                    className="comment-badge-react"
                    style={{ top: p.top, left: p.left }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onBadgeClickRef.current?.(p.blockId);
                    }}
                    title={`${p.count} yorum`}
                    type="button"
                  >
                    <MessageFilled />
                    <span className="cb-count">{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <textarea
              ref={sourceRef}
              className="markdown-source"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              readOnly={!editable}
              placeholder="# Başlık&#10;&#10;Markdown yazın..."
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {contextMenu && (
        <>
          <div className="ctx-backdrop" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="ctx-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ctx-item"
              onClick={() => {
                onCommentRequest?.({
                  blockId: contextMenu.blockId,
                  anchorText: contextMenu.anchorText,
                  position: { x: contextMenu.x, y: contextMenu.y },
                });
                setContextMenu(null);
              }}
            >
              <MessageFilled style={{ color: "#fa8c16" }} />
              <span>Yorum Yap</span>
            </button>
            <div className="ctx-sep" />
            <button
              type="button"
              className="ctx-item"
              onClick={() => {
                if (contextMenu.anchorText) {
                  navigator.clipboard?.writeText(contextMenu.anchorText).catch(() => {});
                }
                setContextMenu(null);
              }}
            >
              <span>Seçimi Kopyala</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
});

function scrollSearchCurrent(editor: ReturnType<typeof useEditor> extends infer T ? T : never) {
  const anyEditor = editor as unknown as import("@tiptap/react").Editor | null;
  if (!anyEditor) return;
  const dom = anyEditor.view.dom as HTMLElement;
  const current = dom.querySelector<HTMLElement>(".doc-search-hit.doc-search-current");
  if (!current) return;
  let container: HTMLElement | null = dom.parentElement;
  while (container) {
    const style = window.getComputedStyle(container);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) break;
    container = container.parentElement;
  }
  const rect = current.getBoundingClientRect();
  if (container) {
    const cRect = container.getBoundingClientRect();
    const target =
      container.scrollTop + (rect.top - cRect.top) - cRect.height / 3;
    container.scrollTop = Math.max(0, target);
  } else {
    current.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  }
}
