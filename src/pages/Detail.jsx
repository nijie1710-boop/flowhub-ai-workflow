import TopNav from '../components/TopNav.jsx';
import WorkflowCard from '../components/WorkflowCard.jsx';
import { buildAttributedUrl, formatNumber, getClickCount, getWorkflowCta, getWorkflowLogo, getWorkflowTypeLabel, isPromoted } from '../lib/workflowUtils.js';

export default function Detail({ workflows, currentWorkflow, clickStats, user, onNavigate, onOpenWorkflow, onRunWorkflow, onLoginClick }) {
  const workflow = currentWorkflow;
  if (!workflow) {
    return (
      <div className="view active" id="view-detail">
        <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
        <div className="empty">工作流不存在</div>
      </div>
    );
  }

  const related = workflows
    .filter((item) => item.id !== workflow.id && item.category === workflow.category)
    .slice(0, 3);
  const logo = getWorkflowLogo(workflow);

  return (
    <div className="view active" id="view-detail">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="detail-page">
        <div className="breadcrumb">
          <a onClick={() => onNavigate('market')}>发现</a>
          <span>›</span>
          <a onClick={() => onNavigate('search', { category: workflow.category })}>{workflow.category}</a>
          <span>›</span>
          <span>{workflow.name}</span>
        </div>

        <div className="detail-layout">
          <section className="detail-main">
            <div className="detail-head">
              <div className="detail-icon-big" style={{ background: `${workflow.cover_color || '#1A5D3A'}22`, color: workflow.cover_color || '#1A5D3A' }}>
                {logo ? <img src={logo} alt={workflow.name} /> : workflow.name.charAt(0)}
              </div>
              <div>
                <h1>{workflow.name}</h1>
                <p>{workflow.tagline}</p>
                <div className="detail-meta">
                  <span className={`wf-badge ${workflow.type === 'self' ? 'self' : 'ad'}`}>{getWorkflowTypeLabel(workflow)}</span>
                  {isPromoted(workflow) && <span className="result-promo-badge">推广</span>}
                  <span><i className="fas fa-star" /> {workflow.rating}</span>
                  <span>{formatNumber(workflow.review_count)} 评价</span>
                  <span>{formatNumber(getClickCount(workflow, clickStats))} 次调用</span>
                </div>
              </div>
            </div>

            <div className="detail-gallery">
              <div className="gallery-slide active" style={{ background: `${workflow.cover_color || '#1A5D3A'}18` }}>
                {workflow.cover_image_url ? (
                  <img src={workflow.cover_image_url} alt={workflow.name} />
                ) : (
                  <div className="gallery-placeholder">
                    <span>{workflow.name.charAt(0)}</span>
                    <strong>{workflow.name}</strong>
                    <small>{workflow.category}</small>
                  </div>
                )}
              </div>
            </div>

            <section className="detail-section">
              <h2>工作流介绍</h2>
              <p>{workflow.description}</p>
            </section>

            {!!workflow.examples?.length && (
              <section className="detail-section">
                <h2>使用示例</h2>
                <div className="example-list">
                  {workflow.examples.map((example, index) => (
                    <div className="example-card" key={`${example.label}-${index}`}>
                      <h4>{example.label}</h4>
                      <pre>{example.text}</pre>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!!related.length && (
              <section className="detail-section">
                <h2>相关推荐</h2>
                <div className="wf-grid">
                  {related.map((item) => (
                    <WorkflowCard key={item.id} workflow={item} clickStats={clickStats} onOpen={onOpenWorkflow} onRun={onRunWorkflow} />
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="detail-side">
            <div className="side-card">
              <button className="side-primary" onClick={() => onRunWorkflow(workflow)}>{getWorkflowCta(workflow)}</button>
              {workflow.type === 'recommend' && (
                <a className="side-secondary" href={buildAttributedUrl(workflow, user?.id)} target="_blank" rel="noreferrer">打开带归因链接</a>
              )}
              <button className="side-secondary" onClick={onLoginClick}><i className="far fa-bookmark" /> 收藏</button>
              <div className="side-stats">
                <div><strong>{formatNumber(getClickCount(workflow, clickStats))}</strong><span>总调用</span></div>
                <div><strong>{workflow.rating}</strong><span>评分</span></div>
                <div><strong>{formatNumber(workflow.review_count)}</strong><span>评价</span></div>
                <div><strong>{workflow.type === 'self' ? '站内' : '外部'}</strong><span>类型</span></div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
