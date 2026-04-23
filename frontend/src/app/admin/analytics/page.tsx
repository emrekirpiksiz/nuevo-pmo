"use client";

import { StubPage } from "@/components/StubPage";

export default function AnalyticsPage() {
  return (
    <StubPage
      eyebrow="Workspace · Analitik"
      title="Portföy Analitiği"
      description="Doküman okunma süreleri, müşteri etkileşimi ve onay döngü süreleri gibi cross-project metrikler yakında."
      card={{
        title: "Portföy analitiği",
        body: "Hangi müşteri hangi sıklıkta dokümanlarınızı okuyor, ortalama onay süreniz ne, açık yorumların kapanma süresi nasıl gidiyor? Bu sayfa cross-project veri toplandığında devreye girecek.",
      }}
    />
  );
}
