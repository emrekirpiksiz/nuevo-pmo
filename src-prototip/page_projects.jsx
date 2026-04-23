// Projeler listesi + Proje Detay

const ProjectsPage = ({ onOpenProject }) => {
  const D = window.PMO_DATA;
  const I = window.Icons;
  const [view, setView] = React.useState('table');
  const [status, setStatus] = React.useState('all');

  const list = D.projects.filter(p => status === 'all' ? true : p.status === status);
  const healthPill = (h) => {
    if (h === 'on-track') return <span className="pill pill-ok"><span className="dot dot-ok"/> Yolunda</span>;
    if (h === 'at-risk') return <span className="pill pill-warn"><span className="dot dot-warn"/> Risk</span>;
    if (h === 'blocked') return <span className="pill pill-danger"><span className="dot dot-danger"/> Blokaj</span>;
    if (h === 'done') return <span className="pill pill-neutral"><span className="dot dot-neutral"/> Tamam</span>;
    return null;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Portföy · {D.projects.length} proje</span>
          <h1 className="page-title">Projeler</h1>
          <p className="page-sub">Yürüttüğünüz tüm projelerin sağlık durumu, fazı ve yaklaşan teslim tarihleri. Detay için bir projeye tıklayın.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><I.Filter size={14}/> Filtre</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Yeni Proje</button>
        </div>
      </div>

      <div className="row" style={{marginBottom: 12, gap: 8}}>
        <div className="tweak-seg" style={{height: 32}}>
          {['all', 'Aktif', 'Tamamlandı'].map(s => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s === 'all' ? 'Tümü' : s}</button>
          ))}
        </div>
        <div style={{marginLeft: 'auto'}} className="tweak-seg" style={{height: 32, marginLeft: 'auto'}}>
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Liste</button>
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Pano</button>
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{paddingLeft: 20}}>Proje</th>
              <th>Müşteri</th>
              <th>Faz</th>
              <th>Sağlık</th>
              <th style={{width: 160}}>İlerleme</th>
              <th>Bütçe/Harcanan</th>
              <th>Vade</th>
              <th>Ekip</th>
              <th style={{width: 60}}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} style={{cursor: 'pointer'}} onClick={() => onOpenProject && onOpenProject(p)}>
                <td style={{paddingLeft: 20}}>
                  <div>
                    <div style={{fontWeight: 500, fontSize: 14}}>{p.name}</div>
                    <div className="subtle mono" style={{fontSize: 11.5}}>{p.code}</div>
                  </div>
                </td>
                <td className="muted">{p.customer}</td>
                <td className="muted">{p.phase}</td>
                <td>{healthPill(p.health)}</td>
                <td>
                  <div className="row" style={{gap: 8}}>
                    <div className="bar" style={{width: 110}}><span style={{width: p.progress + '%', background: p.health === 'at-risk' ? 'var(--warn)' : p.health === 'blocked' ? 'var(--danger)' : p.health === 'done' ? 'var(--sage)' : 'var(--ink)'}}/></div>
                    <span className="mono subtle" style={{fontSize: 12}}>%{p.progress}</span>
                  </div>
                </td>
                <td>
                  <div className="mono" style={{fontSize: 12.5}}>{p.budget}</div>
                  <div className="subtle mono" style={{fontSize: 11}}>%{p.spent} harcandı</div>
                </td>
                <td className="muted mono" style={{fontSize: 12}}>{p.dueDate}</td>
                <td>
                  <div className="row" style={{gap: 6}}>
                    <div className="av-stack">
                      <div className="av av-sm" style={{background: 'var(--accent)'}}>{p.owner.split(' ').map(s=>s[0]).join('')}</div>
                      <div className="av av-sm" style={{background: 'var(--sage)'}}>+{p.team - 1}</div>
                    </div>
                  </div>
                </td>
                <td style={{textAlign: 'right', paddingRight: 16}}>
                  <I.Chevron size={12} style={{color: 'var(--ink-subtle)'}}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Proje Detay ----------
