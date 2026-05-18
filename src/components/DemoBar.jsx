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

function switchLegacyView(view) {
  window.switchView?.(view);
}

function ViewPill({ view, children, active = false }) {
  return (
    <span
      className={`demo-pill${active ? ' active' : ''}`}
      data-view={view}
      onClick={() => switchLegacyView(view)}
    >
      {children}
    </span>
  );
}

export default function DemoBar() {
  return (
    <div className="demo-bar">
      <span className="label">FlowHub Demo</span>
      <span className="demo-group">用户视角</span>
      {userViews.map(([view, label], index) => (
        <ViewPill key={view} view={view} active={index === 0}>{label}</ViewPill>
      ))}
      <span className="demo-divider" />
      <span className="demo-group">运营视角</span>
      {operatorViews.map(([view, label]) => (
        <ViewPill key={view} view={view}>{label}</ViewPill>
      ))}
      <span className="demo-divider" />
      <span className="demo-group">接入视角</span>
      {integrationViews.map(([view, label]) => (
        <ViewPill key={view} view={view}>{label}</ViewPill>
      ))}
      <div className="spacer" />
      <div className="right-controls">
        <span id="user-status">游客模式</span>
        <button className="theme-toggle" onClick={() => window.toggleTheme?.()} title="切换主题">
          <i className="fas fa-moon" id="theme-icon" />
        </button>
        <button className="reset-btn" onClick={() => window.resetAll?.()}>重置数据</button>
      </div>
    </div>
  );
}
