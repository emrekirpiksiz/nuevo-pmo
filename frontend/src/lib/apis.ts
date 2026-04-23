import { api } from "./api";

export type UserType = "Nuevo" | "Customer";
export type ProjectStatus = "Active" | "OnHold" | "Completed" | "Cancelled";
export type ProjectRole = "PMOwner" | "PMOMember" | "CustomerViewer" | "CustomerContributor";
export type DocumentType = "Analysis" | "Scope" | "Meeting" | "Other";
/**
 * Yorum durumu:
 *  - Open: aktif, cevaplanabilir.
 *  - Resolved: Nuevo "çözüldü" olarak işaretlemiş; yazan müşteri ya da
 *    Nuevo yeniden açabilir.
 *  - Orphaned: yayında blok tamamen silinmiş; yorum referansı kayıp.
 */
export type CommentStatus = "Open" | "Resolved" | "Orphaned";

export type BlockChangeKind = "Added" | "Modified" | "Removed";

export interface AuthResult {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    userType: UserType;
    customerId?: string | null;
    customerName?: string | null;
  };
}

export const AuthApi = {
  devLogin: (email: string, displayName = "") =>
    api.post<AuthResult>("/api/auth/dev/login", { email, displayName }).then((r) => r.data),
  customerLogin: (email: string, password: string) =>
    api.post<AuthResult>("/api/auth/customer/login", { email, password }).then((r) => r.data),
  acceptInvite: (token: string, displayName: string, password: string) =>
    api.post<AuthResult>("/api/auth/invite/accept", { token, displayName, password }).then((r) => r.data),
  me: () => api.get<AuthResult["user"]>("/api/auth/me").then((r) => r.data),
  o365Redirect: (state: string, codeVerifier: string) =>
    api.post<{ url: string }>("/api/auth/o365/redirect-url", { state, codeVerifier }).then((r) => r.data),
  o365Login: (code: string, codeVerifier: string) =>
    api.post<AuthResult>("/api/auth/o365/login", { code, codeVerifier }).then((r) => r.data),
};

export interface Customer {
  id: string;
  name: string;
  contactEmail: string;
  userCount: number;
  projectCount: number;
  createdAt: string;
}
export interface CustomerUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isPending: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export const CustomersApi = {
  list: (search?: string) =>
    api.get<Customer[]>("/api/admin/customers", { params: { search } }).then((r) => r.data),
  get: (id: string) => api.get<Customer>(`/api/admin/customers/${id}`).then((r) => r.data),
  create: (name: string, contactEmail: string) =>
    api.post<Customer>("/api/admin/customers", { name, contactEmail }).then((r) => r.data),
  update: (id: string, name: string, contactEmail: string) =>
    api.patch(`/api/admin/customers/${id}`, { name, contactEmail }),
  remove: (id: string) => api.delete(`/api/admin/customers/${id}`),
  users: (id: string) =>
    api.get<CustomerUser[]>(`/api/admin/customers/${id}/users`).then((r) => r.data),
  invite: (id: string, email: string) =>
    api
      .post<{ id: string; email: string; expiresAt: string; acceptUrl: string }>(
        `/api/admin/customers/${id}/invitations`,
        { email }
      )
      .then((r) => r.data),
};

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  customerId: string;
  customerName: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
}
export interface ProjectMember {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userType: UserType;
  role: ProjectRole;
}
export interface AvailableUser {
  id: string;
  email: string;
  displayName: string;
  userType: UserType;
  customerId?: string | null;
}

export const ProjectsApi = {
  list: (customerId?: string, search?: string) =>
    api.get<Project[]>("/api/projects", { params: { customerId, search } }).then((r) => r.data),
  get: (id: string) => api.get<Project>(`/api/projects/${id}`).then((r) => r.data),
  create: (payload: { code: string; name: string; description?: string; customerId: string }) =>
    api.post<Project>("/api/admin/projects", payload).then((r) => r.data),
  update: (id: string, payload: { name: string; description?: string; status: ProjectStatus }) =>
    api.patch(`/api/admin/projects/${id}`, payload),
  remove: (id: string) => api.delete(`/api/admin/projects/${id}`),
  members: (id: string) =>
    api.get<ProjectMember[]>(`/api/projects/${id}/members`).then((r) => r.data),
  addMember: (id: string, userId: string, role: ProjectRole) =>
    api.post<ProjectMember>(`/api/admin/projects/${id}/members`, { userId, role }).then((r) => r.data),
  removeMember: (id: string, userId: string) =>
    api.delete(`/api/admin/projects/${id}/members/${userId}`),
  availableUsers: (id: string, search?: string) =>
    api.get<AvailableUser[]>(`/api/admin/projects/${id}/available-users`, { params: { search } }).then((r) => r.data),
};

