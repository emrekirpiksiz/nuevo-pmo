// Dashboard — üst düzey KPI ve aktivite akışı

const Dashboard = () => {
  const D = window.PMO_DATA;
  const I = window.Icons;

  const kpis = [
    { label: 'Aktif Proje', value: 8, delta: '+2 bu çeyrek', trend: 'up' },
    { label: 'Aktif Müşteri', value: 12, delta: '+1 bu ay', trend: 'up' },
    { label: 'Onay Bekleyen', value: 13, delta: '4 geciken', trend: 'down' },
    { label: 'Açık Yorum', value: 58, delta: '22 bugün çözüldü', trend: 'up' },
  ];

  const byPhase = [
    { k: 'Kapsam', v: 1, c: '#6b7a5a' },
    { k: 'Analiz', v: 3, c: '#8a6d3b' },
    { k: 'Geliştirme', v: 3, c: '#4a6a8a' },
    { k: 'UAT', v: 1, c: '#935d4c' },
    { k: 'Kapanış', v: 1, c: '#5a5852' },
  ];

  const topProjects = D.projects.filter(p => p.status === 'Aktif').slice(0, 5);
  const approvals = [
    { doc: 'Analiz Dokümanı v1.1', project: 'Espressolab B2B Portal', who: 'Burak Aydemir', customer: 'Espressolab', tm: 'Bugün 17:09', urgent: false },
    { doc: 'Kapsam Dokümanı v2.0', project: 'Akbank Kredi Başvuru', who: 'Mehmet Sarı', customer: 'Akbank', tm: 'Dün 14:22', urgent: true },
    { doc: 'Teknik Mimari v0.9', project: 'Yapı Kredi Onboarding', who: 'Ece Demir', customer: 'Yapı Kredi', tm: '2 gün', urgent: false },
    { doc: 'Test Planı v1.2', project: 'Pegasus Kargo', who: 'Kaan Aksoy', customer: 'Pegasus', tm: '3 gün', urgent: true },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Pazartesi · 20 Nisan 2026</span>
          <h1 className="page-title">Günaydın, Zilan.</h1>
          <p className="page-sub">Bugün <strong>4 onay</strong> ve <strong>2 riskli proje</strong> dikkatinizi bekliyor. Espressolab B2B analiz dokümanına gelen yorumları incelemeyi unutmayın.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><I.Download size={14}/> Haftalık Rapor</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Yeni Proje</button>
        </div>
      </div>

      {/* KPI'lar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {kpis.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className={'kpi-delta ' + (k.trend === 'up' ? 'up' : 'down')}>
              <I.TrendUp size={12} style={k.trend === 'down' ? { transform: 'scaleY(-1)' } : {}}/>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* İki kolon */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Sol: Aktif Projeler */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Aktif Projeler</h2>
              <div className="muted" style={{fontSize: 12, marginTop: 2}}>Sağlık durumu ve ilerleme</div>
            </div>
            <div style={{marginLeft: 'auto'}}>
              <button className="btn btn-ghost btn-sm">Tümü <I.ArrowRight size={12}/></button>
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Proje</th>
                <th>Faz</th>
                <th style={{width: 120}}>İlerleme</th>
                <th>Biten/Vade</th>
                <th style={{width: 80}}></th>
              </tr>
            </thead>
            <tbody>
              {topProjects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
                      <div style={{fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8}}>
                        {p.name}
                        {p.health === 'at-risk' && <span className="pill pill-warn"><span className="dot dot-warn"/> Risk</span>}
                        {p.health === 'blocked' && <span className="pill pill-danger"><span className="dot dot-danger"/> Blokaj</span>}
                      </div>
                      <div className="subtle mono">{p.code} · {p.customer}</div>
                    </div>
                  </td>
                  <td className="muted">{p.phase}</td>
                  <td>
                    <div className="row" style={{gap: 8}}>
                      <div className="bar" style={{width: 80}}><span style={{width: p.progress + '%', background: p.health === 'at-risk' ? 'var(--warn)' : p.health === 'blocked' ? 'var(--danger)' : 'var(--ink)'}}/></div>
                      <span className="mono subtle">%{p.progress}</span>
                    </div>
                  </td>
                  <td className="muted mono">{p.dueDate}</td>
                  <td style={{textAlign: 'right'}}>
                    <button className="btn btn-ghost btn-sm"><I.Chevron size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sağ: Onay bekleyenler */}
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Onay Bekleyen</h2>
            <span className="pill pill-accent" style={{marginLeft: 'auto'}}>{approvals.length}</span>
          </div>
          <div style={{padding: '4px 0'}}>
            {approvals.map((a, i) => (
              <div key={i} style={{padding: '14px 20px', borderBottom: i < approvals.length - 1 ? '1px solid var(--border)' : 'none'}}>
                <div className="row" style={{marginBottom: 6}}>
                  <span className="serif" style={{fontSize: 15, fontWeight: 500}}>{a.doc}</span>
                  {a.urgent && <span className="pill pill-danger" style={{marginLeft: 'auto'}}>Geciken</span>}
                </div>
                <div className="subtle" style={{fontSize: 12, marginBottom: 8}}>{a.project}</div>
                <div className="row" style={{gap: 8, justifyContent: 'space-between'}}>
                  <div className="row" style={{gap: 6}}>
                    <div className="av av-sm" style={{background: 'var(--sage)'}}>{a.who.split(' ').map(s=>s[0]).join('')}</div>
                    <span style={{fontSize: 12}}>{a.who}</span>
                    <span className="subtle" style={{fontSize: 12}}>· {a.customer}</span>
                  </div>
                  <span className="subtle mono" style={{fontSize: 11}}>{a.tm}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* İkinci satır */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, marginTop: 20 }}>
        {/* Sol: Faz dağılımı */}
        <div className="card">
          <div className="card-head"><h2 className="card-title">Portföy Dağılımı</h2></div>
          <div style={{padding: 20}}>
            <div style={{display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 20}}>
              {byPhase.map(b => (
                <div key={b.k} style={{ flex: b.v, background: b.c }}/>
              ))}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              {byPhase.map(b => (
                <div key={b.k} className="row" style={{justifyContent: 'space-between'}}>
                  <div className="row" style={{gap: 8}}>
                    <span style={{width: 8, height: 8, borderRadius: 2, background: b.c}}/>
                    <span style={{fontSize: 13}}>{b.k}</span>
                  </div>
                  <span className="mono subtle">{b.v} proje</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ: Aktivite */}
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Son Aktiviteler</h2>
            <span className="subtle" style={{marginLeft: 'auto', fontSize: 12}}>Gerçek zamanlı</span>
          </div>
          <div style={{padding: '6px 20px 14px'}}>
            {D.activity.map((a, i) => (
              <div key={i} className="row" style={{padding: '10px 0', borderBottom: i < D.activity.length - 1 ? '1px solid var(--border)' : 'none', gap: 12}}>
                <div className="av av-sm" style={{background: a.kind === 'comment' ? 'var(--accent)' : a.kind === 'approve' ? 'var(--sage)' : a.kind === 'publish' ? 'var(--info)' : 'var(--ink-muted)'}}>
                  {a.user.split(' ').map(s=>s[0]).join('')}
                </div>
                <div className="grow">
                  <div style={{fontSize: 13}}>
                    <strong style={{fontWeight: 500}}>{a.user}</strong>{' '}
                    <span className="muted">{a.action}</span>{' '}
                    <span>{a.target}</span>
                  </div>
                  <div className="subtle" style={{fontSize: 11.5, marginTop: 2}}>{a.project}</div>
                </div>
                <span className="subtle mono" style={{fontSize: 11}}>{a.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
