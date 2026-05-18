function callLegacy(fn, ...args) {
  window[fn]?.(...args);
}

export default function MobileChrome() {
  return (
    <>
      <button className="scroll-top-btn" id="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <i className="fas fa-arrow-up" />
      </button>

      <nav className="mobile-tabbar">
        <div className="mobile-tabbar-row">
          <div className="mobile-tab active" data-mobile-view="market" onClick={() => callLegacy('switchView', 'market')}>
            <i className="fas fa-house" /><span>市场</span>
          </div>
          <div className="mobile-tab" data-mobile-view="search" onClick={() => callLegacy('quickSearchFocus')}>
            <i className="fas fa-search" /><span>搜索</span>
          </div>
          <div className="mobile-tab center" onClick={() => callLegacy('toggleChatbot')}>
            <div className="center-btn"><i className="fas fa-wand-magic-sparkles" /></div>
            <span>AI</span>
          </div>
          <div className="mobile-tab" data-mobile-view="notif" onClick={() => callLegacy('openMobileNotif')}>
            <i className="fas fa-bell" /><span>通知</span>
          </div>
          <div className="mobile-tab" data-mobile-view="me" onClick={() => callLegacy('switchView', 'me')}>
            <i className="fas fa-user" /><span>我的</span>
          </div>
        </div>
      </nav>

      <div className="mobile-drawer-bg" id="mobile-drawer-bg" onClick={() => callLegacy('closeMobileDrawer')} />
      <aside className="mobile-drawer" id="mobile-drawer" />

      <div className="chatbot-fab" onClick={() => callLegacy('toggleChatbot')} id="chatbot-fab">
        <i className="fas fa-comment-dots" />
        <span className="chatbot-badge" style={{ display: 'none' }} />
      </div>

      <div className="chatbot-panel" id="chatbot-panel">
        <div className="chatbot-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="chatbot-avatar"><i className="fas fa-robot" /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>FlowHub 助手</div>
              <div style={{ fontSize: 11, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, background: '#5DCAA5', borderRadius: '50%', display: 'inline-block' }} />
                在线 · 通常 30 秒内回复
              </div>
            </div>
          </div>
          <button className="chatbot-close" onClick={() => callLegacy('toggleChatbot')}><i className="fas fa-times" /></button>
        </div>
        <div className="chatbot-body" id="chatbot-body">
          <div className="chat-msg bot">
            <div className="chat-bubble">你好!我是 FlowHub 智能助手 👋<br />有什么可以帮你的?</div>
          </div>
          <div className="chat-suggestions">
            <button className="chat-suggest" onClick={() => callLegacy('askChatbot', '怎么升级 Pro')}>怎么升级 Pro?</button>
            <button className="chat-suggest" onClick={() => callLegacy('askChatbot', '如何上架工作流')}>如何上架工作流?</button>
            <button className="chat-suggest" onClick={() => callLegacy('askChatbot', '退订流程')}>怎么退订?</button>
            <button className="chat-suggest" onClick={() => callLegacy('askChatbot', 'PicSpark 接入')}>PicSpark 怎么接入?</button>
          </div>
        </div>
        <div className="chatbot-input-wrap">
          <input
            className="chatbot-input"
            id="chatbot-input"
            placeholder="输入你的问题…"
            onKeyDown={(event) => { if (event.key === 'Enter') callLegacy('sendChatMsg'); }}
          />
          <button className="chatbot-send" onClick={() => callLegacy('sendChatMsg')}><i className="fas fa-paper-plane" /></button>
        </div>
      </div>

      <div className="modal-bg" id="modal" onClick={(event) => { if (event.target === event.currentTarget) callLegacy('closeModal'); }}>
        <div className="modal" id="modal-content" />
      </div>

      <div className="toast" id="toast">
        <i className="fas fa-circle-check" />
        <span id="toast-msg" />
      </div>
    </>
  );
}
