"use client";

import { StubPage } from "@/components/StubPage";

export default function GlobalCommentsPage() {
  return (
    <StubPage
      eyebrow="Workspace · Yorumlar"
      title="Tüm Yorumlar"
      description="Müşterilerin tüm dokümanlarda bıraktığı yorumlar burada toplanacak. Açık olanlara öncelik verebilirsiniz."
      card={{
        title: "Cross-project yorum akışı",
        body: "Açık ve çözülmüş yorumların tüm projeler arasında listeleneceği bu görünüm yakında.",
      }}
    />
  );
}
