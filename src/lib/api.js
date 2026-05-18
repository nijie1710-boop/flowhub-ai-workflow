import { getAuthHeaders } from './auth.js';

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
