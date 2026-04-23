"use client";

import { ReactNode } from "react";

export interface SegTabItem<T extends string = string> {
  key: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
  soon?: boolean;
}

export interface SegTabsProps<T extends string = string> {
  items: SegTabItem<T>[];
  value: T;
  onChange: (key: T) => void;
}

export function SegTabs<T extends string>({ items, value, onChange }: SegTabsProps<T>) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          type="button"
          key={it.key}
          className={
            "tab" +
            (value === it.key ? " active" : "") +
            (it.soon ? " disabled" : "")
          }
          onClick={() => !it.soon && onChange(it.key)}
        >
          {it.icon}
          {it.label}
          {it.count != null && (
            <span className="subtle mono" style={{ fontSize: 11 }}>
              {it.count}
            </span>
          )}
          {it.soon && <span className="soon">Yakında</span>}
        </button>
      ))}
    </div>
  );
}
