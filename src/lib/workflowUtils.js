export function escapeText(value) {
  return String(value ?? '');
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

export function getWorkflowLogo(workflow) {
  return workflow?.logo_url || workflow?.cover_image_url || '';
}

export function getWorkflowCta(workflow) {
  if (workflow.type === 'recommend') return '访问官网';
  return '立即使用';
}

export function getWorkflowTypeLabel(workflow) {
  return workflow.type === 'recommend' ? '外部工具' : '站内工作流';
}

export function getPriceLabel(workflow) {
  if (workflow.price_model === 'free') return '免费';
  if (workflow.price_model === 'pro') return 'Pro';
  if (workflow.price_model === 'cpc') return `CPC ¥${workflow.price_amount || 0}`;
  if (workflow.price_model === 'cps') return 'CPS';
  return '推荐';
}

export function isPromoted(workflow) {
  return workflow.type === 'recommend' && ['cpc', 'cps', 'package'].includes(workflow.price_model);
}

export function workflowInitial(workflow) {
  return (workflow?.name || 'F').trim().charAt(0);
}

export function getClickCount(workflow, clickStats) {
  if (clickStats?.by_workflow?.[workflow.id] !== undefined) return clickStats.by_workflow[workflow.id];
  return workflow.seed_clicks || 0;
}

export function filterWorkflows(workflows, { query = '', category = '全部', type = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  return workflows.filter((workflow) => {
    if (category !== '全部' && workflow.category !== category) return false;
    if (type === 'self' && workflow.type !== 'self') return false;
    if (type === 'external' && workflow.type !== 'recommend') return false;
    if (!q) return true;
    const haystack = [
      workflow.name,
      workflow.tagline,
      workflow.description,
      workflow.category,
      ...(workflow.tags || [])
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function buildAttributedUrl(workflow, userId = 'guest') {
  const rawUrl = workflow.target_url || workflow.external_url || '#';
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('from', 'flowhub');
    url.searchParams.set('wf_id', workflow.id);
    url.searchParams.set('uid', userId || 'guest');
    return url.toString();
  } catch {
    return rawUrl;
  }
}
