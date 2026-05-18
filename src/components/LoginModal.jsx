import { useState } from 'react';
import { post } from '../lib/api.js';
import { setToken } from '../lib/auth.js';

export default function LoginModal({ onClose, onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const json = await post('/auth/send-code', { email });
      if (!json.ok) throw new Error(json.error?.message || '验证码发送失败');
      setNotice('验证码已发送，5 分钟内有效。');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = mode === 'register'
        ? { email, password, name }
        : mode === 'forgot'
          ? { email, code, mode: 'email_code' }
          : { email, password };
      const json = await post(`/auth/${mode === 'register' ? 'register' : 'login'}`, payload);
      if (!json.ok) throw new Error(json.error?.message || '登录失败');
      setToken(json.data.token);
      onAuthed(json.data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-bg show" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <form className="auth-form" onSubmit={submit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 26 }}>{mode === 'register' ? '注册 FlowHub' : '登录 FlowHub'}</h2>
            <button type="button" className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
          </div>
          <div className="auth-tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>
          </div>
          {mode === 'forgot' && (
            <div className="auth-note">
              忘记密码时使用邮箱验证码登录；正常登录默认使用邮箱和密码。
            </div>
          )}
          {mode === 'register' && (
            <label>
              昵称
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的名字" />
            </label>
          )}
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          </label>
          {mode === 'forgot' ? (
            <label>
              验证码
              <div className="auth-code-row">
                <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 位验证码" required />
                <button type="button" className="try-btn" onClick={sendCode} disabled={loading || !email}>获取验证码</button>
              </div>
            </label>
          ) : (
            <label>
              密码
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" required />
            </label>
          )}
          {mode === 'login' && (
            <button type="button" className="auth-link-btn" onClick={() => setMode('forgot')}>忘记密码？用邮箱验证码登录</button>
          )}
          {mode === 'forgot' && (
            <button type="button" className="auth-link-btn" onClick={() => setMode('login')}>返回密码登录</button>
          )}
          {notice && <div className="auth-note success">{notice}</div>}
          {error && <div className="tool-error">{error}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? '处理中...' : mode === 'register' ? '注册并登录' : mode === 'forgot' ? '邮箱验证码登录' : '登录'}</button>
        </form>
      </div>
    </div>
  );
}
