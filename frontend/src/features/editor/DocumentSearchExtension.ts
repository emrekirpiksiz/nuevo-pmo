import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const documentSearchPluginKey = new PluginKey<DocumentSearchState>(
  "documentSearch"
);

export interface SearchMatch {
  from: number;
  to: number;
}

export interface DocumentSearchState {
  query: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  currentIndex: number;
  /** Belirli bir üst limiti aştığımızda cap'lendi bilgisi — UI "500+" gösterebilir. */
  truncated: boolean;
}

const EMPTY: DocumentSearchState = {
  query: "",
  caseSensitive: false,
  matches: [],
  currentIndex: -1,
  truncated: false,
};

/** Uzun dokümanlarda sonsuz match hesabı yapmayalım. */
const MAX_MATCHES = 500;

function computeMatches(
  doc: import("@tiptap/pm/model").Node,
  query: string,
  caseSensitive: boolean
): { matches: SearchMatch[]; truncated: boolean } {
  const matches: SearchMatch[] = [];
  if (!query) return { matches, truncated: false };
  const needle = caseSensitive ? query : query.toLowerCase();
  if (!needle) return { matches, truncated: false };

  let truncated = false;
  doc.descendants((node, pos) => {
    if (matches.length >= MAX_MATCHES) {
      truncated = true;
      return false;
    }
    if (!node.isText || !node.text) return true;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(needle, from);
      if (idx < 0) break;
      matches.push({ from: pos + idx, to: pos + idx + query.length });
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        return false;
      }
      from = idx + query.length;
    }
    return true;
  });

  return { matches, truncated };
}

export const DocumentSearchExtension = Extension.create({
  name: "documentSearch",

  addProseMirrorPlugins() {
    return [
      new Plugin<DocumentSearchState>({
        key: documentSearchPluginKey,

        state: {
          init: () => EMPTY,
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(documentSearchPluginKey) as
              | Partial<Pick<DocumentSearchState, "query" | "caseSensitive" | "currentIndex">>
              | undefined;

            // Ne meta ne de doc değişimi varsa önceki state aynen döner.
            if (meta === undefined && !tr.docChanged) return prev;

            const query = meta?.query ?? prev.query;
            const caseSensitive = meta?.caseSensitive ?? prev.caseSensitive;

            if (!query) return EMPTY;

            const { matches, truncated } = computeMatches(newState.doc, query, caseSensitive);
            let currentIndex = meta?.currentIndex ?? prev.currentIndex;
            if (currentIndex >= matches.length) currentIndex = matches.length > 0 ? 0 : -1;
            if (currentIndex < 0 && matches.length > 0) currentIndex = 0;

            return { query, caseSensitive, matches, currentIndex, truncated };
          },
        },

        props: {
          decorations(state) {
            const s = documentSearchPluginKey.getState(state);
            if (!s || s.matches.length === 0) return null;
            const decos: Decoration[] = [];
            for (let i = 0; i < s.matches.length; i++) {
              const m = s.matches[i];
              decos.push(
                Decoration.inline(m.from, m.to, {
                  class:
                    i === s.currentIndex ? "doc-search-hit doc-search-current" : "doc-search-hit",
                })
              );
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
