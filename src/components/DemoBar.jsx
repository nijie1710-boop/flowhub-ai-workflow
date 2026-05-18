const userViews = [
  ['market', '市场'],
  ['search', '搜索'],
  ['me', '我的']
];

const operatorViews = [
  ['admin', '管理后台'],
  ['creator', '创作者后台']
];

const integrationViews = [
  ['advertiser', '广告主入驻'],
  ['wizard', '接入向导']
];

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('flowhub_theme', next);
}

function ViewPill({ view, children, active, onNavigate }) {
  return (
    <span
      className={`demo-pill${active ? ' active' : ''}`}
      data-view={view}
      onClick={() => onNavigate(view)}
    >
      {children}
    </span>
  );
}

export default function DemoBar({ view: activeView, onNavigate, user, onLoginClick }) {
  return (
    <div className="demo-bar">
      <span className="label">FlowHub Demo</span>
      <span className="demo-group">用户视角</span>
      {userViews.map(([view, label]) => (
        <ViewPill key={view} view={view} active={activeView === view} onNavigate={onNavigate}>{label}</ViewPill>
      ))}
      <span className="demo-divider" />
      <span className="demo-group">运营视角</span>
      {operatorViews.map(([view, label]) => (
        <ViewPill key={view} view={view} active={activeView === view} onNavigate={onNavigate}>{label}</ViewPill>
      ))}
      <span className="demo-divider" />
      <span className="demo-group">接入视角</span>
      {integrationViews.map(([view, label]) => (
        <ViewPill key={view} view={view} active={activeView === view} onNavigate={onNavigate}>{label}</ViewPill>
      ))}
      <div className="spacer" />
      <div className="right-controls">
        <span id="user-status">{user ? `${user.name || user.email} · ${user.tier === 'pro' ? 'Pro' : '免费'}` : '游客模式'}</span>
        <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
          <i className="fas fa-moon" id="theme-icon" />
        </button>
        {user ? (
          <button className="reset-btn" onClick={() => onNavigate('me')}>个人中心</button>
        ) : (
          <button className="reset-btn" onClick={onLoginClick}>登录</button>
        )}
      </div>
    </div>
  );
}
