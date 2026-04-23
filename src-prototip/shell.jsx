// Reusable shell bits: Sidebar + Topbar

const Sidebar = ({ route, onNav, counts }) => {
  const I = window.Icons;
  const items = [
    { key: 'dashboard', icon: <I.Dashboard/>, label: 'Panel' },
    { key: 'inbox', icon: <I.Inbox/>, label: 'Gelen Kutusu', count: counts?.inbox },
    { key: 'customers', icon: <I.Users/>, label: 'Müşteriler', count: counts?.customers },
    { key: 'projects', icon: <I.Folder/>, label: 'Projeler', count: counts?.projects },
    { key: 'documents', icon: <I.File/>, label: 'Dokümanlar' },
    { key: 'comments', icon: <I.Comment/>, label: 'Yorumlar', count: counts?.comments },
  ];
  const workspace = [
    { key: 'reports', icon: <I.Reports/>, label: 'Raporlar', soon: true },
    { key: 'plan', icon: <I.Kanban/>, label: 'Proje Planı', soon: true },
    { key: 'analytics', icon: <I.TrendUp/>, label: 'Analitik' },
  ];

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-brand-mark">N</div>
        <div>
          <div className="sb-brand-name">Nuevo</div>
          <div className="sb-brand-sub">PMO · Workspace</div>
        </div>
      </div>

      <div>
        {items.map(it => (
          <div key={it.key}
            className={'sb-item' + (route === it.key ? ' active' : '')}
            onClick={() => onNav(it.key)}>
            <span className="ic">{it.icon}</span>
            <span>{it.label}</span>
            {it.count != null && <span className="count">{it.count}</span>}
          </div>
        ))}
      </div>

      <div className="sb-section">
        <div className="sb-section-label">Workspace</div>
        {workspace.map(it => (
          <div key={it.key} className={'sb-item' + (route === it.key ? ' active' : '')} onClick={() => !it.soon && onNav(it.key)}>
            <span className="ic">{it.icon}</span>
            <span>{it.label}</span>
            {it.soon && <span className="count" style={{fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.7}}>Yakında</span>}
          </div>
        ))}
      </div>

      <div className="sb-footer">
        <div className="sb-user">
          <div className="av">ZT</div>
          <div className="who grow">
            <div className="nm">Zilan Timur</div>
            <div className="em">zilan@nuevo.dev · PMO</div>
          </div>
          <I.Chevron style={{opacity: 0.4}}/>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ crumbs = [], actions }) => {
  const I = window.Icons;
  return (
    <div className="tb">
      <div className="tb-breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'curr' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="tb-search" style={{marginLeft: 'auto'}}>
        <I.Search size={14}/>
        <span>Proje, müşteri veya doküman ara</span>
        <kbd>⌘K</kbd>
      </div>

      <button className="tb-btn"><I.Bell size={15}/></button>
      <button className="tb-btn"><I.Settings size={15}/></button>
      {actions}
    </div>
  );
};

window.Sidebar = Sidebar;
window.Topbar = Topbar;
