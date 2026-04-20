"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { BlockIdExtension } from "./BlockIdExtension";
import { Space, Button, Tooltip } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { htmlToMarkdown } from "./markdownHelpers";

export interface DocumentEditorHandle {
  getContentJson: () => string;
  getContentMarkdown: () => string;
  getSelectedBlock: () => { blockId: string; text: string } | null;
  setContent: (json: unknown) => void;
}

interface Props {
  initialJson: unknown;
  editable: boolean;
  onBlockSelect?: (b: { blockId: string; text: string } | null) => void;
  highlightedBlockIds?: Set<string>;
}

export const DocumentEditor = forwardRef<DocumentEditorHandle, Props>(function DocumentEditor(
  { initialJson, editable, onBlockSelect, highlightedBlockIds },
  ref
) {
  const editor = useEditor({
    extensions: [StarterKit, BlockIdExtension, Placeholder.configure({ placeholder: "Buraya yazın…" })],
    content: initialJson ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  const reportSelection = useCallback(() => {
    if (!editor || !onBlockSelect) return;
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.isBlock && node.attrs?.blockId) {
        onBlockSelect({
          blockId: node.attrs.blockId as string,
          text: node.textContent.slice(0, 200),
        });
        return;
      }
    }
    onBlockSelect(null);
  }, [editor, onBlockSelect]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", reportSelection);
    editor.on("transaction", reportSelection);
    return () => {
      editor.off("selectionUpdate", reportSelection);
      editor.off("transaction", reportSelection);
    };
  }, [editor, reportSelection]);

  useEffect(() => {
    if (!editor || !highlightedBlockIds) return;
    const dom = editor.view.dom as HTMLElement;
    dom.querySelectorAll("[data-block-id]").forEach((el) => {
      const id = (el as HTMLElement).getAttribute("data-block-id");
      if (id && highlightedBlockIds.has(id)) el.classList.add("has-comment");
      else el.classList.remove("has-comment");
    });
  }, [editor, highlightedBlockIds]);

  useImperativeHandle(
    ref,
    () => ({
      getContentJson: () => JSON.stringify(editor?.getJSON() ?? {}),
      getContentMarkdown: () => {
        if (!editor) return "";
        const html = editor.getHTML();
        try {
          return htmlToMarkdown(html);
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
            return { blockId: node.attrs.blockId as string, text: node.textContent.slice(0, 200) };
          }
        }
        return null;
      },
      setContent: (json) => {
        if (!editor) return;
        editor.commands.setContent(json as any, false);
      },
    }),
    [editor]
  );

  if (!editor) return null;

  return (
    <div>
      {editable && (
        <Space style={{ marginBottom: 8 }}>
          <Tooltip title="H1"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button></Tooltip>
          <Tooltip title="H2"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button></Tooltip>
          <Tooltip title="H3"><Button size="small" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Button></Tooltip>
          <Tooltip title="Bold"><Button size="small" icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} /></Tooltip>
          <Tooltip title="Italic"><Button size="small" icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} /></Tooltip>
          <Tooltip title="Bullet list"><Button size="small" icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} /></Tooltip>
          <Tooltip title="Ordered list"><Button size="small" icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} /></Tooltip>
          <Tooltip title="Code block"><Button size="small" icon={<CodeOutlined />} onClick={() => editor.chain().focus().toggleCodeBlock().run()} /></Tooltip>
          <Tooltip title="Quote"><Button size="small" onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Button></Tooltip>
        </Space>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});