// ---------- Document ----------
export interface DocumentDto {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: DocumentType;

  /** Yayınlanmış müşteri sürümü sayısı (Publish her tetiklendiğinde +1). */
  currentMajor: number;

  /** En son yayınlanmış müşteri sürümü. İlk yayından önce null. */
  customerVersionId?: string | null;
  customerMajor?: number | null;
  customerDisplay?: string | null;
  customerVersionMarkedAt?: string | null;

  /** Yayınlanmış içerikten farklı bir taslak var mı? */
  hasDraftChanges: boolean;
  draftUpdatedAt?: string | null;

  createdAt: string;
  updatedAt?: string | null;

  openCommentCount: number;
  approvalCount: number;
  lastApprovedAt?: string | null;
}

/**
 * Admin için taslak içeriği, customer için son yayınlanmış içerik.
 */
export interface DocumentContentDto {
  documentId: string;
  isDraft: boolean;
  versionId?: string | null;
  versionMajor?: number | null;
  contentJson: string;
  contentMarkdown: string;
  updatedAt?: string | null;
}

export interface DocumentApprovalDto {
  id: string;
  documentVersionId: string;
  versionMajor: number;
  versionDisplay: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  note?: string | null;
}

export interface DocumentBlockChangeDto {
  id: string;
  documentId: string;
  fromVersionId?: string | null;
  fromVersionMajor?: number | null;
  toVersionId: string;
  toVersionMajor: number;
  /** Yayını gerçekleştiren kullanıcı + zaman. */
  publishedBy?: string | null;
  publishedByName?: string | null;
  publishedAt: string;
  blockId: string;
  kind: BlockChangeKind;
  oldText?: string | null;
  newText?: string | null;
  relatedCommentId?: string | null;
  relatedCommentBody?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}

export const DocumentsApi = {
  listByProject: (projectId: string) =>
    api.get<DocumentDto[]>(`/api/projects/${projectId}/documents`).then((r) => r.data),
  get: (id: string) => api.get<DocumentDto>(`/api/documents/${id}`).then((r) => r.data),
  create: (projectId: string, title: string, type: DocumentType) =>
    api.post<DocumentDto>(`/api/projects/${projectId}/documents`, { title, type }).then((r) => r.data),
  update: (id: string, title: string, type: DocumentType) =>
    api.patch(`/api/documents/${id}`, { title, type }),
  remove: (id: string) => api.delete(`/api/documents/${id}`),

  /** Admin → draft; customer → published version. */
  content: (id: string) =>
    api.get<DocumentContentDto>(`/api/documents/${id}/content`).then((r) => r.data),

  /** Admin taslağını günceller. */
  save: (id: string, contentJson: string, contentMarkdown: string) =>
    api.post<DocumentDto>(`/api/documents/${id}/save`, { contentJson, contentMarkdown }).then((r) => r.data),

  /** Taslağı yeni müşteri sürümü olarak yayınlar. */
  publish: (id: string, label?: string) =>
    api.post<DocumentDto>(`/api/documents/${id}/publish`, { label }).then((r) => r.data),

  /** Doküman için kaydedilmiş tüm blok değişiklikleri (veya belirli bir yayın). */
  changes: (id: string, versionId?: string) =>
    api
      .get<DocumentBlockChangeDto[]>(`/api/documents/${id}/changes`, { params: { versionId } })
      .then((r) => r.data),

  approve: (id: string, note?: string) =>
    api.post<DocumentApprovalDto>(`/api/documents/${id}/approve`, { note }).then((r) => r.data),
  approvals: (id: string) =>
    api.get<DocumentApprovalDto[]>(`/api/documents/${id}/approvals`).then((r) => r.data),

  exportDocxUrl: (id: string) => `/api/documents/${id}/export.docx`,

  analytics: (id: string) => api.get(`/api/admin/documents/${id}/analytics`).then((r) => r.data),
  auditLogs: (id: string, take = 200) =>
    api.get<AuditLogDto[]>(`/api/admin/documents/${id}/audit-logs`, { params: { take } }).then((r) => r.data),
};

