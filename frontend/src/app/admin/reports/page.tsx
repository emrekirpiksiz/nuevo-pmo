"use client";

import { StubPage } from "@/components/StubPage";

export default function ReportsPage() {
  return (
    <StubPage
      eyebrow="Workspace · Raporlar"
      title="Raporlar"
      description="Haftalık portföy raporları ve müşterilerle paylaşılabilen sayfa şablonları yakında."
      card={{
        title: "Otomatik portföy raporları",
        body: "Hangi projede hangi sürüm onaylandı, hangi yorumlar çözüldü, hangileri açık — haftalık bir özet halinde otomatik üretilecek.",
      }}
    />
  );
}
