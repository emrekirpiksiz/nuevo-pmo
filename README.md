# Nuevo PMO Platform

Dış müşterilerle proje dokümanlarını paylaşma, versiyonlama, yorumlaşma ve onaylatma platformu.

## Tech Stack

- **Backend:** .NET 10, Clean Architecture (Domain / Application / Infrastructure / Api), MediatR, FluentValidation, EF Core, Serilog
- **Auth:** O365 SSO (Azure AD) — Nuevo admin · Magic-link invite + Email/Password — Customer
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Ant Design 5
- **Editor:** Tiptap (block-based ProseMirror editor, stable blockId)
- **DB:** PostgreSQL — **Neon serverless** (bulutta, local Postgres gerekmez)
- **Dev helpers:** Docker Compose (MailHog)

## Portlar

| Servis    | Port  | URL                        |
|-----------|-------|----------------------------|
| API       | 7000  | http://localhost:7000      |
| Frontend  | 7001  | http://localhost:7001      |
| MailHog   | 8025  | http://localhost:8025      |

## Klasör Yapısı

```
nuevo-pmo/
├─ docs/
│  ├─ 01-vision-and-scope.md
│  ├─ 02-architecture.md
│  ├─ 03-domain-model.md
│  ├─ 04-api-contracts.md
│  ├─ 05-auth-flows.md
│  ├─ 06-document-editor-and-comments.md
│  └─ scripts/
│     └─ start-dev.sh                     # portları temizler, clean build + migrate + başlat
├─ backend/
│  ├─ Nuevo.PMO.slnx
│  ├─ src/
│  │  ├─ Nuevo.PMO.Domain/                # Entities, enums, events
│  │  ├─ Nuevo.PMO.Application/           # CQRS (MediatR), DTOs, validators, interfaces
│  │  ├─ Nuevo.PMO.Infrastructure/        # EF Core, repos, identity, email, file storage
│  │  └─ Nuevo.PMO.Api/                   # Controllers, middlewares, DI, Swagger
│  └─ tests/
├─ frontend/
│  └─ src/
│     ├─ app/                             # Next.js App Router
│     ├─ components/
│     ├─ features/
│     ├─ lib/
│     └─ providers/
└─ docker-compose.yml                     # sadece mailhog
```

## Hızlı Başlangıç

```bash
./docs/scripts/start-dev.sh
```

Bu script:
1. 7000 ve 7001 portlarını temizler.
2. Backend'i clean build alır.
3. Neon veritabanına EF migration uygular.
4. API'yi (`:7000`) ve Frontend'i (`:7001`) arka planda başlatır; log'lar `logs/` altına yazılır.

Ek opsiyonlar:

| Değişken        | Açıklama                                         |
|-----------------|--------------------------------------------------|
| `NO_CLEAN=1`    | Clean build yerine incremental build             |
| `NO_MIGRATE=1`  | Migration adımını atla                           |
| `FRONTEND_ONLY=1` | Yalnız frontend                                |
| `BACKEND_ONLY=1`  | Yalnız backend                                 |
| `MAILHOG=1`     | MailHog'u da `docker compose` ile başlat         |

### Manuel başlatma

```bash
# Backend
cd backend
dotnet build
dotnet ef database update --project src/Nuevo.PMO.Infrastructure --startup-project src/Nuevo.PMO.Api
ASPNETCORE_URLS=http://localhost:7000 dotnet run --project src/Nuevo.PMO.Api

# Frontend (ayrı terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:7000 npm run dev    # :7001
```

## Veritabanı (Neon)

Connection string `backend/src/Nuevo.PMO.Api/appsettings.json` içinde `ConnectionStrings:Default` altında.
Bulut üstünde Neon serverless Postgres kullanılır; local Postgres gerekmez.

Override etmek için (önerilen):
```bash
export ConnectionStrings__Default="Host=...;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
```

## Azure AD (O365 SSO)

Nuevo admin kullanıcıları Microsoft 365 ile giriş yapar.

Kayıtlı uygulama (`appsettings.json` → `O365`):

| Alan          | Değer                                          |
|---------------|------------------------------------------------|
| TenantId      | `396ba6e8-d446-4a44-a7b1-9af3159b4452`         |
| ClientId      | `55a42dc1-05a0-4e26-a3d1-b4ca0bffe771`         |
| RedirectUri   | `http://localhost:7001/admin/callback`         |

### Azure tarafında yapılacaklar

1. [Azure Portal → App registrations → Nuevo-PMO](https://portal.azure.com) üzerinde:
   - **Authentication → Add a platform → Web** ekleyin (SPA değil — backend `client_secret` ile code exchange yaptığı için "confidential client" flow kullanıyoruz).
   - Redirect URI olarak `http://localhost:7001/admin/callback` tanımlayın.
   - Üretim için kendi domain'inizi de ekleyin.
2. **Certificates & secrets** altında bir **client secret** oluşturun (yaratıldığında değer sadece bir kere gösterilir).
3. Oluşturulan secret'ı **repoya commit ETMEDEN** aşağıdaki yöntemlerden biriyle verin:
   - `dotnet user-secrets` (geliştiriciye özel, repoya girmez — önerilen):
     ```bash
     cd backend/src/Nuevo.PMO.Api
     dotnet user-secrets init
     dotnet user-secrets set "O365:ClientSecret" "<secret-value>"
     ```
   - Environment variable:
     ```bash
     export O365__ClientSecret="<secret-value>"
     ```

> Not: `appsettings.json` içindeki `O365:ClientSecret` değeri boş bırakılır; production'da Azure Key Vault veya environment variable kullanın.

Secret eklenene kadar O365 login çalışmaz; bu süreçte admin paneline **Dev login** ile girebilirsiniz (sadece `Development` ortamında aktif).

## Dokümantasyon

- [Vizyon ve Kapsam](docs/01-vision-and-scope.md)
- [Mimari](docs/02-architecture.md)
- [Domain Model](docs/03-domain-model.md)
- [API Kontratı](docs/04-api-contracts.md)
- [Auth Flow'ları](docs/05-auth-flows.md)
- [Editor & Comments](docs/06-document-editor-and-comments.md)

## Repo

- GitHub: https://github.com/emrekirpiksiz/nuevo-pmo
