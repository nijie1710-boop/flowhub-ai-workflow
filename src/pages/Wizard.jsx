import TopNav from '../components/TopNav.jsx';

export default function Wizard({ user, onNavigate, onLoginClick }) {
  return (
    <div className="view active" id="view-wizard">
      <TopNav user={user} onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <main className="wizard-page">
        <section className="creator-hero">
          <span className="eyebrow">API WIZARD</span>
          <h1>FlowHub 接入向导</h1>
          <p>外部工具接入 FlowHub 推荐位时需要带归因参数，并提供基础转化回传。</p>
        </section>
        <div className="wizard-steps">
          {[
            ['注册工具', '提交官网、Logo、分类和定价方式。'],
            ['审核配置', '管理员审核后生成正式 workflow/tool。'],
            ['带参跳转', '外跳链接自动附加 from=flowhub、wf_id、uid。'],
            ['数据统计', 'clicks 表记录 source、search_query 和 clicked_at。']
          ].map(([title, desc], index) => (
            <div className="wizard-step" key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
        <pre className="tool-markdown">{`GET /api/workflows\nPOST /api/workflows/:id/click\nPOST /api/tool-submissions\nGET /api/admin/stats`}</pre>
      </main>
    </div>
  );
}
