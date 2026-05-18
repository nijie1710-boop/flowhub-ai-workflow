import { useState } from 'react';
import TopNav from '../components/TopNav.jsx';
import { post } from '../lib/api.js';

export default function Creator({ user, onNavigate, onLoginClick, onToast }) {
  const [form, setForm] = useState({
    submitter_name: '',
    contact: '',
    tool_name: '',
    tagline: '',
    tool_desc: '',
    category: '效率 · 办公',
    tool_url: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!user) return onLoginClick();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        tool_desc: form.tool_desc || form.tagline,
        tags: form.tags.split(/[，,\s]+/).map((tag) => tag.trim()).filter(Boolean)
      };
      const json = await post('/tool-submissions', payload);
      if (!json.ok) throw new Error(json.error?.message || '提交失败');
      onToast('已提交，等待管理员审核');
      setForm({ submitter_name: '', contact: '', tool_name: '', tagline: '', tool_desc: '', category: '效率 · 办公', tool_url: '', tags: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view active" id="view-creator">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="creator-page">
        <section className="creator-hero">
          <span className="eyebrow">CREATOR CENTER</span>
          <h1>提交你的 AI 工具或工作流</h1>
          <p>用户提交的平台会先进入 pending 审核，管理员 approve 后才会创建正式工作流并展示。</p>
        </section>
        <form className="creator-form" onSubmit={submit}>
          <div className="form-grid">
            <label>提交人<input value={form.submitter_name} onChange={(event) => update('submitter_name', event.target.value)} /></label>
            <label>联系方式<input value={form.contact} onChange={(event) => update('contact', event.target.value)} required /></label>
            <label>工具名称<input value={form.tool_name} onChange={(event) => update('tool_name', event.target.value)} required /></label>
            <label>分类<input value={form.category} onChange={(event) => update('category', event.target.value)} /></label>
            <label>官网链接<input value={form.tool_url} onChange={(event) => update('tool_url', event.target.value)} placeholder="https://" required /></label>
            <label>一句话介绍<input value={form.tagline} onChange={(event) => update('tagline', event.target.value)} /></label>
            <label>标签<input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="OCR, 文档, 营销" /></label>
          </div>
          <label>详细说明<textarea value={form.tool_desc} onChange={(event) => update('tool_desc', event.target.value)} rows={6} /></label>
          {error && <div className="tool-error">{error}</div>}
          <button className="try-btn primary" disabled={loading}>{loading ? '提交中...' : user ? '提交审核' : '登录后提交'}</button>
        </form>
      </main>
    </div>
  );
}
