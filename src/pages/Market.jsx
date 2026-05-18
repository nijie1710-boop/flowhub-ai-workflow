import TopNav from '../components/TopNav.jsx';
import WorkflowCard from '../components/WorkflowCard.jsx';
import { CATEGORIES } from '../lib/seedData.js';
import { filterWorkflows, formatNumber } from '../lib/workflowUtils.js';

export default function Market({ workflows, dataSource, clickStats, user, onNavigate, onOpenWorkflow, onRunWorkflow, onLoginClick }) {
  const selfWorkflows = workflows.filter((workflow) => workflow.type === 'self');
  const externalTools = workflows.filter((workflow) => workflow.type === 'recommend');
  const hotWorkflows = filterWorkflows(workflows, {}).slice(0, 6);
  const totalClicks = workflows.reduce((sum, workflow) => sum + (workflow.seed_clicks || 0), 0);

  return (
    <div className="view active" id="view-market">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="market-page">
        <section className="market-hero">
          <div className="market-hero-copy">
            <div className="hero-eyebrow">A WORKFLOW MARKETPLACE</div>
            <h1>先逛工作流,需要时再登录</h1>
            <p>不用登录也可以浏览、搜索和查看详情。当前自营区优先展示已接真实处理链路的工具。</p>
            <div className="hero-search" onClick={() => onNavigate('search')}>
              <i className="fas fa-search" />
              <span>搜索 AI 工作流、外部工具或任务场景</span>
              <button>搜索</button>
            </div>
            <div className="hero-quick-tags">
              {['文档转 Markdown', '图片 OCR', '健身餐菜谱', '商品图工具'].map((tag) => (
                <span key={tag} onClick={() => onNavigate('search', { query: tag })}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="market-hero-panel">
            <div className="hero-panel-head">
              <span>TRENDING NOW</span>
              <b>{dataSource === 'api' ? '实时 API' : 'Seed fallback'}</b>
            </div>
            {hotWorkflows.slice(0, 4).map((workflow) => (
              <div className="hero-mini-row" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)}>
                <span style={{ background: `${workflow.cover_color || '#1A5D3A'}22`, color: workflow.cover_color }}>{workflow.name.charAt(0)}</span>
                <div>
                  <strong>{workflow.name}</strong>
                  <small>{workflow.type === 'self' ? '站内工作流' : '外部工具'} · {workflow.rating} ★</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="market-stats">
          <div><strong>{workflows.length}</strong><span>工作流</span></div>
          <div><strong>{formatNumber(clickStats?.total || totalClicks)}</strong><span>累计调用</span></div>
          <div><strong>{selfWorkflows.length}</strong><span>可用自营</span></div>
          <div><strong>4.8</strong><span>平均评分</span></div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">POPULAR CATEGORIES</span>
              <h2>热门分类</h2>
            </div>
          </div>
          <div className="category-row">
            {CATEGORIES.filter((item) => item !== '全部').map((category) => (
              <button key={category} onClick={() => onNavigate('search', { category })}>{category}</button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">SELF HOSTED</span>
              <h2>热门工作流</h2>
            </div>
            <button className="text-btn" onClick={() => onNavigate('search')}>查看全部</button>
          </div>
          <div className="wf-grid">
            {selfWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                clickStats={clickStats}
                onOpen={onOpenWorkflow}
                onRun={onRunWorkflow}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">EXTERNAL TOOLS</span>
              <h2>外部工具推荐</h2>
            </div>
          </div>
          <div className="wf-grid">
            {externalTools.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                clickStats={clickStats}
                onOpen={onOpenWorkflow}
                onRun={onRunWorkflow}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