export interface AuditLogDto {
  id: string;
  createdAt: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeJson?: string | null;
  afterJson?: string | null;
  ipAddress?: string | null;
  correlationId?: string | null;
}

export interface CommentReply {
  id: string;
  commentId: string;
  body: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  documentId: string;
  blockId: string;
  anchorText: string;
  body: string;
  status: CommentStatus;

  forVersionId?: string | null;
  forVersionMajor?: number | null;

  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;

  createdBy: string;
  createdByName: string;
  createdAt: string;
  replies: CommentReply[];
}

export const CommentsApi = {
  list: (documentId: string, status?: CommentStatus[]) =>
    api
      .get<Comment[]>(`/api/documents/${documentId}/comments`, {
        params: { status: status && status.length ? status.join(",") : undefined },
      })
      .then((r) => r.data),
  create: (documentId: string, payload: { blockId: string; anchorText: string; body: string }) =>
    api.post<Comment>(`/api/documents/${documentId}/comments`, payload).then((r) => r.data),
  update: (id: string, body: string) => api.patch(`/api/comments/${id}`, { body }),
  remove: (id: string) => api.delete(`/api/comments/${id}`),
  reply: (id: string, body: string) =>
    api.post<CommentReply>(`/api/comments/${id}/replies`, { body }).then((r) => r.data),
  /** Yorumu "çözüldü" olarak işaretler (yalnız Nuevo). */
  resolve: (id: string) => api.patch(`/api/comments/${id}/resolve`),
  /** Yorumu yeniden açar (Nuevo her zaman; müşteri yalnız kendi yorumu). */
  reopen: (id: string) => api.patch(`/api/comments/${id}/reopen`),
};

// ---------- Project Plan ----------

export type PlanStepStatus = "Planned" | "InProgress" | "Done" | "Blocked";
export type PlanMilestoneType = "CriticalPath" | "CustomerPending";
export type PlanMilestoneStatus = "Pending" | "Done";

export interface PlanStep {
  id?: string;
  /**
   * Üst adımın id'si. Sunucudan gelen mevcut adımlar için dolu, yerel olarak
   * eklenen yeni adımlar için null.
   */
  parentStepId?: string | null;
  order: number;
  title: string;
  description?: string | null;
  /** ISO year-week, "2025-W12". */
  startYearWeek?: string | null;
  /** ISO year-week, "2025-W16". */
  endYearWeek?: string | null;
  /** Planlanan adam-gün (admin görür, müşteri görmez). */
  plannedManDays?: number | null;
  /** Gerçekleşen adam-gün (admin görür, müşteri görmez). */
  actualManDays?: number | null;
  progress: number;
  status: PlanStepStatus;
}

/**
 * Frontend-local step: düzenleme sırasında client tarafında üretilen refKey
 * ile parent seçimi yapılır; `parentStepId` sadece sunucudan gelen kayıtlar
 * için doludur.
 */
export interface PlanStepLocal extends PlanStep {
  refKey: string;
  parentRefKey?: string | null;
}

export interface PlanMilestone {
  id?: string;
  order: number;
  title: string;
  description?: string | null;
  type: PlanMilestoneType;
  status: PlanMilestoneStatus;
  deadline?: string | null;
  completedAt?: string | null;
}

export interface ProjectPlan {
  projectId: string;
  overallProgress: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
  steps: PlanStep[];
  milestones: PlanMilestone[];
}

export interface PlanSnapshotSummary {
  id: string;
  projectId: string;
  overallProgress: number;
  changeNote?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
}

export interface PlanSnapshotDetail extends PlanSnapshotSummary {
  steps: PlanStep[];
  milestones: PlanMilestone[];
}

export interface UpsertPlanStepInput {
  refKey?: string;
  parentRefKey?: string | null;
  order: number;
  title: string;
  description?: string | null;
  startYearWeek?: string | null;
  endYearWeek?: string | null;
  plannedManDays?: number | null;
  actualManDays?: number | null;
  progress: number;
  status: PlanStepStatus;
}

