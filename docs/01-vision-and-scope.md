# 01 — Vizyon ve Kapsam

## Amaç

Nuevo, yazılım evi olarak dış müşterilerine yürüttüğü projelerin dokümanlarını, toplantılarını ve kapsam bilgilerini şeffaf ve iz bırakır bir şekilde paylaşabileceği, müşterilerin bu dokümanlar üzerinde yorum yapıp versiyon onaylayabileceği bir PMO (Project Management Office) platformuna ihtiyaç duymaktadır.

## Hedef Kullanıcılar

- **Nuevo Admin** — İçeride PMO'yu yürüten Nuevo çalışanları. O365 SSO ile giriş yapar.
  - **PM Owner** — Projeden sorumlu baş yönetici.
  - **PM Member** — Projeye atanmış ekip üyesi.
- **Müşteri Kullanıcı** — Nuevo'nun hizmet verdiği dış şirketlerin çalışanları. Davet e-postası üzerinden onboard edilir.
  - **Customer Viewer** — Dokümanı okuyabilir.
  - **Customer Contributor** — Yorum yapabilir, versiyon onaylayabilir.

## MVP Kapsamı

### 1. Hesap ve Yetkilendirme
- Nuevo admin → Microsoft 365 SSO (Azure AD).
- Müşteri → Admin tarafından davet (invitation token) → parola belirle → Email+Password ile login.
- Role ve resource-based authorization (proje üyeliği üzerinden).

### 2. Müşteri ve Proje Yönetimi
- Müşteri şirketi CRUD + müşteri alt-kullanıcısı davet.
- Proje CRUD + proje ekibi (Nuevo + Müşteri) atama.
- Proje kartı / detay sayfası (Documents sekmesi MVP'de aktif).

### 3. Doküman Yönetimi (MVP Odağı)
- **Editor:** Block-based (Tiptap / ProseMirror). Her blok stabil `blockId` taşır.
- **Versiyonlama:** Her `Save` yeni bir `DocumentVersion` oluşturur (draft).
- **Publish:** Nuevo admin publish eder → müşteri sürümü görünür olur.
- **Word export:** Yayınlanmış veya draft versiyon `.docx` olarak indirilebilir.
- **Comment:** Müşteri bir bloğu seçip yorum açar (`Open`). Nuevo kullanıcısı `Resolved` olarak kapatabilir. Threaded yanıtlar desteklenir.
- **Version approval:** Müşteri belirli bir versiyonu onaylar (Ör. "Analysis V2.1, 2026-04-20 14:32, Jane Doe").
- **Analytics:** Her müşteri/doküman/version için görüntüleme süresi takip edilir.

### 4. Cross-cutting
- Structured logging (Serilog).
- Global error handling (ProblemDetails).
- Audit log (write operasyonları tablo + middleware).

## Coming Soon (Placeholder + Feature Flag)

- **Project Plan** — Timeline/gantt, haftalık, epic bazlı.
- **Weekly Reports** — Haftalık durum raporu.
- **Tickets** — İş parçacıkları/görevler.

Bu sekmeler UI'da görünür ama "Yakında" rozetiyle disabled.

## Başarı Kriterleri

- Admin bir müşteri, proje ve doküman oluşturup publish edebiliyor.
- Müşteri davet e-postasından parola belirleyip login olabiliyor.
- Müşteri doküman üzerinde blok seçip yorum açabiliyor, Nuevo yanıt/resolve yapabiliyor.
- Müşteri versiyon onayı sistemde tarih/saat/kim bilgisiyle görünüyor.
- Admin doküman analitiğinde "Kim, hangi versiyonu, ne kadar süre inceledi" raporunu görebiliyor.
- Tüm yazma operasyonları audit log tablosunda kayıt bırakıyor.

## Varsayımlar ve Kararlar

- Müşteriler aynı PostgreSQL veritabanını paylaşır; izolasyon global EF Core query filter ile yapılır.
- Word export MVP'de senkron (küçük dokümanlar), gerekirse Hangfire'a taşınır.
- Müşteri auth'ı şu an email+password; ileride OTP veya Azure AD B2B'ye açık.
