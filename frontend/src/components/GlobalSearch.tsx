"use client";

import { AppstoreOutlined, ArrowRightOutlined, SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { Empty } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CustomersApi, ProjectsApi } from "@/lib/apis";

interface SearchResult {
  type: "project" | "customer";
  id: string;
  name: string;
  sub?: string;
  href: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectsApi.list(),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => CustomersApi.list(),
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const items: SearchResult[] = [];

    for (const p of projects ?? []) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.customerName ?? "").toLowerCase().includes(q)
      ) {
        items.push({
          type: "project",
          id: p.id,
          name: p.name,
          sub: `${p.code} · ${p.customerName ?? ""}`,
          href: `/admin/projects/${p.id}`,
        });
      }
    }

    for (const c of customers ?? []) {
      if (
        c.name.toLowerCase().includes(q) ||
        (c.contactEmail ?? "").toLowerCase().includes(q)
      ) {
        items.push({
          type: "customer",
          id: c.id,
          name: c.name,
          sub: c.contactEmail,
          href: `/admin/customers/${c.id}`,
        });
      }
    }

    return items.slice(0, 8);
  }, [query, projects, customers]);

  useEffect(() => {
    setHighlighted(0);
  }, [results]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      navigate(results[highlighted].href);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 29, 33, 0.4)",
          zIndex: 1000,
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 560,
          background: "var(--surface)",
          borderRadius: 12,
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 1001,
          overflow: "hidden",
        }}
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <SearchOutlined style={{ color: "var(--ink-subtle)", fontSize: 16, flexShrink: 0 }} />
          <input
            ref={inputRef}
            placeholder="Proje, müşteri ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 15,
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              color: "var(--ink-subtle)",
              background: "var(--surface-muted)",
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {!query.trim() && (
            <div style={{ padding: "14px 18px", color: "var(--ink-subtle)", fontSize: 13 }}>
              Proje adı, kod veya müşteri adıyla arayabilirsiniz.
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <div style={{ padding: "28px 0" }}>
              <Empty description="Sonuç bulunamadı" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => navigate(r.href)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                border: "none",
                background: i === highlighted ? "var(--surface-muted)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--surface-muted)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-muted)",
                  flexShrink: 0,
                  fontSize: 14,
                }}
              >
                {r.type === "project" ? <AppstoreOutlined /> : <TeamOutlined />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5, color: "var(--ink)" }}>{r.name}</div>
                {r.sub && (
                  <div style={{ fontSize: 12, color: "var(--ink-subtle)", marginTop: 1 }} className="ellipsis">
                    {r.sub}
                  </div>
                )}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-subtle)",
                  background: "var(--surface-sunken)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                {r.type === "project" ? "Proje" : "Müşteri"}
              </span>
              <ArrowRightOutlined style={{ fontSize: 11, color: "var(--ink-subtle)", flexShrink: 0 }} />
            </button>
          ))}
          {results.length > 0 && (
            <div
              style={{
                padding: "8px 16px",
                borderTop: "1px solid var(--border)",
                fontSize: 11,
                color: "var(--ink-subtle)",
                display: "flex",
                gap: 16,
              }}
            >
              <span>↑↓ Gezin</span>
              <span>↵ Aç</span>
              <span>ESC Kapat</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