const ProjectDetail = ({ project, onBack, onOpenDoc }) => {
  const D = window.PMO_DATA;
  const I = window.Icons;
  const [tab, setTab] = React.useState('documents');

  const docs = D.documentsByProject[project.id] || D.documentsByProject.p1;

  const healthPill = (h) => {
    if (h === 'on-track') return <span className="pill pill-ok"><span className="dot dot-ok"/> Yolunda</span>;
    if (h === 'at-risk') return <span className="pill pill-warn"><span className="dot dot-warn"/> Risk</span>;
    if (h === 'blocked') return <span className="pill pill-danger"><span className="dot dot-danger"/> Blokaj</span>;
    return <span className="pill pill-neutral">{h}</span>;
  };

  const statusPill = (s) => {
    if (s === 'Onaylandı') return <span className="pill pill-ok"><I.Check size={10}/> {s}</span>;
    if (s === 'İncelemede') return <span className="pill pill-accent">{s}</span>;
    if (s === 'Taslak') return <span className="pill pill-neutral">{s}</span>;
    return <span className="pill pill-neutral">{s}</span>;
  };

  return (
    <div className="page">
      {/* Üst: breadcrumb + başlık */}
      <div style={{marginBottom: 16}}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginLeft: -8, marginBottom: 8}}>
          <I.ChevronL size={12}/> Projeler
        </button>
      </div>

      <div className="page-header" style={{borderBottom: 'none', paddingBottom: 0, marginBottom: 20, alignItems: 'flex-start'}}>
        <div style={{flex: 1, minWidth: 0}}>
          <div className="row" style={{marginBottom: 6, gap: 8}}>
            <span className="eyebrow" style={{margin: 0}}>{project.customer}</span>
            <span className="subtle">·</span>
            <span className="mono subtle" style={{fontSize: 11}}>{project.code}</span>
            {healthPill(project.health)}
          </div>
          <h1 className="page-title" style={{fontSize: 36}}>{project.name}</h1>
          <p className="page-sub" style={{marginTop: 10}}>{project.description}</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary btn-sm"><I.Download size={12}/> Rapor</button>
          <button className="btn btn-secondary btn-sm"><I.Settings size={12}/></button>
          <button className="btn btn-primary btn-sm"><I.Plus size={12}/> Doküman</button>
        </div>
      </div>

      {/* Metrik şeridi — 6 kolon */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', marginBottom: 24}}>
        {[
          { label: 'Faz', value: project.phase, sub: 'Sonraki: Geliştirme' },
          { label: 'İlerleme', value: '%' + project.progress, sub: 'Hedef: %50 · 30 Nis' },
          { label: 'Başlangıç', value: project.startDate, sub: project.team + ' kişilik ekip' },
          { label: 'Bitiş', value: project.dueDate, sub: '163 gün kaldı' },
          { label: 'Bütçe', value: project.budget, sub: '%' + project.spent + ' harcandı' },
          { label: 'Açık Konu', value: project.openComments, sub: project.pendingApprovals + ' onay bekliyor' },
        ].map((m, i) => (
          <div key={i} style={{padding: '16px 20px', borderLeft: i > 0 ? '1px solid var(--border)' : 'none'}}>
            <div className="kpi-label" style={{marginBottom: 6}}>{m.label}</div>
            <div style={{fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums'}}>{m.value}</div>
            <div className="subtle" style={{fontSize: 11.5}}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{marginBottom: 20}}>
        {[
          { k: 'documents', l: 'Dokümanlar', n: docs.length },
          { k: 'team', l: 'Ekip', n: project.team },
          { k: 'plan', l: 'Proje Planı', soon: true },
          { k: 'reports', l: 'Haftalık Rapor', soon: true },
          { k: 'tickets', l: 'Ticket', soon: true },
          { k: 'analytics', l: 'Analitik' },
        ].map(t => (
          <div key={t.k}
            className={'tab' + (tab === t.k ? ' active' : '') + (t.soon ? ' disabled' : '')}
            onClick={() => !t.soon && setTab(t.k)}>
            {t.l}
            {t.n != null && <span className="subtle mono" style={{fontSize: 11}}>{t.n}</span>}
            {t.soon && <span className="soon">Yakında</span>}
          </div>
        ))}
      </div>

      {/* Dokümanlar tablosu */}
      {tab === 'documents' && (
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Dokümanlar</h2>
            <span className="subtle" style={{fontSize: 12, marginLeft: 8}}>{docs.length} doküman · {docs.reduce((a,d) => a + d.openComments, 0)} açık yorum</span>
            <div style={{marginLeft: 'auto'}} className="row">
              <button className="btn btn-ghost btn-sm"><I.Filter size={12}/> Filtre</button>
              <button className="btn btn-primary btn-sm"><I.Plus size={12}/> Yeni Doküman</button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{paddingLeft: 20}}>Başlık</th>
                <th>Tür</th>
                <th>Güncel</th>
                <th>Müşteri Onayı</th>
                <th>Yorum</th>
                <th>Yazar</th>
                <th>Son Düzenleme</th>
                <th style={{width: 60}}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} style={{cursor: 'pointer'}} onClick={() => onOpenDoc && onOpenDoc(d)}>
                  <td style={{paddingLeft: 20}}>
                    <div className="row" style={{gap: 10}}>
                      <I.File size={15} style={{color: 'var(--ink-subtle)'}}/>
                      <div>
                        <div style={{fontWeight: 500}}>{d.shortTitle}</div>
                        <div className="subtle" style={{fontSize: 11.5}}>{d.title}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="pill pill-neutral">{d.type}</span></td>
                  <td><span className="tag tag-accent">{d.currentVersion}</span></td>
                  <td>
                    {d.approvedByCustomer ? (
                      <div>
                        <span className="pill pill-ok"><I.Check size={10}/> {d.approvedByCustomer}</span>
                        <div className="subtle mono" style={{fontSize: 11, marginTop: 2}}>{d.approvedAt}</div>
                      </div>
                    ) : (
                      <span className="pill pill-neutral">Bekliyor</span>
                    )}
                  </td>
                  <td>
                    {d.openComments > 0 ? (
                      <span className="row" style={{gap: 6}}>
                        <span style={{color: 'var(--accent)', fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>{d.openComments}</span>
                        <span className="subtle" style={{fontSize: 12}}>açık</span>
                        <span className="subtle mono" style={{fontSize: 11}}>· {d.resolvedComments} çözüldü</span>
                      </span>
                    ) : <span className="subtle">—</span>}
                  </td>
                  <td><span className="muted" style={{fontSize: 12.5}}>{d.author}</span></td>
                  <td className="subtle mono" style={{fontSize: 11.5}}>{d.lastEdited}</td>
                  <td style={{textAlign: 'right', paddingRight: 16}}>
                    <I.Chevron size={12} style={{color: 'var(--ink-subtle)'}}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'team' && (
        <div className="card">
          <div className="card-head"><h2 className="card-title">Proje Ekibi</h2>
            <div style={{marginLeft: 'auto'}}><button className="btn btn-primary btn-sm"><I.Plus size={12}/> Üye Davet Et</button></div>
          </div>
          <div style={{padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
            <div>
              <div className="eyebrow">Nuevo Ekibi · {D.members.nuevo.length} kişi</div>
              {D.members.nuevo.map(m => (
                <div key={m.id} className="row" style={{padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12}}>
                  <div className="av av-lg" style={{background: m.color}}>{m.avatar}</div>
                  <div className="grow">
                    <div style={{fontWeight: 500, fontSize: 14}}>{m.name}</div>
                    <div className="subtle" style={{fontSize: 12}}>{m.role}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm"><I.More size={14}/></button>
                </div>
              ))}
            </div>
            <div>
              <div className="eyebrow">Müşteri Tarafı · {D.members.customer.length} kişi</div>
              {D.members.customer.map(m => (
                <div key={m.id} className="row" style={{padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12}}>
                  <div className="av av-lg" style={{background: m.color}}>{m.avatar}</div>
                  <div className="grow">
                    <div style={{fontWeight: 500, fontSize: 14}}>{m.name}</div>
                    <div className="subtle" style={{fontSize: 12}}>{m.title} · {m.role}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm"><I.More size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="card">
          <div className="card-head"><h2 className="card-title">Doküman Görüntüleme Analitiği</h2></div>
          <div style={{padding: 24}}>
            <div className="subtle" style={{marginBottom: 12, fontSize: 12}}>Son 7 gün · müşteri başına toplam okuma süresi</div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, paddingBottom: 4, borderBottom: '1px solid var(--border)'}}>
              {[42, 68, 35, 92, 78, 54, 88].map((h, i) => (
                <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                  <div style={{width: '100%', height: h + '%', background: i === 3 ? 'var(--accent)' : 'var(--surface-sunken)', borderRadius: '3px 3px 0 0'}}/>
                </div>
              ))}
            </div>
            <div className="row" style={{marginTop: 8, gap: 10}}>
              {['14 Nis', '15 Nis', '16 Nis', '17 Nis', '18 Nis', '19 Nis', '20 Nis'].map(d => (
                <div key={d} style={{flex: 1, textAlign: 'center', fontSize: 11}} className="subtle mono">{d}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.ProjectsPage = ProjectsPage;
window.ProjectDetail = ProjectDetail;
