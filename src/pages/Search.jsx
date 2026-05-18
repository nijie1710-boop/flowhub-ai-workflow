import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav.jsx';
import { CATEGORIES } from '../lib/seedData.js';
import { filterWorkflows, getWorkflowCta, getWorkflowTypeLabel, isPromoted } from '../lib/workflowUtils.js';

export default function Search({ workflows, user, route, onNavigate, onOpenWorkflow, onRunWorkflow, onLoginClick }) {
  const [query, setQuery] = useState(route.query || '');
  const [category, setCategory] = useState(route.category || '全部');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route.query !== undefined) setQuery(route.query);
    if (route.category !== undefined) setCategory(route.category);
  }, [route.query, route.category]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, [query, category, type]);

  const results = useMemo(() => filterWorkflows(workflows, { query, category, type }), [workflows, query, category, type]);

  return (
    <div className="view active" id="view-search">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="search-page">
        <section className="search-head-panel">
          <span className="eyebrow">SEARCH FLOWHUB</span>
          <h1>搜索 AI 工作流和外部工具</h1>
          <div className="search-page-input">
            <i className="fas fa-search" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词，例如 图片 OCR、健身餐、商品图"
            />
            {query && <button onClick={() => setQuery('')}>清空</button>}
          </div>
          <div className="search-filter-row">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">全部类型</option>
              <option value="self">站内工作流</option>
              <option value="external">外部工具</option>
            </select>
          </div>
        </section>

        {loading && (
          <div className="search-state loading">
            <i className="fas fa-spinner fa-spin" />
            <h3>正在搜索</h3>
            <p>正在匹配站内工作流、外部工具和推广资源。</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="search-state">
            <i className="fas fa-magnifying-glass" />
            <h3>没有找到匹配结果</h3>
            <p>换一个关键词，或放宽分类和类型筛选。</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-result-grid">
            {results.map((workflow) => (
              <article className="search-result-card" key={workflow.id} onClick={() => onOpenWorkflow(workflow.id)}>
                <div className="wf-thumb" style={{ background: `${workflow.cover_color || '#1A5D3A'}18` }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: workflow.cover_color || 'var(--self)' }}>{workflow.name.charAt(0)}</div>
                </div>
                <div>
                  <div className="result-meta-row">
                    <span className={`result-type-badge ${workflow.type === 'self' ? 'self' : 'external'}`}>{getWorkflowTypeLabel(workflow)}</span>
                    {isPromoted(workflow) && <span className="result-promo-badge">推广</span>}
                  </div>
                  <h3>{workflow.name}</h3>
                  <p>{workflow.tagline || workflow.description}</p>
                  <div className="wf-tags">
                    {(workflow.tags || []).slice(0, 4).map((tag) => <span className="wf-tag" key={tag}>{tag}</span>)}
                  </div>
                </div>
                <button
                  className="wf-card-cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRunWorkflow(workflow, { source: 'search_result', searchQuery: query });
                  }}
                >
                  {getWorkflowCta(workflow)}
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
