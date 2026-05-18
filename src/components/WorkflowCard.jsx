import { getClickCount, getPriceLabel, getWorkflowCta, getWorkflowLogo, isPromoted, workflowInitial } from '../lib/workflowUtils.js';

export default function WorkflowCard({ workflow, clickStats, onOpen, onRun }) {
  const logo = getWorkflowLogo(workflow);
  return (
    <div className="wf-card" onClick={() => onOpen(workflow.id)}>
      <div className="wf-thumb" style={{ background: `linear-gradient(135deg, ${workflow.cover_color || '#1A5D3A'}22, var(--bg-soft))` }}>
        {workflow.cover_image_url ? (
          <img src={workflow.cover_image_url} alt={workflow.name} />
        ) : (
          <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 38, fontWeight: 700, color: workflow.cover_color || 'var(--self)' }}>
            {workflowInitial(workflow)}
          </div>
        )}
        <div className="wf-thumb-overlay" />
      </div>
      <div className="wf-card-head">
        <div className="wf-icon" style={{ background: `${workflow.cover_color || '#1A5D3A'}22`, color: workflow.cover_color || '#1A5D3A' }}>
          {logo ? <img src={logo} alt={`${workflow.name} logo`} /> : workflowInitial(workflow)}
        </div>
        <span className={`wf-badge ${workflow.type === 'self' ? 'self' : 'ad'}`}>{workflow.type === 'self' ? '自营' : '推荐'}</span>
        {isPromoted(workflow) && <span className="result-promo-badge">推广</span>}
      </div>
      <h3>{workflow.name}</h3>
      <p className="desc">{workflow.tagline || workflow.description}</p>
      <div className="wf-tags">
        {(workflow.tags || []).slice(0, 3).map((tag) => <span className="wf-tag" key={tag}>{tag}</span>)}
      </div>
      <div className="wf-foot">
        <span className="wf-rating"><i className="fas fa-star" /> {workflow.rating || 0} · {getClickCount(workflow, clickStats).toLocaleString('zh-CN')} 次调用</span>
        <span className={`wf-price ${workflow.price_model || ''}`}>{getPriceLabel(workflow)}</span>
      </div>
      <button
        className={`wf-card-cta ${workflow.type === 'recommend' ? 'recommend' : workflow.price_model === 'pro' ? 'pro' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onRun(workflow);
        }}
      >
        <i className={`fas ${workflow.type === 'recommend' ? 'fa-external-link-alt' : 'fa-play'}`} />
        {getWorkflowCta(workflow)}
      </button>
    </div>
  );
}
