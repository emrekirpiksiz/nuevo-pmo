// Gerçekçi Türkçe PMO datası — Nuevo'nun portföyü
// Müşteriler, projeler, dokümanlar, yorumlar, versiyonlar, üyeler

window.PMO_DATA = (() => {
  const customers = [
    { id: 'c1', name: 'Espressolab', industry: 'F&B / Perakende', logo: 'EL', contact: 'pmo@espressolab.com', city: 'İstanbul', contractSince: '2024-11', tier: 'Enterprise', projects: 3, users: 14, openComments: 12 },
    { id: 'c2', name: 'Logo Yazılım', industry: 'Teknoloji / ERP', logo: 'LY', contact: 'digital@logo.com.tr', city: 'Kocaeli', contractSince: '2025-02', tier: 'Enterprise', projects: 2, users: 9, openComments: 4 },
    { id: 'c3', name: 'Migros Ticaret', industry: 'Perakende', logo: 'MG', contact: 'bilisim@migros.com.tr', city: 'İstanbul', contractSince: '2025-06', tier: 'Enterprise', projects: 2, users: 11, openComments: 7 },
    { id: 'c4', name: 'Akbank', industry: 'Finans / Bankacılık', logo: 'AK', contact: 'bt-pmo@akbank.com', city: 'İstanbul', contractSince: '2024-03', tier: 'Strategic', projects: 4, users: 23, openComments: 18 },
    { id: 'c5', name: 'Turkcell', industry: 'Telekomünikasyon', logo: 'TC', contact: 'dijital@turkcell.com.tr', city: 'İstanbul', contractSince: '2025-01', tier: 'Enterprise', projects: 2, users: 8, openComments: 3 },
    { id: 'c6', name: 'Arçelik', industry: 'Üretim / Beyaz Eşya', logo: 'AR', contact: 'it-pmo@arcelik.com', city: 'İstanbul', contractSince: '2025-09', tier: 'Strategic', projects: 1, users: 6, openComments: 1 },
    { id: 'c7', name: 'Vestel', industry: 'Elektronik', logo: 'VS', contact: 'bt@vestel.com.tr', city: 'Manisa', contractSince: '2026-01', tier: 'Mid-market', projects: 1, users: 4, openComments: 0 },
    { id: 'c8', name: 'Sütaş', industry: 'Gıda / Süt', logo: 'ST', contact: 'dijital@sutas.com.tr', city: 'Bursa', contractSince: '2025-04', tier: 'Enterprise', projects: 2, users: 7, openComments: 5 },
    { id: 'c9', name: 'Pegasus', industry: 'Havacılık', logo: 'PG', contact: 'digital@flypgs.com', city: 'İstanbul', contractSince: '2024-08', tier: 'Enterprise', projects: 3, users: 12, openComments: 9 },
    { id: 'c10', name: 'Yapı Kredi', industry: 'Finans / Bankacılık', logo: 'YK', contact: 'pmo.bt@ykb.com', city: 'İstanbul', contractSince: '2024-12', tier: 'Strategic', projects: 3, users: 18, openComments: 14 },
    { id: 'c11', name: 'Eti Gıda', industry: 'Gıda', logo: 'ET', contact: 'bilgi@etietieti.com.tr', city: 'Eskişehir', contractSince: '2025-11', tier: 'Mid-market', projects: 1, users: 3, openComments: 2 },
    { id: 'c12', name: 'Anadolu Sigorta', industry: 'Sigorta', logo: 'AS', contact: 'bt@anadolusigorta.com.tr', city: 'İstanbul', contractSince: '2025-07', tier: 'Enterprise', projects: 2, users: 9, openComments: 6 },
  ];

  const members = {
    nuevo: [
      { id: 'n1', name: 'Zilan Timur', role: 'PM Owner', avatar: 'ZT', color: '#8a6d3b' },
      { id: 'n2', name: 'Mert Kocabaş', role: 'PM Member', avatar: 'MK', color: '#6b7a5a' },
      { id: 'n3', name: 'Ayşe Güney', role: 'Solution Architect', avatar: 'AG', color: '#935d4c' },
      { id: 'n4', name: 'Berk Özdemir', role: 'Senior Developer', avatar: 'BÖ', color: '#4a5b6e' },
      { id: 'n5', name: 'Deniz Arslan', role: 'Business Analyst', avatar: 'DA', color: '#7a5a8a' },
      { id: 'n6', name: 'Ecem Yılmaz', role: 'QA Lead', avatar: 'EY', color: '#8a6d3b' },
    ],
    customer: [
      { id: 'm1', name: 'Burak Aydemir', role: 'Contributor', avatar: 'BA', color: '#6b7a5a', customerId: 'c1', title: 'Dijital Dönüşüm Müdürü' },
      { id: 'm2', name: 'Selin Karaca', role: 'Viewer', avatar: 'SK', color: '#935d4c', customerId: 'c1', title: 'IT Koordinatörü' },
      { id: 'm3', name: 'Emre Şahin', role: 'Contributor', avatar: 'EŞ', color: '#4a5b6e', customerId: 'c1', title: 'Satış Operasyon Yöneticisi' },
    ],
  };

  const projects = [
    {
      id: 'p1', code: 'EL-B2B-2026',
      name: 'Espressolab B2B Portal',
      customer: 'Espressolab', customerId: 'c1',
      status: 'Aktif', health: 'on-track',
      phase: 'Analiz', progress: 42,
      startDate: '2026-02-15', dueDate: '2026-09-30',
      budget: '₺ 2.4M', spent: 38,
      description: 'Şubelerin katalog üzerinden oluşturduğu teklif talepleri, yetkili onayı ve KDV Logo Tiger aktarımını kapsayan B2B sipariş portali.',
      owner: 'Zilan Timur', team: 7,
      openComments: 12, openDocs: 3, pendingApprovals: 2,
      tabs: ['Dokümanlar', 'Ekip', 'Proje Planı', 'Haftalık Rapor', 'Ticket', 'Analitik'],
    },
    {
      id: 'p2', code: 'AK-CRD-2025',
      name: 'Akbank Kredi Başvuru Yenileme',
      customer: 'Akbank', customerId: 'c4',
      status: 'Aktif', health: 'at-risk',
      phase: 'Geliştirme', progress: 67,
      startDate: '2025-09-01', dueDate: '2026-06-15',
      budget: '₺ 4.8M', spent: 71,
      description: 'Bireysel kredi başvuru akışının yeniden tasarlanması; OCR, KVKK izin yönetimi ve gerçek zamanlı skorlama entegrasyonu.',
      owner: 'Mert Kocabaş', team: 12,
      openComments: 18, openDocs: 2, pendingApprovals: 4,
    },
    {
      id: 'p3', code: 'MG-POS-2026',
      name: 'Migros Mobil POS Yenileme',
      customer: 'Migros Ticaret', customerId: 'c3',
      status: 'Aktif', health: 'on-track',
      phase: 'Analiz', progress: 28,
      startDate: '2026-01-12', dueDate: '2026-10-30',
      budget: '₺ 3.1M', spent: 22,
      description: 'Mağaza kasalarındaki sabit POS cihazlarının tablet tabanlı mobil terminalle değiştirilmesi ve SAP ERP entegrasyonu.',
      owner: 'Ayşe Güney', team: 9,
      openComments: 7, openDocs: 1, pendingApprovals: 1,
    },
    {
      id: 'p4', code: 'YK-OB-2025',
      name: 'Yapı Kredi Dijital Onboarding',
      customer: 'Yapı Kredi', customerId: 'c10',
      status: 'Aktif', health: 'on-track',
      phase: 'UAT', progress: 88,
      startDate: '2025-05-05', dueDate: '2026-05-10',
      budget: '₺ 5.6M', spent: 82,
      description: 'Şubeye gitmeden video-KYC ile hesap açılışı, kimlik OCR, uzaktan imza ve risk profilleme.',
      owner: 'Zilan Timur', team: 14,
      openComments: 14, openDocs: 1, pendingApprovals: 2,
    },
    {
      id: 'p5', code: 'TC-DEAL-2026',
      name: 'Turkcell Bayi CRM',
      customer: 'Turkcell', customerId: 'c5',
      status: 'Aktif', health: 'on-track',
      phase: 'Kapsam', progress: 12,
      startDate: '2026-03-01', dueDate: '2026-12-20',
      budget: '₺ 2.9M', spent: 8,
      description: 'Yetkili bayilerin müşteri yönetimi, saha ziyareti ve komisyon hesaplaması için mobil-öncelikli CRM.',
      owner: 'Berk Özdemir', team: 6,
      openComments: 3, openDocs: 1, pendingApprovals: 0,
    },
    {
      id: 'p6', code: 'PG-CARGO-2025',
      name: 'Pegasus Kargo Yönetim Sistemi',
      customer: 'Pegasus', customerId: 'c9',
      status: 'Aktif', health: 'blocked',
      phase: 'Geliştirme', progress: 54,
      startDate: '2025-07-14', dueDate: '2026-04-30',
      budget: '₺ 3.8M', spent: 68,
      description: 'Kargo kabul-tasnif-teslim akışının uçtan uca dijitalleşmesi; terminal cihaz yönetimi, barkod ve WMS entegrasyonu.',
      owner: 'Ayşe Güney', team: 10,
      openComments: 9, openDocs: 2, pendingApprovals: 3,
    },
    {
      id: 'p7', code: 'AR-WAR-2026',
      name: 'Arçelik Garanti & Servis Portalı',
      customer: 'Arçelik', customerId: 'c6',
      status: 'Aktif', health: 'on-track',
      phase: 'Analiz', progress: 18,
      startDate: '2026-02-01', dueDate: '2026-11-15',
      budget: '₺ 2.2M', spent: 14,
      description: 'Yetkili servis ağı için iş emri, parça talebi, garanti süreci ve müşteri memnuniyet modülü.',
      owner: 'Deniz Arslan', team: 5,
      openComments: 1, openDocs: 1, pendingApprovals: 0,
    },
    {
      id: 'p8', code: 'ST-SUP-2025',
      name: 'Sütaş Tedarikçi Portalı',
      customer: 'Sütaş', customerId: 'c8',
      status: 'Tamamlandı', health: 'done',
      phase: 'Kapanış', progress: 100,
      startDate: '2025-06-01', dueDate: '2026-03-15',
      budget: '₺ 1.6M', spent: 96,
      description: 'Süt üreticisi çiftliklerle dijital sözleşme, günlük teslimat takibi ve hakediş otomasyonu.',
      owner: 'Mert Kocabaş', team: 6,
      openComments: 0, openDocs: 0, pendingApprovals: 0,
    },
    {
      id: 'p9', code: 'LY-MIG-2025',
      name: 'Logo Tiger → Netsis Migrasyon',
      customer: 'Logo Yazılım', customerId: 'c2',
      status: 'Aktif', health: 'on-track',
      phase: 'Geliştirme', progress: 61,
      startDate: '2025-10-01', dueDate: '2026-07-01',
      budget: '₺ 3.4M', spent: 58,
      description: 'Tiger ERP üzerinden Netsis Enterprise\'a veri ve süreç göçü; özel raporlama ve BI katmanı.',
      owner: 'Zilan Timur', team: 8,
      openComments: 4, openDocs: 2, pendingApprovals: 1,
    },
  ];

  const documentsByProject = {
    p1: [
      { id: 'd1', title: 'Yazılım Gereksinimleri Analiz Dokümanı', shortTitle: 'Analiz Dokümanı', type: 'Analiz', currentVersion: 'v1.1', approvedByCustomer: 'v1.0', approvedAt: '2026-04-18 17:09', author: 'Zilan Timur', lastEdited: '2026-04-20 14:22', openComments: 4, resolvedComments: 11, status: 'İncelemede', views: 38, readingMin: 214 },
      { id: 'd2', title: 'Test Stratejisi ve Senaryoları', shortTitle: 'Test Planı', type: 'Test', currentVersion: 'v1.2', approvedByCustomer: 'v1.0', approvedAt: '2026-04-12 13:55', author: 'Ecem Yılmaz', lastEdited: '2026-04-20 09:41', openComments: 2, resolvedComments: 6, status: 'Taslak', views: 12, readingMin: 48 },
      { id: 'd3', title: 'Proje Kapsam Dokümanı', shortTitle: 'Kapsam', type: 'Kapsam', currentVersion: 'v0.4', approvedByCustomer: null, approvedAt: null, author: 'Zilan Timur', lastEdited: '2026-04-19 16:10', openComments: 0, resolvedComments: 0, status: 'Paylaşılmadı', views: 0, readingMin: 0 },
      { id: 'd4', title: 'Teknik Mimari ve Entegrasyon Kararları', shortTitle: 'Teknik Mimari', type: 'Mimari', currentVersion: 'v0.9', approvedByCustomer: null, approvedAt: null, author: 'Ayşe Güney', lastEdited: '2026-04-17 11:20', openComments: 1, resolvedComments: 3, status: 'İncelemede', views: 7, readingMin: 52 },
      { id: 'd5', title: 'KDV ve Logo Tiger Aktarım Spesifikasyonu', shortTitle: 'Logo Entegrasyon', type: 'Entegrasyon', currentVersion: 'v1.0', approvedByCustomer: 'v1.0', approvedAt: '2026-04-15 10:30', author: 'Berk Özdemir', lastEdited: '2026-04-15 10:29', openComments: 0, resolvedComments: 5, status: 'Onaylandı', views: 22, readingMin: 118 },
    ],
  };

  const comments = [
    {
      id: 'cm1', blockId: 'b-pricing-01',
      author: 'Burak Aydemir', authorRole: 'EK Müşteri', authorCompany: 'Espressolab',
      avatar: 'BA', color: '#6b7a5a',
      createdAt: '2026-04-20 17:09',
      body: 'Oranların formatında son kısım 4 haneli olmalıdır. Mevcut QUO-YYYYMMDD-001 gösterimi ondalık hassasiyeti için yetersiz; raporlamada yuvarlama hatası çıkarıyor.',
      blockQuote: 'Şubelerin katalog üzerinden oluşturdukları teklif taleplerini ve yetkili kullanıcıların bu talepleri değerlendirip fiyatlandırdığı, şube onayına sunduğu modüldür. Teklif modülünde KDV yer almaz; KDV Logo Tiger\'a aktarım sonrası işler.',
      replies: [
        { author: 'Zilan Timur', authorRole: 'Nuevo PM', avatar: 'ZT', color: '#8a6d3b', createdAt: '2026-04-20 18:02', body: 'Teşekkürler Burak. Finans ekibinizle birlikte aynı gün 10:30 toplantısında netleştirelim — 4 haneli ondalık standardı v1.2\'de uygulanacak.' },
      ],
      status: 'open',
      count: { current: 3, total: 4 },
    },
  ];

  const activity = [
    { t: '14 dk', user: 'Burak Aydemir', action: 'yorum ekledi', target: 'Analiz Dokümanı · §4.2', project: 'Espressolab B2B Portal', kind: 'comment' },
    { t: '32 dk', user: 'Zilan Timur', action: 'v1.1 yayınladı', target: 'Analiz Dokümanı', project: 'Espressolab B2B Portal', kind: 'publish' },
    { t: '1 sa', user: 'Selin Karaca', action: 'v1.0\'ı onayladı', target: 'Kapsam Dokümanı', project: 'Akbank Kredi Başvuru Yenileme', kind: 'approve' },
    { t: '2 sa', user: 'Mert Kocabaş', action: 'yorumu çözdü', target: 'Test Planı · §2.3', project: 'Yapı Kredi Dijital Onboarding', kind: 'resolve' },
    { t: '3 sa', user: 'Emre Şahin', action: '3 yorum ekledi', target: 'Teknik Mimari', project: 'Migros Mobil POS', kind: 'comment' },
    { t: '5 sa', user: 'Ayşe Güney', action: 'davet etti', target: 'dijital@turkcell.com.tr', project: 'Turkcell Bayi CRM', kind: 'invite' },
    { t: 'dün', user: 'Zilan Timur', action: 'proje oluşturdu', target: 'Arçelik Garanti Portalı', project: 'Arçelik Garanti & Servis', kind: 'create' },
    { t: 'dün', user: 'Ecem Yılmaz', action: 'v1.2 taslağını kaydetti', target: 'Test Senaryoları', project: 'Espressolab B2B Portal', kind: 'draft' },
  ];

  const kpis = {
    activeProjects: 8,
    activeCustomers: 12,
    pendingApprovals: 13,
    openComments: 58,
    docsThisWeek: 17,
    slaRisk: 2,
  };

  return { customers, projects, documentsByProject, members, comments, activity, kpis };
})();
