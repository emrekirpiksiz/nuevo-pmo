// Doküman editörü + yorum paneli + versiyonlar

const DocumentPage = ({ doc, project, onBack }) => {
  const D = window.PMO_DATA;
  const I = window.Icons;
  const [tab, setTab] = React.useState('doc');
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [activeComment, setActiveComment] = React.useState(0);

  const comment = D.comments[0];

  const pageGrid = {
    display: 'grid',
    gridTemplateColumns: drawerOpen ? '1fr 400px' : '1fr 0',
    minHeight: 'calc(100vh - 56px)',
    transition: 'grid-template-columns 0.2s ease',
  };

  return (
    <div>
      {/* Sub-topbar: doc title + actions */}
      <div style={{padding: '16px 40px 12px', borderBottom: '1px solid var(--border)', background: 'var(--canvas)', position: 'sticky', top: 56, zIndex: 10}}>
        <div className="row" style={{marginBottom: 6}}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginLeft: -8}}>
            <I.ChevronL size={12}/> {project?.name || 'Proje'}
          </button>
          <span className="subtle">/</span>
          <span className="subtle" style={{fontSize: 12}}>Dokümanlar</span>
        </div>
        <div className="row" style={{alignItems: 'flex-start', gap: 16}}>
          <div style={{flex: 1, minWidth: 0}}>
            <div className="row" style={{marginBottom: 4, gap: 8}}>
              <h1 style={{fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, margin: 0, letterSpacing: '-0.2px'}}>{doc.shortTitle}</h1>
              <span className="tag tag-accent">{doc.currentVersion}</span>
              <span className="pill pill-accent">İncelemede</span>
            </div>
            <div className="row subtle" style={{fontSize: 12, gap: 10}}>
              <span>{doc.author}</span>
              <span>·</span>
              <span>Son düzenleme: {doc.lastEdited}</span>
              <span>·</span>
              <span><I.Eye size={11} style={{verticalAlign: 'middle', marginRight: 4}}/>{doc.views} görüntüleme · {doc.readingMin}dk okuma</span>
              {doc.approvedByCustomer && <>
                <span>·</span>
                <span style={{color: 'var(--ok)'}}><I.CheckCircle size={11} style={{verticalAlign: 'middle', marginRight: 4}}/>Müşteri {doc.approvedByCustomer} onayladı</span>
              </>}
            </div>
          </div>
          <div className="row" style={{gap: 6}}>
            <div className="row" style={{gap: 4, padding: '0 10px', height: 30, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)'}}>
              <span className="subtle mono" style={{fontSize: 11}}>Yorum:</span>
              <span style={{fontWeight: 600}}>3 / 4 açık</span>
              <button className="btn btn-ghost btn-sm" style={{padding: '0 6px', height: 22}}><I.ChevronL size={10}/></button>
              <button className="btn btn-ghost btn-sm" style={{padding: '0 6px', height: 22}}><I.Chevron size={10}/></button>
            </div>
            <button className="btn btn-secondary btn-sm"><I.Download size={12}/> Word</button>
            <button className="btn btn-secondary btn-sm"><I.History size={12}/> Versiyon Geçmişi</button>
            <button className="btn btn-accent btn-sm"><I.Check size={12}/> Yeni Versiyon</button>
          </div>
        </div>

        {/* doc tabs */}
        <div className="tabs" style={{marginTop: 14, borderBottom: 'none'}}>
          {[
            { k: 'doc', l: 'Doküman', icon: <I.File size={13}/> },
            { k: 'comments', l: 'Yorumlar', icon: <I.Comment size={13}/>, n: 4 },
            { k: 'versions', l: 'Versiyonlar', icon: <I.History size={13}/>, n: 3 },
            { k: 'analytics', l: 'Analitik', icon: <I.TrendUp size={13}/> },
          ].map(t => (
            <div key={t.k} className={'tab' + (tab === t.k ? ' active' : '')} onClick={() => setTab(t.k)}>
              {t.icon}{t.l}{t.n != null && <span className="subtle mono" style={{fontSize: 11}}>{t.n}</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={pageGrid}>
        {/* Sol: Doküman canvas */}
        <div style={{overflow: 'auto', padding: '20px 0'}}>
          {tab === 'doc' && <DocBody onPinClick={() => setDrawerOpen(true)} active={!!comment}/>}
          {tab === 'versions' && <VersionsTab/>}
          {tab === 'analytics' && <AnalyticsTab/>}
          {tab === 'comments' && <CommentsTab/>}
        </div>

        {/* Sağ: Yorum drawer */}
        {drawerOpen && <CommentDrawer comment={comment} onClose={() => setDrawerOpen(false)}/>}
      </div>
    </div>
  );
};

const DocBody = ({ onPinClick, active }) => {
  const I = window.Icons;
  return (
    <div className="doc">
      <h1>Yazılım Gereksinimleri Analiz Dokümanı</h1>
      <div className="doc-meta">
        <div style={{display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12.5}}>
          <span><span className="subtle">Proje:</span> Espressolab B2B Portal</span>
          <span><span className="subtle">Versiyon:</span> <span className="mono">v1.1</span></span>
          <span><span className="subtle">Hazırlayan:</span> Zilan Timur (Nuevo)</span>
          <span><span className="subtle">Tarih:</span> 31 Mart 2026</span>
        </div>
      </div>

      <h2>1. Yönetici Özeti</h2>
      <p>Espressolab'ın 210+ şubeli franchise ağı için geliştirilecek B2B Portal, mevcut telefon-tabanlı sipariş sürecini uçtan uca dijitalleştirmeyi hedefler. Şubeler katalog üzerinden teklif talebi oluşturacak, merkez ofis bu talepleri fiyatlandırıp onaya sunacak ve onaylanan siparişler KDV hesaplamasıyla Logo Tiger ERP'ye otomatik aktarılacaktır.</p>

      <h2>2. Kapsam</h2>
      <h3>Dahil Olan</h3>
      <ul>
        <li>Şube kullanıcı yönetimi ve rol tanımları (Siparişçi, Onaylayıcı, Görüntüleyici)</li>
        <li>Katalog yönetimi, stok eşleştirme, dinamik fiyat listesi</li>
        <li>Teklif talebi → fiyatlandırma → şube onayı → Logo Tiger aktarımı akışı</li>
        <li>Çift yönlü onay-revize döngüsü (merkez ↔ şube)</li>
      </ul>

      <h3>Hariç Olan</h3>
      <ul>
        <li>B2C online sipariş (ayrı bir proje kapsamında değerlendirilecek)</li>
        <li>Muhasebe modülü — mevcut Logo Tiger ile sınırlı kalacak</li>
      </ul>

      <h2>3. Temel Süreçler</h2>

      <div className={'block has-comment'} onClick={onPinClick} style={{cursor: 'pointer'}}>
        <div className="pin" title="3 yorum">
          <I.Comment size={11}/>
          <span style={{position: 'relative'}}>3</span>
        </div>
        <h3 style={{marginTop: 24}}>3.1 Teklif Modülü</h3>
        <p>Şubelerin katalog üzerinden oluşturdukları teklif taleplerini ve yetkili kullanıcıların bu talepleri değerlendirip fiyatlandırdığı, şube onayına sunduğu modüldür. Teklif modülünde KDV yer almaz; KDV Logo Tiger'a aktarım sonrası işler. Teklif numaraları <span className="mono" style={{background: 'var(--surface-muted)', padding: '1px 4px', borderRadius: 3, fontSize: 12.5}}>QUO-YYYYMMDD-001</span> formatındadır ve her gün sıfırlanır. Sistem şube ile satışçı arasında çift yönlü bir onay/revize döngüsü sunar. Taslak özelliği sayesinde kaydedilmeden çıkılan teklifler otomatik korunur. Şube ekranı ticari sırları (maliyet, kâr oranı) görmez.</p>
      </div>

      <h3>3.2 Onay Akışı</h3>
      <p>Teklif taslağı oluşturulduğunda, şube yetkilisinin onayına düşer. Yetkili onayladığında merkez ofis fiyatlandırma ekibine yönlendirilir. Fiyatlandırma tamamlandığında şube yetkilisi nihai onayı verir ve sipariş Logo Tiger'a atılır.</p>

      <table>
        <thead>
          <tr><th>Durum</th><th>Aktör</th><th>SLA</th><th>Sonraki Aksiyon</th></tr>
        </thead>
        <tbody>
          <tr><td><span className="pill pill-neutral">Taslak</span></td><td>Şube Siparişçi</td><td className="mono">—</td><td>Yetkiliye yönlendir</td></tr>
          <tr><td><span className="pill pill-accent">Yetkili Onayında</span></td><td>Şube Yetkilisi</td><td className="mono">4 saat</td><td>Merkeze aktar</td></tr>
          <tr><td><span className="pill pill-info">Fiyatlandırma</span></td><td>Merkez Satış</td><td className="mono">1 iş günü</td><td>Şube onayına sun</td></tr>
          <tr><td><span className="pill pill-ok">Onaylandı</span></td><td>Sistem</td><td className="mono">—</td><td>Tiger aktar</td></tr>
        </tbody>
      </table>

      <h3>3.3 Logo Tiger Entegrasyonu</h3>
      <p>Onaylanan siparişler, Logo Tiger Web Servisi üzerinden SAP IDoc benzeri bir XML formatında aktarılır. KDV hesaplaması Tiger tarafında yapılır. Aktarım sonucunda dönen sipariş numarası B2B Portal'da gösterilir. Başarısız aktarımlarda otomatik yeniden deneme (exponential backoff, max 3 kez) uygulanır; hâlâ başarısızsa operasyon ekibine Slack bildirimi gider.</p>

      <blockquote>
        Tüm entegrasyon kaydı, KVKK kapsamında 3 yıl süreyle audit log tablosunda saklanır.
      </blockquote>

      <h2>4. Dış Sistemler ve Varsayımlar</h2>
      <ul>
        <li>Logo Tiger 3 Enterprise — v2.73 ve üzeri</li>
        <li>Azure AD SSO — mevcut Espressolab tenant'ı</li>
        <li>SMS sağlayıcı (İletimerkezi) — OTP bildirimleri için</li>
      </ul>
    </div>
  );
};

const CommentDrawer = ({ comment, onClose }) => {
  const I = window.Icons;
  if (!comment) return null;
  return (
    <div className="cdrawer">
      <div className="cdrawer-head">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><I.X size={14}/></button>
        <div className="row" style={{gap: 6}}>
          <button className="btn btn-ghost btn-icon btn-sm"><I.ChevronL size={12}/></button>
          <span className="mono" style={{fontSize: 12}}>3 / 4</span>
          <button className="btn btn-ghost btn-icon btn-sm"><I.Chevron size={12}/></button>
        </div>
        <span className="serif" style={{fontSize: 17, marginLeft: 8}}>Yorum</span>
        <div style={{marginLeft: 'auto'}} className="row" style={{gap: 6}}>
          <button className="btn btn-secondary btn-sm"><I.Check size={12}/> Çöz</button>
        </div>
      </div>
      <div className="cdrawer-body">
        <div className="cdrawer-quote">{comment.blockQuote}</div>

        <div className="ctread">
          <div className="cthead">
            <div className="av av-sm" style={{background: comment.color}}>{comment.avatar}</div>
            <span className="nm">{comment.author}</span>
            <span className="role">{comment.authorRole}</span>
            <span className="tm mono">{comment.createdAt}</span>
          </div>
          <div className="ctbody">{comment.body}</div>
        </div>

        {comment.replies.map((r, i) => (
          <div key={i} className="ctread" style={{marginLeft: 20, borderLeft: '2px solid var(--border)', paddingLeft: 14}}>
            <div className="cthead">
              <div className="av av-sm" style={{background: r.color}}>{r.avatar}</div>
              <span className="nm">{r.author}</span>
              <span className="role">{r.authorRole}</span>
              <span className="tm mono">{r.createdAt}</span>
            </div>
            <div className="ctbody">{r.body}</div>
          </div>
        ))}

        <div className="creply">
          <div className="eyebrow" style={{marginBottom: 8}}>Yanıt yaz</div>
          <textarea placeholder="Yorumu yanıtlayın…"/>
          <div className="creply-actions">
            <button className="btn btn-ghost btn-sm">@bahset</button>
            <button className="btn btn-primary btn-sm"><I.Send size={12}/> Yanıtla</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VersionsTab = () => {
  const I = window.Icons;
  const versions = [
    { v: 'v1.1', date: '2026-04-20 14:22', author: 'Zilan Timur', summary: '§3.1 teklif numarası formatı güncellendi; §3.3 retry politikası eklendi.', status: 'İncelemede', changes: '+142 / −38' },
    { v: 'v1.0', date: '2026-04-18 17:09', author: 'Zilan Timur', summary: 'İlk müşteri onayı sürümü. Espressolab (Burak Aydemir) onayladı.', status: 'Onaylandı', changes: '+1204 / −0', approvedBy: 'Burak Aydemir' },
    { v: 'v0.9', date: '2026-04-15 10:40', author: 'Ayşe Güney', summary: 'Teknik mimari kararları eklendi; §4 dış sistemler listesi.', status: 'Arşiv', changes: '+388 / −22' },
    { v: 'v0.3', date: '2026-04-08 16:15', author: 'Zilan Timur', summary: 'Kapsam taslağı — ilk iç inceleme.', status: 'Arşiv', changes: '+612 / −0' },
  ];
  return (
    <div style={{maxWidth: 760, margin: '0 auto', padding: '20px 40px'}}>
      <div className="row" style={{marginBottom: 20, justifyContent: 'space-between'}}>
        <div>
          <h2 className="serif" style={{fontSize: 26, margin: 0, fontWeight: 400}}>Versiyon Geçmişi</h2>
          <div className="subtle" style={{fontSize: 13, marginTop: 4}}>{versions.length} versiyon · ilk taslak 8 Nisan 2026</div>
        </div>
        <button className="btn btn-secondary btn-sm"><I.Download size={12}/> Tümünü İndir (.zip)</button>
      </div>
      <div className="card">
        {versions.map((v, i) => (
          <div key={v.v} style={{padding: '18px 20px', borderBottom: i < versions.length - 1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 16, alignItems: 'start'}}>
            <div>
              <span className={'tag ' + (i === 0 ? 'tag-accent' : '')} style={{fontSize: 12}}>{v.v}</span>
            </div>
            <div>
              <div className="row" style={{marginBottom: 6, gap: 8}}>
                <span style={{fontWeight: 500}}>{v.author}</span>
                <span className="subtle mono" style={{fontSize: 11.5}}>{v.date}</span>
                {v.status === 'İncelemede' && <span className="pill pill-accent">{v.status}</span>}
                {v.status === 'Onaylandı' && <span className="pill pill-ok"><I.Check size={10}/> {v.status}{v.approvedBy ? ` · ${v.approvedBy}` : ''}</span>}
                {v.status === 'Arşiv' && <span className="pill pill-neutral">{v.status}</span>}
              </div>
              <div style={{fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-muted)'}}>{v.summary}</div>
              <div className="subtle mono" style={{fontSize: 11, marginTop: 6}}>{v.changes}</div>
            </div>
            <div className="row" style={{gap: 4}}>
              <button className="btn btn-ghost btn-sm"><I.Eye size={12}/></button>
              <button className="btn btn-ghost btn-sm"><I.Download size={12}/></button>
              <button className="btn btn-ghost btn-sm">Karşılaştır</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsTab = () => {
  const D = window.PMO_DATA;
  const I = window.Icons;
  const readers = [
    { name: 'Burak Aydemir', role: 'Espressolab · Dijital Dönüşüm Müdürü', views: 12, time: 47, last: '2 saat', color: '#6b7a5a' },
    { name: 'Selin Karaca', role: 'Espressolab · IT Koordinatörü', views: 8, time: 28, last: 'Dün', color: '#935d4c' },
    { name: 'Emre Şahin', role: 'Espressolab · Satış Ops.', views: 14, time: 52, last: '4 saat', color: '#4a5b6e' },
    { name: 'Zilan Timur', role: 'Nuevo · PM Owner', views: 22, time: 68, last: '38 dk', color: '#8a6d3b' },
    { name: 'Ayşe Güney', role: 'Nuevo · Solution Architect', views: 9, time: 19, last: '3 saat', color: '#7a5a8a' },
  ];
  return (
    <div style={{maxWidth: 960, margin: '0 auto', padding: '20px 40px'}}>
      <h2 className="serif" style={{fontSize: 26, margin: '0 0 20px', fontWeight: 400}}>Okuma Analitiği</h2>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24}}>
        {[
          { l: 'Toplam Görüntüleme', v: 65, d: 'Son 7 gün: 23' },
          { l: 'Okuma Süresi', v: '214dk', d: 'Ortalama: 14dk/kişi' },
          { l: 'Benzersiz Okur', v: 5, d: '3 müşteri · 2 Nuevo' },
          { l: 'En Sık Okunan', v: '§3.1', d: 'Teklif Modülü' },
        ].map(k => (
          <div className="kpi" key={k.l}>
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
            <div className="subtle" style={{fontSize: 11.5}}>{k.d}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><h2 className="card-title">Kim okudu?</h2></div>
        <table className="tbl">
          <thead><tr><th style={{paddingLeft: 20}}>Kullanıcı</th><th>Görüntüleme</th><th>Toplam Süre</th><th>Son Okuma</th></tr></thead>
          <tbody>
            {readers.map((r, i) => (
              <tr key={i}>
                <td style={{paddingLeft: 20}}>
                  <div className="row" style={{gap: 10}}>
                    <div className="av av-sm" style={{background: r.color}}>{r.name.split(' ').map(s=>s[0]).join('')}</div>
                    <div>
                      <div style={{fontWeight: 500}}>{r.name}</div>
                      <div className="subtle" style={{fontSize: 11.5}}>{r.role}</div>
                    </div>
                  </div>
                </td>
                <td className="num mono">{r.views}</td>
                <td className="num mono">{r.time} dk</td>
                <td className="subtle mono" style={{fontSize: 12}}>{r.last} önce</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CommentsTab = () => {
  const I = window.Icons;
  const D = window.PMO_DATA;
  const list = [
    { id: 1, block: '§3.1 Teklif Modülü', author: 'Burak Aydemir', company: 'Espressolab', avatar: 'BA', color: '#6b7a5a', body: 'Oranların formatında son kısım 4 haneli olmalıdır.', tm: '17:09 bugün', status: 'open', replies: 1 },
    { id: 2, block: '§3.2 Onay Akışı', author: 'Selin Karaca', company: 'Espressolab', avatar: 'SK', color: '#935d4c', body: 'SLA süreleri işgünü mü yoksa takvim günü mü?', tm: 'Dün 14:22', status: 'open', replies: 2 },
    { id: 3, block: '§3.3 Logo Tiger', author: 'Emre Şahin', company: 'Espressolab', avatar: 'EŞ', color: '#4a5b6e', body: 'XML yerine JSON tercih etmek istiyoruz; Tiger v2.8 desteği var.', tm: 'Dün 11:40', status: 'open', replies: 3 },
    { id: 4, block: '§2 Kapsam', author: 'Burak Aydemir', company: 'Espressolab', avatar: 'BA', color: '#6b7a5a', body: 'Teşekkürler, kapsam net.', tm: '18 Nisan', status: 'resolved', replies: 1 },
  ];
  return (
    <div style={{maxWidth: 760, margin: '0 auto', padding: '20px 40px'}}>
      <div className="row" style={{marginBottom: 16, justifyContent: 'space-between'}}>
        <h2 className="serif" style={{fontSize: 26, margin: 0, fontWeight: 400}}>Yorumlar</h2>
        <div className="tweak-seg" style={{height: 30}}>
          <button className="on">Açık (3)</button>
          <button>Çözüldü (1)</button>
          <button>Tümü (4)</button>
        </div>
      </div>
      <div className="card">
        {list.map((c, i) => (
          <div key={c.id} style={{padding: '16px 20px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none', opacity: c.status === 'resolved' ? 0.6 : 1}}>
            <div className="row" style={{marginBottom: 8, gap: 8}}>
              <span className="tag tag-accent">{c.block}</span>
              {c.status === 'resolved' && <span className="pill pill-ok"><I.Check size={10}/> Çözüldü</span>}
              <span className="subtle mono" style={{fontSize: 11, marginLeft: 'auto'}}>{c.tm}</span>
            </div>
            <div className="row" style={{gap: 10, marginBottom: 6}}>
              <div className="av av-sm" style={{background: c.color}}>{c.avatar}</div>
              <div className="grow">
                <div style={{fontSize: 13}}><strong>{c.author}</strong> <span className="subtle">· {c.company}</span></div>
                <div style={{fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 2}}>{c.body}</div>
              </div>
            </div>
            <div className="subtle" style={{fontSize: 12, marginLeft: 32}}>
              <I.Comment size={11} style={{verticalAlign: 'middle', marginRight: 4}}/>{c.replies} yanıt
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.DocumentPage = DocumentPage;
