"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, List, Row, Statistic, Tag, Typography } from "antd";
import { DocumentsApi } from "@/lib/apis";

interface AnalyticsViewer {
  userId: string;
  userName: string;
  userEmail: string;
  sessionCount: number;
  totalDurationSeconds: number;
  lastViewedAt?: string | null;
}
interface AnalyticsVersion {
  versionId: string;
  versionNumber: string;
  isPublished: boolean;
  viewCount: number;
  uniqueViewers: number;
  totalDurationSeconds: number;
  viewers: AnalyticsViewer[];
}
interface AnalyticsReport {
  documentId: string;
  totalViews: number;
  uniqueViewers: number;
  totalDurationSeconds: number;
  byVersion: AnalyticsVersion[];
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}s`);
  if (m) parts.push(`${m}dk`);
  parts.push(`${s}sn`);
  return parts.join(" ");
}

export function AnalyticsView({ documentId }: { documentId: string }) {
  const { data } = useQuery({
    queryKey: ["document-analytics", documentId],
    queryFn: () => DocumentsApi.analytics(documentId) as Promise<AnalyticsReport>,
  });

  if (!data) return <Empty description="Veri yükleniyor…" />;

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}><Card size="small"><Statistic title="Toplam Görüntüleme" value={data.totalViews} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Tekil İzleyici" value={data.uniqueViewers} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="Toplam Süre" value={fmtDuration(data.totalDurationSeconds)} /></Card></Col>
      </Row>
      <div style={{ height: 12 }} />
      {data.byVersion.length === 0 ? (
        <Empty description="Henüz görüntüleme yok" />
      ) : (
        data.byVersion.map((v) => (
          <Card
            key={v.versionId}
            size="small"
            title={
              <span>
                V{v.versionNumber} {v.isPublished && <Tag color="green">Published</Tag>}
              </span>
            }
            style={{ marginBottom: 12 }}
            extra={
              <span>
                {v.viewCount} görüntüleme · {v.uniqueViewers} tekil · {fmtDuration(v.totalDurationSeconds)}
              </span>
            }
          >
            <List
              dataSource={v.viewers}
              renderItem={(u) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Typography.Text strong>{u.userName}</Typography.Text>}
                    description={u.userEmail}
                  />
                  <Typography.Text type="secondary" style={{ marginRight: 12 }}>
                    {u.sessionCount} oturum
                  </Typography.Text>
                  <Typography.Text>{fmtDuration(u.totalDurationSeconds)}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        ))
      )}
    </div>
  );
}
