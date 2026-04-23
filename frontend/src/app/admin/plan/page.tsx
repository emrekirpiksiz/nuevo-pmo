"use client";

import { StubPage } from "@/components/StubPage";

export default function PlanPage() {
  return (
    <StubPage
      eyebrow="Workspace · Proje Planı"
      title="Proje Planı"
      description="Tüm projelerin timeline ve epic bazlı ilerleyişini gösteren portföy planlama görünümü yakında."
      card={{
        title: "Portföy planı",
        body: "Birden fazla projeyi tek bir Gantt benzeri görünümde planlayabileceğiniz bu sayfa, plan veri modeli tamamlandığında devreye girecek.",
      }}
    />
  );
}
