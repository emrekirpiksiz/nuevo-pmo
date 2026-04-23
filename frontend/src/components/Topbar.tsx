"use client";

import { SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { Fragment, ReactNode, useEffect, useState } from "react";
import { NotificationsBell } from "./NotificationsBell";
import { GlobalSearch } from "./GlobalSearch";

export interface TopbarProps {
  crumbs: string[];
  actions?: ReactNode;
  kind?: "admin" | "customer";
}

export function Topbar({ crumbs, actions, kind = "admin" }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (kind === "admin") setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [kind]);

  return (
    <>
      <div className="tb">
        <div className="tb-breadcrumb">
          {crumbs.map((c, i) => (
            <Fragment key={`${i}-${c}`}>
              {i > 0 && <span className="sep">/</span>}
              <span className={i === crumbs.length - 1 ? "curr ellipsis" : "ellipsis"}>
                {c}
              </span>
            </Fragment>
          ))}
        </div>

        {kind === "admin" && (
          <div
            className="tb-search"
            role="button"
            tabIndex={0}
            aria-label="Global arama"
            onClick={() => setSearchOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setSearchOpen(true)}
          >
            <SearchOutlined style={{ fontSize: 13 }} />
            <span>Proje, müşteri ara</span>
            <kbd>⌘K</kbd>
          </div>
        )}

        <NotificationsBell />
        <button type="button" className="tb-btn" aria-label="Ayarlar">
          <SettingOutlined style={{ fontSize: 15 }} />
        </button>
        {actions}
      </div>

      {kind === "admin" && (
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </>
  );
}
