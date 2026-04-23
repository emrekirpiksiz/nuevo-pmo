"use client";

import { StubPage } from "@/components/StubPage";

export default function TicketsPage() {
  return (
    <StubPage
      eyebrow="Tickets"
      title="Tickets"
      description="Projeler arası görev takibi, hata bildirimleri ve aksiyon kalemleri yakında bu ekranda yönetilebilecek."
      card={{
        title: "Proje görev yönetimi",
        body: "Müşteri talepleri, iç görevler ve hata bildirimleri — tüm projeler üzerinde merkezi bir Tickets arayüzü geliştirme aşamasındadır.",
      }}
    />
  );
}
