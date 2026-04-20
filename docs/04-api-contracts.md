# 04 — API Kontratı

Tüm endpoint'ler JSON. Auth: `Authorization: Bearer <JWT>` (veya Httponly cookie).  
Error formatı: RFC7807 `ProblemDetails` + `traceId`, `errors[]`.

## Auth

| Method | Path                              | Kim       | Açıklama |
|--------|-----------------------------------|-----------|----------|
| POST   | `/api/auth/o365/login`            | Public    | Nuevo SSO code exchange → JWT |
| GET    | `/api/auth/o365/redirect-url`     | Public    | AAD authorize URL üretir |
| POST   | `/api/auth/customer/login`        | Public    | Email+Password → JWT |
| POST   | `/api/auth/invite/accept`         | Public    | Token + yeni parola → User yaratır, login bilgisi döner |
| GET    | `/api/auth/me`                    | Her login | Mevcut kullanıcı bilgisi |
| POST   | `/api/auth/logout`                | Her login | Token revoke (refresh yoksa no-op) |

## Müşteri / Kullanıcı (Admin)

| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | `/api/admin/customers`                            |
| POST   | `/api/admin/customers`                            |
| GET    | `/api/admin/customers/{id}`                       |
| PATCH  | `/api/admin/customers/{id}`                       |
| DELETE | `/api/admin/customers/{id}`                       |
| GET    | `/api/admin/customers/{id}/users`                 |
| POST   | `/api/admin/customers/{id}/invitations`           |

## Proje (Admin)

| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | `/api/admin/projects`                             |
| POST   | `/api/admin/projects`                             |
| GET    | `/api/admin/projects/{id}`                        |
| PATCH  | `/api/admin/projects/{id}`                        |
| DELETE | `/api/admin/projects/{id}`                        |
| GET    | `/api/admin/projects/{id}/members`                |
| POST   | `/api/admin/projects/{id}/members`                |
| DELETE | `/api/admin/projects/{id}/members/{userId}`       |

## Proje ve Doküman (Shared)

Her iki taraf (admin + customer) kendi yetkisine göre görür.

| Method | Path                                              |
|--------|---------------------------------------------------|
| GET    | `/api/projects`                                   |
| GET    | `/api/projects/{id}`                              |
| GET    | `/api/projects/{id}/documents`                    |

## Doküman (Admin — yazma)

| Method | Path                                                           |
|--------|----------------------------------------------------------------|
| POST   | `/api/projects/{projectId}/documents`                          |
| GET    | `/api/documents/{id}`                                          |
| PATCH  | `/api/documents/{id}` (title/type)                             |
| DELETE | `/api/documents/{id}`                                          |
| GET    | `/api/documents/{id}/versions`                                 |
| GET    | `/api/documents/{id}/versions/{versionId}`                     |
| PUT    | `/api/documents/{id}/content` — yeni draft version oluşturur   |
| POST   | `/api/documents/{id}/versions/{versionId}/publish`             |
| GET    | `/api/documents/{id}/export.docx?versionId=...`                |

## Approval (Customer)

| Method | Path                                                           |
|--------|----------------------------------------------------------------|
| POST   | `/api/documents/{id}/versions/{versionId}/approve`             |
| GET    | `/api/documents/{id}/approvals`                                |

## Comments

| Method | Path                                                           |
|--------|----------------------------------------------------------------|
| GET    | `/api/documents/{id}/comments?status=open,resolved,orphaned`   |
| POST   | `/api/documents/{id}/comments`                                 |
| PATCH  | `/api/comments/{id}` (body güncelle)                           |
| DELETE | `/api/comments/{id}`                                           |
| POST   | `/api/comments/{id}/replies`                                   |
| PATCH  | `/api/comments/{id}/resolve`                                   |
| PATCH  | `/api/comments/{id}/reopen`                                    |

## Analytics

| Method | Path                                                           |
|--------|----------------------------------------------------------------|
| POST   | `/api/documents/{id}/views`  (open session; returns sessionId) |
| POST   | `/api/documents/{id}/views/{sessionId}/heartbeat`              |
| POST   | `/api/documents/{id}/views/{sessionId}/close`                  |
| GET    | `/api/admin/documents/{id}/analytics`                          |

## Örnek DTO'lar

### `CreateCustomer`
```json
{ "name": "Acme Corp", "contactEmail": "pm@acme.com" }
```

### `CreateProject`
```json
{
  "code": "NUEVO-2026-001",
  "name": "Acme Portal Rewrite",
  "description": "...",
  "customerId": "c5e0...-uuid"
}
```

### `PutDocumentContent` (yeni version)
```json
{
  "contentJson": { "type": "doc", "content": [...] },
  "contentMarkdown": "# Title\n\n..."
}
```

### `CreateComment`
```json
{
  "versionId": "uuid",
  "blockId": "uuid",
  "anchorText": "The system shall ...",
  "body": "Bu kısmı açıklar mısınız?"
}
```

### `ApproveVersion`
```json
{ "note": "V2.1 onaylanmıştır." }
```

### Analytics Response (Admin)
```json
{
  "documentId": "uuid",
  "totalViews": 42,
  "byVersion": [
    {
      "versionId": "uuid",
      "versionNumber": "2.1",
      "viewCount": 14,
      "uniqueViewers": 3,
      "totalDurationSeconds": 2541,
      "viewers": [
        { "userId": "uuid", "userName": "Jane Doe", "lastViewAt": "2026-04-19T12:10:00Z", "totalDurationSeconds": 880 }
      ]
    }
  ]
}
```
