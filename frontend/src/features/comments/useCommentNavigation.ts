"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Comment } from "@/lib/apis";
import type { DocumentEditorHandle } from "@/features/editor/DocumentEditor";
import type { CommentDrawerMode } from "@/features/comments/CommentDrawer";

export interface CommentNavigationDeps {
  docId: string;
  /** Tüm yorumlar (her statüde). Hook Open listesini kendi filtreler. */
  allComments: Comment[];
  /** comment.blockId → DOM'daki gerçek blockId. */
  effectiveBlockIdMap: Map<string, string>;
  /** blockId → güncel metin (drawer'daki track-changes diff için). */
  blockTextMap: Map<string, string>;
  editorRef: React.MutableRefObject<DocumentEditorHandle | null>;
  /** Editör başka bir sekmede / gizliyse, bu callback ile önce editör sekmesi açılır. */
  ensureEditorMounted?: () => void;
  /** Hedef blok DOM'da yoksa (effectively orphan) çağrılır — UI uyarısı. */
  onMissingBlock?: (comment: Comment) => void;
}

export interface CommentNavigation {
  openComments: Comment[];
  currentIndex: number;
  currentComment: Comment | null;
  drawer: CommentDrawerMode;
  setDrawer: (d: CommentDrawerMode) => void;
  focusBlockId: string | null;
  setFocusBlockId: (id: string | null) => void;
  goTo: (comment: Comment) => void;
  next: () => void;
  prev: () => void;
  /** Editör mount/içerik değişimi sonrası parent useEffect'ten çağrılır. Pending focus'u tüketir. */
  consumePendingFocus: () => void;
}

export function useCommentNavigation(p: CommentNavigationDeps): CommentNavigation {
  const {
    docId,
    allComments,
    effectiveBlockIdMap,
    blockTextMap,
    editorRef,
    ensureEditorMounted,
    onMissingBlock,
  } = p;

  const openComments = useMemo(
    () =>
      [...allComments]
        .filter((c) => c.status === "Open")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [allComments]
  );

  const [drawer, setDrawer] = useState<CommentDrawerMode>({ kind: "closed" });
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  const currentIndex = useMemo(() => {
    if (drawer.kind !== "thread") return -1;
    return openComments.findIndex((c) => c.id === drawer.commentId);
  }, [drawer, openComments]);
  const currentComment = currentIndex >= 0 ? openComments[currentIndex] : null;

  const tryFocus = useCallback(
    (blockId: string) => {
      pendingFocusRef.current = blockId;
      // İçerik yüklenmemiş olabilir — iki aşamalı dene
      requestAnimationFrame(() => {
        if (pendingFocusRef.current === blockId) {
          editorRef.current?.focusBlock(blockId);
        }
      });
      // 300ms sonra hâlâ pending ise tekrar dene (editör içerik yüklemesi async)
      setTimeout(() => {
        if (pendingFocusRef.current === blockId) {
          editorRef.current?.focusBlock(blockId);
          pendingFocusRef.current = null;
        }
      }, 300);
    },
    [editorRef]
  );

  const consumePendingFocus = useCallback(() => {
    if (!pendingFocusRef.current) return;
    const id = pendingFocusRef.current;
    setTimeout(() => {
      if (pendingFocusRef.current === id) {
        editorRef.current?.focusBlock(id);
        pendingFocusRef.current = null;
      }
    }, 100);
  }, [editorRef]);

  const goTo = useCallback(
    (comment: Comment) => {
      const effective = effectiveBlockIdMap.get(comment.blockId) ?? null;
      const targetBlockText = effective ? blockTextMap.get(effective) ?? null : null;

      // Drawer her halükarda açılsın — kullanıcı yorumu okuyup yanıtlayabilsin.
      setDrawer({
        kind: "thread",
        open: true,
        documentId: docId,
        commentId: comment.id,
        currentBlockText: targetBlockText,
      });

      // Sekme değiştirmek gerekiyorsa önce onu
      ensureEditorMounted?.();

      if (!effective) {
        onMissingBlock?.(comment);
        setFocusBlockId(null);
        return;
      }

      setFocusBlockId(effective);
      tryFocus(effective);
    },
    [docId, effectiveBlockIdMap, blockTextMap, ensureEditorMounted, onMissingBlock, tryFocus]
  );

  const next = useCallback(() => {
    if (openComments.length === 0) return;
    const nextIdx = currentIndex < 0 ? 0 : (currentIndex + 1) % openComments.length;
    goTo(openComments[nextIdx]);
  }, [openComments, currentIndex, goTo]);

  const prev = useCallback(() => {
    if (openComments.length === 0) return;
    const prevIdx =
      currentIndex < 0 ? openComments.length - 1 : (currentIndex - 1 + openComments.length) % openComments.length;
    goTo(openComments[prevIdx]);
  }, [openComments, currentIndex, goTo]);

  // Drawer kapatılınca focus highlight'ını da bırak
  useEffect(() => {
    if (drawer.kind === "closed") setFocusBlockId(null);
  }, [drawer.kind]);

  return {
    openComments,
    currentIndex,
    currentComment,
    drawer,
    setDrawer,
    focusBlockId,
    setFocusBlockId,
    goTo,
    next,
    prev,
    consumePendingFocus,
  };
}
