// Müşteriler listesi

const CustomersPage = ({ onOpenCustomer }) => {
  const D = window.PMO_DATA;
  const I = window.Icons;
  const [q, setQ] = React.useState('');
  const [tier, setTier] = React.useState('all');

  const list = D.customers.filter(c => {
    if (tier !== 'all' && c.tier !== tier) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Portföy · {D.customers.length} müşteri</span>
          <h1 className="page-title">Müşteriler</h1>
          <p className="page-sub">Nuevo'nun aktif ve pasif tüm müşteri şirketleri. Her müşteri için projeler, kullanıcılar ve açık yorum sayısını takip edin.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><I.Download size={14}/> Dışa Aktar</button>
          <button className="btn btn-primary"><I.Plus size={14}/> Yeni Müşteri</button>
        </div>
      </div>

      {/* Filtre satırı */}
      <div className="row" style={{marginBottom: 12, gap: 8}}>
        <div className="tb-search" style={{width: 280, margin: 0}}>
          <I.Search size={14}/>
          <input style={{border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13}}
            placeholder="Müşteri ara…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <div className="tweak-seg" style={{height: 32}}>
          {['all', 'Strategic', 'Enterprise', 'Mid-market'].map(t => (
            <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)}>{t === 'all' ? 'Tümü' : t}</button>
          ))}
        </div>
        <div style={{marginLeft: 'auto'}} className="row">
          <button className="btn btn-ghost btn-sm"><I.Filter size={12}/> Filtre</button>
          <button className="btn btn-ghost btn-sm"><I.Sort size={12}/> Sırala</button>
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{paddingLeft: 20}}>Müşteri</th>
              <th>Sektör</th>
              <th>Şehir</th>
              <th>Seviye</th>
              <th>Proje</th>
              <th>Kullanıcı</th>
              <th>Açık Yorum</th>
              <th>Sözleşme</th>
              <th style={{width: 80}}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} style={{cursor: 'pointer'}} onClick={() => onOpenCustomer && onOpenCustomer(c)}>
                <td style={{paddingLeft: 20}}>
                  <div className="row" style={{gap: 12}}>
                    <div className="av av-lg" style={{background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 400}}>{c.logo}</div>
                    <div>
                      <div style={{fontWeight: 500, fontSize: 14}}>{c.name}</div>
                      <div className="subtle" style={{fontSize: 12}}>{c.contact}</div>
                    </div>
                  </div>
                </td>
                <td className="muted">{c.industry}</td>
                <td className="muted">{c.city}</td>
                <td>
                  <span className={'pill ' + (c.tier === 'Strategic' ? 'pill-accent' : c.tier === 'Enterprise' ? 'pill-info' : 'pill-neutral')}>
                    {c.tier}
                  </span>
                </td>
                <td className="num mono">{c.projects}</td>
                <td className="num mono">{c.users}</td>
                <td>
                  {c.openComments > 0 ? (
                    <span className="mono" style={{color: c.openComments > 10 ? 'var(--danger)' : c.openComments > 5 ? 'var(--warn)' : 'var(--ink-muted)'}}>{c.openComments}</span>
                  ) : <span className="subtle">—</span>}
                </td>
                <td className="muted mono" style={{fontSize: 12}}>{c.contractSince}</td>
                <td style={{textAlign: 'right', paddingRight: 16}}>
                  <button className="btn btn-ghost btn-sm" onClick={e => {e.stopPropagation();}}><I.Send size={12}/></button>
                  <button className="btn btn-ghost btn-sm btn-icon"><I.More size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-foot" style={{justifyContent: 'space-between'}}>
          <span className="subtle" style={{fontSize: 12}}>{list.length} sonuç · sayfa 1/1</span>
          <div className="row">
            <button className="btn btn-ghost btn-sm"><I.ChevronL size={12}/></button>
            <button className="btn btn-secondary btn-sm">1</button>
            <button className="btn btn-ghost btn-sm"><I.Chevron size={12}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CustomersPage = CustomersPage;
