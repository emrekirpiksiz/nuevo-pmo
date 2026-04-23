"use client";

import { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { ComingSoon } from "./ComingSoon";

export interface StubPageProps {
  eyebrow: string;
  title: string;
  description: string;
  card: { title: string; body: ReactNode };
}

export function StubPage({ eyebrow, title, description, card }: StubPageProps) {
  return (
    <div className="page">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <ComingSoon title={card.title} description={card.body} />
    </div>
  );
}
