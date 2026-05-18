import TopNav from '../components/TopNav.jsx';
import WorkflowCard from '../components/WorkflowCard.jsx';
import { clearToken } from '../lib/auth.js';

export default function Me({ workflows, clickStats, user, setUser, onNavigate, onOpenWorkflow, onRunWorkflow, onLoginClick }) {
  const recommended = workflows.filter((workflow) => workflow.type === 'self').slice(0, 3);

  function logout() {
    clearToken();
    setUser(null);
    onNavigate('market');
  }

  return (
    <div className="view active" id="view-me">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="me-page">
        <section className="me-hero">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h1>{user ? `${user.name || user.email} 的 FlowHub` : '游客模式'}</h1>
            <p>{user ? '管理订阅、收藏、评价和调用记录。' : '登录后可以同步收藏、保留账单和发布评价。'}</p>
          </div>
          {user ? (
            <button className="try-btn" onClick={logout}>退出登录</button>
          ) : (
            <button className="try-btn primary" onClick={onLoginClick}>登录 / 注册</button>
          )}
        </section>

        <section className="me-grid">
          <div className="me-card">
            <h3>订阅</h3>
            <strong>{user?.tier === 'pro' ? 'Pro 会员' : '免费用户'}</strong>
            <p>{user?.tier === 'pro' ? '每月 1,000 次调用额度。' : '每月 50 次免费调用，Pro 解锁更多自营工作流。'}</p>
            <button className="try-btn primary">升级 Pro</button>
          </div>
          <div className="me-card">
            <h3>调用额度</h3>
            <strong>{user?.tier === 'pro' ? '1000' : '50'}</strong>
            <p>额度会在接入真实支付和用户表后由后端返回。</p>
          </div>
          <div className="me-card">
            <h3>审核状态</h3>
            <strong>{user ? '可提交工具' : '需要登录'}</strong>
            <p>用户提交外部工具后，管理员审核通过才会上架。</p>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">RECOMMENDED</span>
              <h2>推荐继续使用</h2>
            </div>
          </div>
          <div className="wf-grid">
            {recommended.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} clickStats={clickStats} onOpen={onOpenWorkflow} onRun={onRunWorkflow} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
