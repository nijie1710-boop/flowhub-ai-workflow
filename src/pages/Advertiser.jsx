import TopNav from '../components/TopNav.jsx';
import { useState } from 'react';
import { post } from '../lib/api.js';

const slots = [
  ['首页精选 Banner', '18,000 / 日', '¥3,000 / 周'],
  ['搜索结果推广', '12,000 / 日', 'CPC ¥0.8 起'],
  ['详情页侧栏', '8,800 / 日', '¥1,200 / 周'],
  ['分类页推荐', '9,600 / 日', 'CPC ¥0.5 起'],
  ['邮件周报位', '5,000 / 期', '¥800 / 期']
];

export default function Advertiser({ user, onNavigate, onLoginClick, onToast }) {
  const [form, setForm] = useState({
    advertiser_name: '',
    contact: '',
    workflow_name: '',
    workflow_url: '',
    workflow_desc: '',
    slot: '首页精选 Banner',
    price_model: 'cpc',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const json = await post('/ad-applications', form);
      if (!json.ok) throw new Error(json.error?.message || '提交失败');
      onToast('投放申请已提交');
      setForm({
        advertiser_name: '',
        contact: '',
        workflow_name: '',
        workflow_url: '',
        workflow_desc: '',
        slot: form.slot,
        price_model: 'cpc',
        price: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view active" id="view-advertiser">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="advertiser-page">
        <section className="creator-hero">
          <span className="eyebrow">AD PLACEMENT</span>
          <h1>AI 工具推广位</h1>
          <p>第三方工具可以通过 CPC、CPS 或包位方式获得精准 AI 工具用户流量。</p>
        </section>
        <div className="ad-slot-grid">
          {slots.map(([name, impressions, price]) => (
            <div className="ad-slot-card" key={name}>
              <h3>{name}</h3>
              <p>{impressions}</p>
              <strong>{price}</strong>
              <button className="try-btn" onClick={() => update('slot', name)}>选择该位置</button>
            </div>
          ))}
        </div>
        <form className="creator-form ad-application-form" onSubmit={submit}>
          <h2>提交投放申请</h2>
          <div className="form-grid">
            <label>公司/品牌名<input value={form.advertiser_name} onChange={(event) => update('advertiser_name', event.target.value)} required /></label>
            <label>联系方式<input value={form.contact} onChange={(event) => update('contact', event.target.value)} required /></label>
            <label>工具名称<input value={form.workflow_name} onChange={(event) => update('workflow_name', event.target.value)} /></label>
            <label>工具链接<input value={form.workflow_url} onChange={(event) => update('workflow_url', event.target.value)} placeholder="https://" /></label>
            <label>推广位
              <select value={form.slot} onChange={(event) => update('slot', event.target.value)}>
                {slots.map(([name]) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>计费方式
              <select value={form.price_model} onChange={(event) => update('price_model', event.target.value)}>
                <option value="cpc">CPC</option>
                <option value="cps">CPS</option>
                <option value="package">包位</option>
              </select>
            </label>
          </div>
          <label>工具介绍<textarea rows={5} value={form.workflow_desc} onChange={(event) => update('workflow_desc', event.target.value)} /></label>
          {error && <div className="tool-error">{error}</div>}
          <button className="try-btn primary" disabled={loading}>{loading ? '提交中...' : '提交申请'}</button>
        </form>
      </main>
    </div>
  );
}
