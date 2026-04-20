# 05 — Auth Flow'ları

## 1. Nuevo Admin — O365 SSO (Authorization Code + PKCE)

```mermaid
sequenceDiagram
    participant U as Nuevo User
    participant FE as Next.js
    participant API as Nuevo.PMO.Api
    participant AAD as Azure AD

    U->>FE: /admin/login
    FE->>API: GET /auth/o365/redirect-url
    API-->>FE: AAD authorize URL (state, pkce)
    FE->>AAD: redirect (browser)
    AAD->>U: sign in + consent
    AAD->>FE: /admin/callback?code=...&state=...
    FE->>API: POST /auth/o365/login { code, state, codeVerifier }
    API->>AAD: token endpoint (code exchange)
    AAD-->>API: id_token, access_token
    API->>API: validate, upsert User (UserType=Nuevo), issue app JWT
    API-->>FE: { accessToken, user }
    FE->>FE: store in memory + Httponly cookie
```

**Notlar**
- Backend `Microsoft.Identity.Web` ile code exchange yapar.
- App JWT `UserId, Email, UserType=Nuevo` claim'leri taşır; 60 dakika TTL.
- Refresh MVP'de yok; süresi dolunca tekrar login.

## 2. Müşteri Davet + İlk Giriş

```mermaid
sequenceDiagram
    participant Adm as Nuevo Admin
    participant API
    participant DB
    participant Mail as SMTP
    participant Cus as Customer

    Adm->>API: POST /admin/customers/{id}/invitations { email }
    API->>DB: insert Invitation (token hash, expiresAt +7d)
    API->>Mail: send invite link (plain token)
    API-->>Adm: 201
    Cus->>Cus: email'den tıklar
    Cus->>API: POST /auth/invite/accept { token, displayName, password }
    API->>DB: validate token, create User (UserType=Customer), hash password, mark accepted
    API-->>Cus: { accessToken, user }
```

**Notlar**
- `Invitation.Token` DB'de hash olarak tutulur (`SHA256` + salt); mail'deki link plain.
- Expiration: 7 gün default (config'den).
- Parola: minimum 10 karakter, en az bir rakam + bir harf (FluentValidation).

## 3. Müşteri Login

```mermaid
sequenceDiagram
    participant Cus
    participant API
    participant DB

    Cus->>API: POST /auth/customer/login { email, password }
    API->>DB: User lookup (UserType=Customer, active)
    API->>API: Pbkdf2 verify
    alt OK
      API-->>Cus: { accessToken, user, customerId }
    else Bad
      API-->>Cus: 401
    end
```

## 4. Authorization

- **Policy:** `NuevoOnly` → `UserType == Nuevo`.
- **Policy:** `CustomerOnly` → `UserType == Customer`.
- **Resource-based:** `IAuthorizationHandler` `ProjectMemberRequirement`:
  - Nuevo kullanıcı → `ProjectMember` kaydı varsa OK.
  - Customer kullanıcı → `Project.CustomerId == user.CustomerId` ve `ProjectMember` kaydı varsa OK.
- **Write endpoint'ler:** Nuevo için `PMOwner`/`PMOMember` rolleri, customer için `CustomerContributor` (yorum, approve) yeterli; `CustomerViewer` yalnızca okuma.

## 5. Şifre Hash

- PBKDF2, SHA256, 100000 iterasyon, 16 byte salt, 32 byte key.
- `PasswordHash = base64(salt) + "." + base64(key)`.

## 6. Token (JWT) Claim'leri

- `sub` — UserId
- `email`
- `name`
- `user_type` — `Nuevo` | `Customer`
- `customer_id` — müşteri ise
- `iat`, `exp`
