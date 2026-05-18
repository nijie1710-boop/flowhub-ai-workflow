import { getTheme, setTheme } from '../lib/auth.js';

export default function TopNav({ user, onNavigate, onLoginClick }) {
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  }

  return (
    <nav className="cnav">
      <div className="logo" onClick={() => onNavigate('market')}>
        <img className="mark brand-mark" src="/assets/flowhub-mark.png" alt="" />
        <span className="name">FlowHub</span>
      </div>
      <div className="cnav-search" onClick={() => onNavigate('search')}>
        <i className="fas fa-search" />
        <input readOnly placeholder="搜索工作流,或描述你想完成的任务…" />
        <span className="kbd">⌘ K</span>
      </div>
      <div className="cnav-right">
        <span className="cnav-link" onClick={() => onNavigate('market')}>市场</span>
        <span className="cnav-link" onClick={() => onNavigate('creator')}>创作者</span>
        <span className="cnav-link" onClick={() => onNavigate('advertiser')}>广告投放</span>
        <span className="cnav-link" onClick={() => onNavigate('wizard')}>接入文档</span>
        <span className="cnav-link" onClick={() => onNavigate('me')}>我的</span>
        {user?.role === 'admin' && <span className="cnav-link" onClick={() => onNavigate('admin')}>管理后台</span>}
        {user ? (
          <div className="avatar" onClick={() => onNavigate('me')}>{user.name?.charAt(0) || '我'}<div className="dot" /></div>
        ) : (
          <button className="login-btn" onClick={onLoginClick}>登录</button>
        )}
        <button className="theme-toggle" onClick={toggleTheme} title="切换主题">
          <i className="fas fa-moon" />
        </button>
      </div>
    </nav>
  );
}
