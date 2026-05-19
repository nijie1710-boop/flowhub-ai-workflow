import { getAuthHeaders } from './auth.js';
import { getSeedWorkflows } from './seedData.js';

export const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:3001/api'
  : '/api';

async function parseJsonResponse(resp) {
  const json = await resp.json().catch(() => ({ ok: false, error: { message: '响应格式错误' } }));
  if (!resp.ok && json.ok !== false) {
    return { ok: false, error: { code: `HTTP_${resp.status}`, message: resp.statusText || '请求失败' } };
  }
  return json;
}

export async function request(path, options = {}) {
  const resp = await fetch(API_BASE + path, {
    ...options,
    headers: getAuthHeaders(options.headers || {})
  });
  return parseJsonResponse(resp);
}

export function get(path) {
  return request(path);
}

export function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function patch(path, body) {
  return request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function put(path, body) {
  return request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function postForm(path, formData) {
  const resp = await fetch(API_BASE + path, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });
  return parseJsonResponse(resp);
}

function normalizeWorkflow(workflow) {
  return {
    ...workflow,
    type: workflow.type === 'ad' ? 'recommend' : workflow.type,
    tags: Array.isArray(workflow.tags) ? workflow.tags : [],
    gallery: Array.isArray(workflow.gallery) ? workflow.gallery : [],
    examples: Array.isArray(workflow.examples) ? workflow.examples : [],
    rating: Number(workflow.rating || 0),
    review_count: Number(workflow.review_count || 0),
    seed_clicks: Number(workflow.seed_clicks || 0),
    seed_clicks_7d: Number(workflow.seed_clicks_7d || 0),
    price_amount: Number(workflow.price_amount || 0),
    logo_url: workflow.logo_url || workflow.cover_image_url || '',
    cover_image_url: workflow.cover_image_url || ''
  };
}

export async function listWorkflows() {
  try {
    const json = await get('/workflows?limit=100');
    if (json.ok && Array.isArray(json.data?.workflows) && json.data.workflows.length > 0) {
      const apiWorkflows = json.data.workflows.map(normalizeWorkflow);
      const existingIds = new Set(apiWorkflows.map((workflow) => workflow.id));
      const requiredSelfSeeds = getSeedWorkflows()
        .filter((workflow) => workflow.type === 'self' && !existingIds.has(workflow.id));
      return {
        workflows: [...apiWorkflows, ...requiredSelfSeeds],
        source: 'api'
      };
    }
  } catch (err) {
    console.warn('[FlowHub] workflows API unavailable, using seed data:', err.message);
  }
  return {
    workflows: getSeedWorkflows(),
    source: 'seed'
  };
}

export async function getClickStats() {
  try {
    const json = await get('/clicks/stats');
    if (json.ok) return json.data;
  } catch (err) {
    console.warn('[FlowHub] click stats unavailable:', err.message);
  }
  return null;
}

export async function getReviews(workflowId) {
  try {
    const json = await get(`/workflows/${encodeURIComponent(workflowId)}/reviews?limit=50`);
    if (json.ok) return json.data.reviews || [];
  } catch (err) {
    console.warn('[FlowHub] reviews unavailable:', err.message);
  }
  return [];
}

export function trackWorkflowClick(workflowId, payload = {}) {
  return post(`/workflows/${encodeURIComponent(workflowId)}/click`, payload).catch((err) => {
    console.warn('[FlowHub] click tracking failed:', err.message);
    return { ok: false };
  });
}

export function runFitnessMeal(input) {
  return post('/tools/fitness-meal', input);
}

export function runWebpageMarkdown(url) {
  return post('/tools/webpage-markdown', { url });
}

export function runDocumentMarkdown(file) {
  const form = new FormData();
  form.append('file', file);
  return postForm('/tools/document-markdown', form);
}

export function runImageOcr(file, lang = 'chi_sim+eng') {
  const form = new FormData();
  form.append('file', file);
  form.append('lang', lang);
  return postForm('/tools/image-ocr', form);
}

export async function loadAdminSnapshot() {
  const json = await get('/data');
  if (!json.ok) throw new Error(json.error?.message || '后台数据加载失败');
  return json.data;
}

export async function loadAdminStats() {
  const json = await get('/admin/stats');
  if (!json.ok) throw new Error(json.error?.message || '后台统计加载失败');
  return json.data;
}

export function updateAdminWorkflow(id, workflow) {
  return put(`/admin/workflows/${encodeURIComponent(id)}`, workflow);
}

export function approveToolSubmission(id) {
  return post(`/admin/tool-submissions/${encodeURIComponent(id)}/approve`, {});
}

export function rejectToolSubmission(id, adminNote) {
  return post(`/admin/tool-submissions/${encodeURIComponent(id)}/reject`, { admin_note: adminNote });
}
