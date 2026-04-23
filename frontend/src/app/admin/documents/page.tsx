"use client";

import { StubPage } from "@/components/StubPage";

export default function GlobalDocumentsPage() {
  return (
    <StubPage
      eyebrow="Workspace · Dokümanlar"
      title="Tüm Dokümanlar"
      description="Tüm projelerdeki dokümanları tek bir tabloda; müşteri onayı, açık yorum ve son düzenleme bilgileriyle takip edin."
      card={{
        title: "Cross-project doküman listesi",
        body: "Tüm projelerden dokümanları tek bir tabloda listeleyen API uç noktası tamamlandığında bu sayfa devreye alınacak.",
      }}
    />
  );
}
