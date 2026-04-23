import { Extension, Node } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import CodeBlock from "@tiptap/extension-code-block";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";

/**
 * BlockId sistemi — **yalnız leaf block node'lara** blockId veriyoruz.
 *
 * Yoruma ve değişiklik audit'ine bağlanan birim "en iç" (leaf) block'tur;
 * paragraph, heading, codeBlock ve horizontalRule. BulletList / OrderedList /
 * ListItem / Blockquote / TableCell / TableHeader ise yalnız container'dır —
 * kendi metinleri yok, içlerindeki paragraph aynı metni taşır. Bu container'lara
 * blockId vermek aynı değişikliğin iki-üç kez audit edilmesine yol açıyordu.
 *
 * 1) BlockIdAttributes: leaf block node'larına blockId attribute ekler.
 * 2) BlockIdAssigner: yeni oluşan leaf block'lara UUID atar; duplicate'ları
 *    yeniler. Container node'larına dokunmaz.
 */

const blockIdAttr = {
  blockId: {
    default: null as string | null,
    parseHTML: (element: Element) => element.getAttribute("data-block-id"),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs.blockId ? { "data-block-id": String(attrs.blockId) } : {},
    keepOnSplit: true,
  },
};

function withBlockId<T extends { extend: (...args: any[]) => any }>(base: T): T {
  return base.extend({
    addAttributes() {
      const parent = (this as { parent?: () => Record<string, unknown> }).parent?.() ?? {};
      return { ...parent, ...blockIdAttr };
    },
  }) as unknown as T;
}

export const BlockIdParagraph = withBlockId(Paragraph);
export const BlockIdHeading = withBlockId(
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6] })
);
export const BlockIdCodeBlock = withBlockId(CodeBlock);
export const BlockIdHorizontalRule = withBlockId(HorizontalRule);

/**
 * StarterKit'te disable edilecek node'lar. Yalnız blockId verdiğimiz leaf
 * block'lar burada — container node'ları (blockquote, list'ler) StarterKit
 * default'uyla kalıyor ve blockId taşımıyor.
 */
export const STARTERKIT_DISABLED_NODES = {
  paragraph: false as const,
  heading: false as const,
  codeBlock: false as const,
  horizontalRule: false as const,
};

/** BlockIdAssigner'ın UUID atayacağı tipler — sadece leaf block'lar. */
const BLOCK_NODE_TYPES = new Set([
  "paragraph",
  "heading",
  "codeBlock",
  "horizontalRule",
]);

export const BlockIdAssigner = Extension.create({
  name: "blockIdAssigner",

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

/** Geriye uyumluluk için eski adı koruyalım. */
export const BlockIdExtension = BlockIdAssigner;

/** Editöre eklenecek blockId-destekli node extensions. */
export const BlockIdNodeExtensions: Node[] = [
  BlockIdParagraph,
  BlockIdHeading,
  BlockIdCodeBlock,
  BlockIdHorizontalRule,
] as unknown as Node[];
