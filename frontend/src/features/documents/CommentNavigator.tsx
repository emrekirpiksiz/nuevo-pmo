"use client";

import { Button, Space, Tooltip, Typography } from "antd";
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
  if (total === 0) {
    return (
      <Tooltip title="Açık yorum yok">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#8c8c8c", fontSize: 12 }}>
          <MessageOutlined />
          <span>0 açık yorum</span>
        </span>
      </Tooltip>
    );
  }
  const position = currentIndex < 0 ? "—" : `${currentIndex + 1}`;
  return (
    <Space size={4}>
      <MessageOutlined style={{ color: "#fa8c16" }} />
      <Typography.Text style={{ fontSize: 12 }}>
        <b>{position}</b> / {total} açık yorum
      </Typography.Text>
      <Tooltip title="Önceki yorum">
        <Button size="small" icon={<LeftOutlined />} onClick={onPrev} />
      </Tooltip>
      <Tooltip title="Sıradaki yorum">
        <Button size="small" type="primary" icon={<RightOutlined />} onClick={onNext}>
          Sıradaki
        </Button>
      </Tooltip>
    </Space>
  );
}