export interface UpsertPlanPayload {
  steps: UpsertPlanStepInput[];
  milestones: PlanMilestone[];
  changeNote?: string | null;
}

export const ProjectPlanApi = {
  getCurrent: (projectId: string) =>
    api.get<ProjectPlan>(`/api/projects/${projectId}/plan`).then((r) => r.data),
  upsert: (projectId: string, payload: UpsertPlanPayload) =>
    api.put<ProjectPlan>(`/api/projects/${projectId}/plan`, payload).then((r) => r.data),
  listHistory: (projectId: string) =>
    api.get<PlanSnapshotSummary[]>(`/api/projects/${projectId}/plan/history`).then((r) => r.data),
  getSnapshot: (projectId: string, snapshotId: string) =>
    api
      .get<PlanSnapshotDetail>(`/api/projects/${projectId}/plan/history/${snapshotId}`)
      .then((r) => r.data),
};

// ---------- Project Reports ----------

export interface ProjectReportSummary {
  id: string;
  projectId: string;
  title: string;
  reportDate: string;
  overallProgress?: number | null;
  summary?: string | null;
  createdAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
  updatedAt?: string | null;
}

export interface ProjectReportDetail extends ProjectReportSummary {
  contentJson: unknown | null;
}

export interface CreateReportPayload {
  title: string;
  reportDate: string;
  overallProgress?: number | null;
  summary?: string | null;
  contentJson: string;
}

export type UpdateReportPayload = CreateReportPayload;

export interface WeeklyReportTemplate {
  title: string;
  reportDate: string;
  overallProgress: number;
  summary: string;
  markdown: string;
}

export const ProjectReportsApi = {
  list: (projectId: string) =>
    api.get<ProjectReportSummary[]>(`/api/projects/${projectId}/reports`).then((r) => r.data),
  get: (projectId: string, reportId: string) =>
    api
      .get<ProjectReportDetail>(`/api/projects/${projectId}/reports/${reportId}`)
      .then((r) => r.data),
  create: (projectId: string, payload: CreateReportPayload) =>
    api.post<ProjectReportDetail>(`/api/projects/${projectId}/reports`, payload).then((r) => r.data),
  update: (projectId: string, reportId: string, payload: UpdateReportPayload) =>
    api
      .put<ProjectReportDetail>(`/api/projects/${projectId}/reports/${reportId}`, payload)
      .then((r) => r.data),
  remove: (projectId: string, reportId: string) =>
    api.delete(`/api/projects/${projectId}/reports/${reportId}`),
  /** Mevcut plan durumundan haftalık rapor şablonu üretir (kaydetmez). */
  weeklyTemplate: (projectId: string) =>
    api
      .get<WeeklyReportTemplate>(`/api/projects/${projectId}/reports/template/weekly`)
      .then((r) => r.data),
};

// ---------- Notifications ----------

export type NotificationType = "DocumentPublished" | "CommentCreated" | "CommentReplied";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  documentId?: string | null;
  documentTitle?: string | null;
  commentId?: string | null;
  actionUrl?: string | null;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  total: number;
  unreadCount: number;
}

export const NotificationsApi = {
  list: (params?: { unreadOnly?: boolean; skip?: number; take?: number }) =>
    api
      .get<NotificationListDto>("/api/notifications", {
        params: {
          unreadOnly: params?.unreadOnly ?? false,
          skip: params?.skip ?? 0,
          take: params?.take ?? 50,
        },
      })
      .then((r) => r.data),
  unreadCount: () => api.get<number>("/api/notifications/unread-count").then((r) => r.data),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post<number>("/api/notifications/read-all").then((r) => r.data),
};

export interface ViewSession {
  sessionId: string;
  heartbeatIntervalSec: number;
}

export const ViewsApi = {
  start: (documentId: string) =>
    api.post<ViewSession>(`/api/documents/${documentId}/views`).then((r) => r.data),
  heartbeat: (documentId: string, sessionId: string) =>
    api.post(`/api/documents/${documentId}/views/${sessionId}/heartbeat`),
  close: (documentId: string, sessionId: string) =>
    api.post(`/api/documents/${documentId}/views/${sessionId}/close`),
};
