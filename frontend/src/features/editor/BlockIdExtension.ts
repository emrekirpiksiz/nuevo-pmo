import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";

const BLOCK_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "horizontalRule",
]);

export const BlockIdExtension = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: Array.from(BLOCK_NODE_TYPES),
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.blockId ? { "data-block-id": String(attrs.blockId) } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockId-assigner"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((t) => t.docChanged)) return null;

          const tr = newState.tr;
          const seen = new Set<string>();
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (!node.type.isBlock) return;
            if (!BLOCK_NODE_TYPES.has(node.type.name)) return;

            const current = node.attrs?.blockId as string | undefined | null;
            if (!current || seen.has(current)) {
              const id = uuidv4();
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: id });
              seen.add(id);
              modified = true;
            } else {
              seen.add(current);
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
