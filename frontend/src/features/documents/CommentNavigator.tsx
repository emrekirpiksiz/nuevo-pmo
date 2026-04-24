"use client";

import { Button, Tooltip, Typography } from "antd";
import { LeftOutlined, RightOutlined, MessageOutlined } from "@ant-design/icons";

interface Props {
  /** 0 ise hiçbir açık yorum yok — placeholder gösterir. */
  total: number;
  /** Aktif yorumun 0-based index'i. Hiç seçili değilse -1. */
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Doküman üst barına yerleştirilen "açık yorumlar arasında gez" bileşeni. */
export function CommentNavigator({ total, currentIndex, onPrev, onNext }: Props) {
  if (total === 0) return null;

  const position = currentIndex < 0 ? "—" : `${currentIndex + 1}`;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <MessageOutlined style={{ color: "#fa8c16", fontSize: 13 }} />
      <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>
        <b>{position}</b>/{total}
      </Typography.Text>
      <Tooltip title="Önceki yorum (↑)">
        <Button
          size="small"
          icon={<LeftOutlined />}
          onClick={onPrev}
          style={{ padding: "0 6px" }}
        />
      </Tooltip>
      <Tooltip title="Sıradaki yorum (↓)">
        <Button
          size="small"
          icon={<RightOutlined />}
          onClick={onNext}
          style={{ padding: "0 6px" }}
        />
      </Tooltip>
    </div>
  );
}
