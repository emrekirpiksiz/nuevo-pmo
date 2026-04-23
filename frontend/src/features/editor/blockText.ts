/**
 * Extract a Map<blockId, plainText> from a ProseMirror JSON document.
 * Used to compare a comment's stored anchorText with the current block text
 * (track-changes view).
 */
export function extractBlockTextMap(contentJson: string | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!contentJson) return map;
  try {
    const root = JSON.parse(contentJson);
    walk(root, map);
  } catch {
    // ignore
  }
  return map;
}

function walk(node: any, map: Map<string, string>): void {
  if (!node || typeof node !== "object") return;
  const blockId = node.attrs?.blockId;
  if (typeof blockId === "string" && blockId.length > 0) {
    // Only store when not already present (first — usually outermost — wins);
    // BlockIdExtension guarantees uniqueness, so this is just defensive.
    if (!map.has(blockId)) {
      map.set(blockId, nodeText(node).trim());
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, map);
  }
}

function nodeText(node: any): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(nodeText).join("");
  }
  return "";
}
