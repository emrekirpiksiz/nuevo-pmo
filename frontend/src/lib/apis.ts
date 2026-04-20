import { api } from "./api";

export type UserType = "Nuevo" | "Customer";
export type ProjectStatus = "Active" | "OnHold" | "Completed" | "Cancelled";
export type ProjectRole = "PMOwner" | "PMOMember" | "CustomerViewer" | "CustomerContributor";
export type DocumentType = "Analysis" | "Scope" | "Meeting" | "Other";
export type CommentStatus = "Open" | "Resolved" | "Orphaned";

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
    api
      .post<ProjectMember>(`/api/admin/projects/${id}/members`, { userId, role })
      .then((r) => r.data),
  removeMember: (id: string, userId: string) =>
    api.delete(`/api/admin/projects/${id}/members/${userId}`),
  availableUsers: (id: string, search?: string) =>
    api
      .get<AvailableUser[]>(`/api/admin/projects/${id}/available-users`, { params: { search } })
      .then((r) => r.data),
};

export interface DocumentDto {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: DocumentType;
  currentDraftVersionId?: string | null;
  currentDraftVersionNumber?: string | null;
  publishedVersionId?: string | null;
  publishedVersionNumber?: string | null;
  publishedAt?: string | null;
  approvedVersionId?: string | null;
  approvedVersionNumber?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  openCommentCount: number;
}

export interface DocumentVersionDto {
  id: string;
  documentId: string;
  major: number;
  minor: number;
  versionNumber: string;
  isPublished: boolean;
  isDraft: boolean;
  isApproved: boolean;
  createdAt: string;
  createdBy?: string | null;
  publishedAt?: string | null;
}

export interface DocumentVersionContentDto extends DocumentVersionDto {
  contentJson: string;
  contentMarkdown: string;
}

export interface DocumentApprovalDto {
  id: string;
  documentVersionId: string;
  versionNumber: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  note?: string | null;
}

export const DocumentsApi = {
  listByProject: (projectId: string) =>
    api.get<DocumentDto[]>(`/api/projects/${projectId}/documents`).then((r) => r.data),
  get: (id: string) => api.get<DocumentDto>(`/api/documents/${id}`).then((r) => r.data),
  create: (projectId: string, title: string, type: DocumentType) =>
    api
      .post<DocumentDto>(`/api/projects/${projectId}/documents`, { title, type })
      .then((r) => r.data),
  update: (id: string, title: string, type: DocumentType) =>
    api.patch(`/api/documents/${id}`, { title, type }),
  remove: (id: string) => api.delete(`/api/documents/${id}`),
  versions: (id: string) =>
    api.get<DocumentVersionDto[]>(`/api/documents/${id}/versions`).then((r) => r.data),
  version: (id: string, versionId: string) =>
    api
      .get<DocumentVersionContentDto>(`/api/documents/${id}/versions/${versionId}`)
      .then((r) => r.data),
  saveContent: (id: string, contentJson: string, contentMarkdown: string) =>
    api
      .put<DocumentVersionDto>(`/api/documents/${id}/content`, { contentJson, contentMarkdown })
      .then((r) => r.data),
  publish: (id: string, versionId: string) =>
    api.post(`/api/documents/${id}/versions/${versionId}/publish`),
  approve: (id: string, versionId: string, note?: string) =>
    api
      .post<DocumentApprovalDto>(`/api/documents/${id}/versions/${versionId}/approve`, { note })
      .then((r) => r.data),
  approvals: (id: string) =>
    api.get<DocumentApprovalDto[]>(`/api/documents/${id}/approvals`).then((r) => r.data),
  exportDocxUrl: (id: string, versionId?: string) => {
    const q = versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
    return `/api/documents/${id}/export.docx${q}`;
  },
  analytics: (id: string) =>
    api.get(`/api/admin/documents/${id}/analytics`).then((r) => r.data),
};

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
  versionId: string;
  versionNumber: string;
  blockId: string;
  anchorText: string;
  body: string;
  status: CommentStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  replies: CommentReply[];
}

export const CommentsApi = {
  list: (documentId: string, status?: CommentStatus[]) =>
    api
      .get<Comment[]>(`/api/documents/${documentId}/comments`, {
        params: { status: status && status.length ? status.join(",") : undefined },
      })
      .then((r) => r.data),
  create: (documentId: string, payload: { versionId: string; blockId: string; anchorText: string; body: string }) =>
    api.post<Comment>(`/api/documents/${documentId}/comments`, payload).then((r) => r.data),
  update: (id: string, body: string) => api.patch(`/api/comments/${id}`, { body }),
  remove: (id: string) => api.delete(`/api/comments/${id}`),
  reply: (id: string, body: string) =>
    api.post<CommentReply>(`/api/comments/${id}/replies`, { body }).then((r) => r.data),
  resolve: (id: string) => api.patch(`/api/comments/${id}/resolve`),
  reopen: (id: string) => api.patch(`/api/comments/${id}/reopen`),
};

export interface ViewSession {
  sessionId: string;
  heartbeatIntervalSec: number;
}

export const ViewsApi = {
  start: (documentId: string, versionId: string) =>
    api.post<ViewSession>(`/api/documents/${documentId}/views`, { versionId }).then((r) => r.data),
  heartbeat: (documentId: string, sessionId: string) =>
    api.post(`/api/documents/${documentId}/views/${sessionId}/heartbeat`),
  close: (documentId: string, sessionId: string) =>
    api.post(`/api/documents/${documentId}/views/${sessionId}/close`),
};
