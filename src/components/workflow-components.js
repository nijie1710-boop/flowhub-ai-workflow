/* Shared FlowHub UI components used by the static page shell. */

function flowhubComponentEscapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderBrandMark(className = 'brand-mark') {
  return `<img class="${flowhubComponentEscapeHtml(className)}" src="/assets/flowhub-mark.png" alt="" aria-hidden="true">`;
}

function renderWorkflowIcon(wf, cls) {
  const logo = typeof getWorkflowLogo === 'function'
    ? getWorkflowLogo(wf)
    : (wf && (wf.logo_url || wf.cover_image_url || ''));
  const color = wf?.cover_color || '#1A5D3A';
  const style = `background:${color}22; color:${color}`;
  if (logo) {
    return `<div class="${flowhubComponentEscapeHtml(cls)}" style="${style}"><img src="${flowhubComponentEscapeHtml(logo)}" alt="${flowhubComponentEscapeHtml(wf.name)} logo"></div>`;
  }
  return `<div class="${flowhubComponentEscapeHtml(cls)}" style="${style}">${flowhubComponentEscapeHtml((wf?.name || 'F').charAt(0))}</div>`;
}

function renderMediaPreview(items, emptyText) {
  const list = (items || []).filter(item => item && item.url);
  if (!list.length) {
    return `<div style="font-size:12px;color:var(--ink-3);margin-top:8px">${flowhubComponentEscapeHtml(emptyText || '暂无图片')}</div>`;
  }
  return `
    <div class="media-preview-grid">
      ${list.map((item, index) => `
        <div class="media-preview-card">
          <img src="${flowhubComponentEscapeHtml(item.url)}" alt="${flowhubComponentEscapeHtml(item.label || 'media')}">
          <span>${flowhubComponentEscapeHtml(item.label || ('图片 ' + (index + 1)))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

window.FlowHubComponents = {
  renderBrandMark,
  renderWorkflowIcon,
  renderMediaPreview
};
