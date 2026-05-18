import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/TopNav.jsx';
import { approveToolSubmission, loadAdminSnapshot, loadAdminStats, rejectToolSubmission, updateAdminWorkflow } from '../lib/api.js';
import { formatNumber } from '../lib/workflowUtils.js';

export default function Admin({ workflows, clickStats, user, onNavigate, onLoginClick }) {
  const [tab, setTab] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [editWorkflow, setEditWorkflow] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function refreshSnapshot() {
    try {
      setError('');
      const [nextSnapshot, nextStats] = await Promise.all([loadAdminSnapshot(), loadAdminStats()]);
      setSnapshot(nextSnapshot);
      setAdminStats(nextStats);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    refreshSnapshot();
  }, [user]);

  async function approve(id) {
    const json = await approveToolSubmission(id);
    if (!json.ok) return setError(json.error?.message || '审核失败');
    refreshSnapshot();
  }

  async function reject(id) {
    const adminNote = window.prompt('填写拒绝原因', '信息不完整，暂不通过') || '';
    const json = await rejectToolSubmission(id, adminNote);
    if (!json.ok) return setError(json.error?.message || '拒绝失败');
    refreshSnapshot();
  }

  function startEdit(workflow) {
    setEditWorkflow({
      ...workflow,
      tagsText: (workflow.tags || []).join(', '),
      galleryText: JSON.stringify(workflow.gallery || [], null, 2)
    });
  }

  function updateEdit(key, value) {
    setEditWorkflow((current) => ({ ...current, [key]: value }));
  }

  async function saveWorkflow(event) {
    event.preventDefault();
    if (!editWorkflow) return;
    setSaving(true);
    setError('');
    try {
      let gallery = [];
      try {
        gallery = editWorkflow.galleryText ? JSON.parse(editWorkflow.galleryText) : [];
      } catch {
        throw new Error('gallery 必须是 JSON 数组');
      }
      const payload = {
        name: editWorkflow.name,
        tagline: editWorkflow.tagline,
        description: editWorkflow.description,
        target_url: editWorkflow.target_url || 'https://flowhub.local',
        type: editWorkflow.type,
        category: editWorkflow.category,
        tags: String(editWorkflow.tagsText || '').split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
        price_model: editWorkflow.price_model || 'free',
        price_amount: Number(editWorkflow.price_amount || 0),
        cover_color: editWorkflow.cover_color || '#1A5D3A',
        cover_image_url: editWorkflow.cover_image_url || '',
        logo_url: editWorkflow.logo_url || '',
        gallery
      };
      const json = await updateAdminWorkflow(editWorkflow.id, payload);
      if (!json.ok) throw new Error(json.error?.message || '保存失败');
      setEditWorkflow(null);
      await refreshSnapshot();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const adminWorkflows = snapshot?.workflows?.length ? snapshot.workflows : workflows;
  const pendingSubmissions = (snapshot?.tool_submissions || []).filter((item) => item.status === 'pending');

  const stats = useMemo(() => {
    const fallback7d = Object.values(clickStats?.by_workflow_7d || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    return {
      workflows: adminStats?.workflows?.active ?? snapshot?.workflows?.length ?? workflows.length,
      clicks: adminStats?.clicks?.total ?? clickStats?.total ?? workflows.reduce((sum, workflow) => sum + (workflow.seed_clicks || 0), 0),
      today: adminStats?.clicks?.today ?? 0,
      last7: adminStats?.clicks?.last_7_days ?? fallback7d,
      submissions: adminStats?.tool_submissions?.pending ?? pendingSubmissions.length,
      reviews: snapshot?.reviews?.length ?? workflows.reduce((sum, workflow) => sum + (workflow.review_count || 0), 0)
    };
  }, [adminStats, snapshot, workflows, clickStats, pendingSubmissions.length]);

  return (
    <div className="view active" id="view-admin">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <img src="/assets/flowhub-mark.png" alt="" />
            <div>
              <strong>FlowHub Admin</strong>
              <span>运营控制台</span>
            </div>
          </div>
          {['overview', 'workflows', 'submissions', 'analytics', 'users'].map((item) => (
            <button key={item} className={`admin-nav-item ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>
              <i className="fas fa-chart-pie" />
              {item === 'overview' ? '总览' : item === 'workflows' ? '工作流' : item === 'submissions' ? '工具审核' : item === 'analytics' ? '数据分析' : '用户'}
            </button>
          ))}
        </aside>

        <section className="admin-content">
          <div className="admin-top">
            <div>
              <span className="eyebrow">ADMIN</span>
              <h1>后台统计和工具审核</h1>
            </div>
            {!user && <button className="try-btn primary" onClick={onLoginClick}>管理员登录</button>}
          </div>

          {(!user || user.role !== 'admin') && (
            <div className="admin-empty">
              <h3>需要管理员权限</h3>
              <p>后台数据、工具审核和用户信息都需要 token 鉴权。</p>
            </div>
          )}

          {user?.role === 'admin' && (
            <>
              {error && <div className="tool-error">{error}</div>}
              {tab === 'overview' && (
                <>
                  <div className="admin-stat-grid">
                    <div><span>总点击量</span><strong>{formatNumber(stats.clicks)}</strong></div>
                    <div><span>今日点击</span><strong>{formatNumber(stats.today)}</strong></div>
                    <div><span>近 7 天点击</span><strong>{formatNumber(stats.last7)}</strong></div>
                    <div><span>待审核</span><strong>{stats.submissions}</strong></div>
                  </div>
                  <div className="admin-panel">
                    <h3>工具点击排行</h3>
                    {(adminStats?.rankings?.workflows?.length ? adminStats.rankings.workflows : adminWorkflows.slice(0, 8)).map((workflow) => (
                      <div className="admin-rank-row" key={workflow.id || workflow.name}>
                        <span>{workflow.name}</span>
                        <b>{formatNumber(workflow.clicks || workflow.seed_clicks || 0)}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === 'workflows' && (
                <>
                  <div className="admin-panel">
                    <h3>工作流管理</h3>
                    {adminWorkflows.map((workflow) => (
                      <div className="admin-table-row" key={workflow.id}>
                        <div><strong>{workflow.name}</strong><span>{workflow.category}</span></div>
                        <span>{workflow.type === 'self' ? '自营' : '外部'}</span>
                        <span>{workflow.status || 'active'}</span>
                        <button className="try-btn" onClick={() => startEdit(workflow)}>编辑</button>
                      </div>
                    ))}
                  </div>
                  {editWorkflow && (
                    <form className="admin-panel admin-edit-form" onSubmit={saveWorkflow}>
                      <h3>编辑产品信息</h3>
                      <div className="form-grid">
                        <label>名称<input value={editWorkflow.name || ''} onChange={(event) => updateEdit('name', event.target.value)} required /></label>
                        <label>分类<input value={editWorkflow.category || ''} onChange={(event) => updateEdit('category', event.target.value)} required /></label>
                        <label>类型
                          <select value={editWorkflow.type || 'self'} onChange={(event) => updateEdit('type', event.target.value)}>
                            <option value="self">站内工作流</option>
                            <option value="recommend">外部工具</option>
                          </select>
                        </label>
                        <label>价格模型
                          <select value={editWorkflow.price_model || 'free'} onChange={(event) => updateEdit('price_model', event.target.value)}>
                            <option value="free">免费</option>
                            <option value="pro">Pro</option>
                            <option value="cpc">CPC</option>
                            <option value="cps">CPS</option>
                          </select>
                        </label>
                        <label>官网/API 地址<input value={editWorkflow.target_url || ''} onChange={(event) => updateEdit('target_url', event.target.value)} required /></label>
                        <label>Logo URL<input value={editWorkflow.logo_url || ''} onChange={(event) => updateEdit('logo_url', event.target.value)} /></label>
                        <label>封面图 URL<input value={editWorkflow.cover_image_url || ''} onChange={(event) => updateEdit('cover_image_url', event.target.value)} /></label>
                        <label>品牌色<input value={editWorkflow.cover_color || ''} onChange={(event) => updateEdit('cover_color', event.target.value)} /></label>
                        <label>标签<input value={editWorkflow.tagsText || ''} onChange={(event) => updateEdit('tagsText', event.target.value)} /></label>
                        <label>价格<input type="number" value={editWorkflow.price_amount || 0} onChange={(event) => updateEdit('price_amount', event.target.value)} /></label>
                      </div>
                      <label>一句话介绍<input value={editWorkflow.tagline || ''} onChange={(event) => updateEdit('tagline', event.target.value)} /></label>
                      <label>详细说明<textarea rows={5} value={editWorkflow.description || ''} onChange={(event) => updateEdit('description', event.target.value)} /></label>
                      <label>Gallery JSON<textarea rows={5} value={editWorkflow.galleryText || ''} onChange={(event) => updateEdit('galleryText', event.target.value)} /></label>
                      <div className="admin-edit-actions">
                        <button className="try-btn primary" disabled={saving}>{saving ? '保存中...' : '保存修改'}</button>
                        <button className="try-btn" type="button" onClick={() => setEditWorkflow(null)}>取消</button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {tab === 'submissions' && (
                <div className="admin-panel">
                  <h3>工具审核</h3>
                  {pendingSubmissions.length === 0 ? (
                    <div className="empty">暂无 pending 提交。数据库连接后这里会展示 tool_submissions。</div>
                  ) : pendingSubmissions.map((submission) => (
                    <div className="admin-table-row" key={submission.id}>
                      <div><strong>{submission.tool_name}</strong><span>{submission.contact}</span></div>
                      <span>{submission.status}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="try-btn" onClick={() => approve(submission.id)}>通过</button>
                        <button className="try-btn" onClick={() => reject(submission.id)}>拒绝</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'analytics' && (
                <div className="admin-panel">
                  <h3>搜索词和外跳排行</h3>
                  <div className="admin-analytics-grid">
                    <div>
                      <h4>搜索词排行</h4>
                      {(adminStats?.rankings?.search_terms || []).length === 0 && <p>暂无搜索点击数据。</p>}
                      {(adminStats?.rankings?.search_terms || []).map((item) => (
                        <div className="admin-rank-row" key={item.search_query}>
                          <span>{item.search_query}</span>
                          <b>{formatNumber(item.clicks)}</b>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4>外部跳转排行</h4>
                      {(adminStats?.rankings?.external_redirects || []).length === 0 && <p>暂无外部跳转数据。</p>}
                      {(adminStats?.rankings?.external_redirects || []).map((item) => (
                        <div className="admin-rank-row" key={item.id}>
                          <span>{item.name}</span>
                          <b>{formatNumber(item.clicks)}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'users' && (
                <div className="admin-panel">
                  <h3>用户</h3>
                  <p>用户列表通过 `/api/data` 返回，当前页面保留权限保护和展示区域。</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
