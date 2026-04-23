import { Comment } from "@/lib/apis";

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Yorumların blockId'leri, doküman yeniden parse edildiğinde
 * (örn. markdown → Tiptap JSON dönüşümü) DOM'daki bloklara artık eşleşmeyebilir.
 *
 * Bu fonksiyon her yorum için güncel DOM'daki **gerçek** blockId'yi hesaplar:
 *  1. Yorumun orijinal blockId'si içerikteyse olduğu gibi kullan.
 *  2. Değilse, anchorText'e göre metin eşleştirmesiyle (prefix match) yeni blockId'yi bul.
 *  3. Hiçbiri eşleşmezse null döner (effectively orphan).
 *
 * Döner: Map<comment.blockId, effective blockId>. Yalnızca başarıyla çözülenler.
 */
export function computeEffectiveBlockIdMap(
  comments: Comment[],
  blockTextMap: Map<string, string>
): Map<string, string> {
  const result = new Map<string, string>();
  if (blockTextMap.size === 0) return result;

  const existingBlockIds = new Set(blockTextMap.keys());

  // Ters indeks: normalize(text) → blockId (ilk eşleşen)
  const textToId = new Map<string, string>();
  for (const [bid, text] of blockTextMap.entries()) {
    const t = normalize(text);
    if (t && !textToId.has(t)) textToId.set(t, bid);
  }

  for (const c of comments) {
    // Orijinal blockId hâlâ mevcutsa aynen kullan
    if (c.blockId && existingBlockIds.has(c.blockId)) {
      result.set(c.blockId, c.blockId);
      continue;
    }

    const anchor = normalize(c.anchorText ?? "");
    if (!anchor) continue;

    // Tam normalize eşleşmesi
    const exact = textToId.get(anchor);
    if (exact) {
      result.set(c.blockId, exact);
      continue;
    }

    // Prefix / superset eşleşmesi: hangi blok metni anchor'ı içeriyor ya da tersi
    let bestId: string | null = null;
    let bestScore = 0;
    for (const [bid, text] of blockTextMap.entries()) {
      const t = normalize(text);
      if (!t) continue;
      const a = anchor;
      let score = 0;
      // Anchor 200 karaktere kesilmiş olabilir → block metni anchor'la başlıyorsa +büyük skor
      if (t.startsWith(a)) score = a.length;
      else if (a.startsWith(t)) score = t.length;
      else if (t.includes(a)) score = Math.floor(a.length * 0.8);
      else if (a.includes(t) && t.length > 20) score = Math.floor(t.length * 0.8);
      if (score > bestScore) {
        bestScore = score;
        bestId = bid;
      }
    }
    if (bestId && bestScore >= 15) {
      result.set(c.blockId, bestId);
    }
  }

  return result;
}
