export default function MobileChrome({ activeView, onNavigate, onLoginClick }) {
  return (
    <>
      <button className="scroll-top-btn" id="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <i className="fas fa-arrow-up" />
      </button>

      <nav className="mobile-tabbar">
        <div className="mobile-tabbar-row">
          <div className={`mobile-tab ${activeView === 'market' ? 'active' : ''}`} data-mobile-view="market" onClick={() => onNavigate('market')}>
            <i className="fas fa-house" /><span>市场</span>
          </div>
          <div className={`mobile-tab ${activeView === 'search' ? 'active' : ''}`} data-mobile-view="search" onClick={() => onNavigate('search')}>
            <i className="fas fa-search" /><span>搜索</span>
          </div>
          <div className="mobile-tab center" onClick={() => onNavigate('search')}>
            <div className="center-btn"><i className="fas fa-wand-magic-sparkles" /></div>
            <span>AI</span>
          </div>
          <div className="mobile-tab" data-mobile-view="notif" onClick={onLoginClick}>
            <i className="fas fa-bell" /><span>通知</span>
          </div>
          <div className={`mobile-tab ${activeView === 'me' ? 'active' : ''}`} data-mobile-view="me" onClick={() => onNavigate('me')}>
            <i className="fas fa-user" /><span>我的</span>
          </div>
        </div>
      </nav>

      <div className="mobile-drawer-bg" id="mobile-drawer-bg" />
      <aside className="mobile-drawer" id="mobile-drawer" />

      <div className="chatbot-fab" onClick={() => onNavigate('search')} id="chatbot-fab">
        <i className="fas fa-comment-dots" />
        <span className="chatbot-badge" style={{ display: 'none' }} />
      </div>
    </>
  );
}
