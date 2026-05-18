const express = require('express');
const router = express.Router();
const {
  pool,
  crypto,
  mailTransport,
  SMTP_FROM,
  verifyCodeStore,
  generateCode,
  setCode,
  checkCode,
  ok,
  fail,
  hashPassword,
  verifyPassword
} = require('../lib/context');
const { requireAuth } = require('../middleware/auth');

// ==================== 用户认证 ====================

router.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }

    const existing = verifyCodeStore.get(email);
    if (existing && Date.now() - (existing.expires - 5 * 60 * 1000) < 60 * 1000) {
      return res.status(429).json(fail('RATE_LIMIT', '请 60 秒后再试'));
    }

    const code = generateCode();
    setCode(email, code);

    await mailTransport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'FlowHub 验证码',
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#FAFAF7;border-radius:12px">
        <h2 style="color:#0F0F0E;margin:0 0 16px">FlowHub 验证码</h2>
        <p style="color:#666;font-size:14px;margin:0 0 24px">你的验证码是：</p>
        <div style="background:#1A5D3A;color:#fff;font-size:28px;letter-spacing:8px;text-align:center;padding:16px;border-radius:8px;font-family:monospace">${code}</div>
        <p style="color:#999;font-size:12px;margin:24px 0 0">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>`
    });

    res.json(ok({ sent: true }));
  } catch (err) {
    console.error('POST /api/auth/send-code error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '验证码发送失败，请稍后重试'));
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, code, mode } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }

    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(404).json(fail('USER_NOT_FOUND', '该邮箱未注册，请先注册'));
    }

    const user = result.rows[0];
    if (mode === 'email_code' || code) {
      if (!code || code.length !== 6) {
        return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
      }
      if (!checkCode(email, code)) {
        return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
      }
    } else {
      if (!password) return res.status(400).json(fail('INVALID_PARAMS', '请输入密码'));
      if (!verifyPassword(password, user.password_hash)) {
        return res.status(401).json(fail('INVALID_PASSWORD', user.password_hash ? '密码不正确' : '该账号还没有设置密码，请使用忘记密码邮箱验证登录'));
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE users SET token = $1, token_created_at = NOW(), last_seen_at = NOW() WHERE id = $2',
      [token, user.id]
    );

    const role = user.is_admin ? 'admin' : (user.is_creator ? 'creator' : 'user');
    res.json(ok({
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, role, created_at: user.created_at },
      token
    }));
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, code, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }
    if (password) {
      if (password.length < 6) return res.status(400).json(fail('INVALID_PARAMS', '密码至少 6 位'));
    } else {
      if (!code || code.length !== 6) {
        return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
      }
      if (!checkCode(email, code)) {
        return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
      }
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json(fail('USER_EXISTS', '该邮箱已注册'));
    }

    const token = crypto.randomBytes(32).toString('hex');
    const userName = name || ('用户' + email.split('@')[0].slice(-4));
    const passwordHash = password ? hashPassword(password) : null;

    const result = await pool.query(
      `INSERT INTO users (email, name, tier, password_hash, token, token_created_at, created_at)
       VALUES ($1, $2, 'free', $3, $4, NOW(), NOW()) RETURNING id`,
      [email, userName, passwordHash, token]
    );

    res.status(201).json(ok({
      user: { id: result.rows[0].id, email, name: userName, tier: 'free', role: 'user', created_at: new Date().toISOString() },
      token
    }));
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    if (err.code === '23505') return res.status(409).json(fail('USER_EXISTS', '该邮箱已注册'));
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const role = user.is_admin ? 'admin' : (user.is_creator ? 'creator' : 'user');
    res.json(ok({
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, role, created_at: user.created_at }
    }));
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});


module.exports = router;
