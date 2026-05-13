try {
  require('dotenv').config();
} catch {
  // dotenv is optional in production when env vars are injected by the host.
}

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '5mb' }));

// ==================== 邮箱验证码 ====================

const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('SMTP_USER/SMTP_PASS is not set; email verification will fail until configured.');
}

const SMTP_FROM = process.env.SMTP_FROM
  || (process.env.SMTP_USER ? `"FlowHub" <${process.env.SMTP_USER}>` : '"FlowHub" <no-reply@flowhub.local>');

const verifyCodeStore = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setCode(email, code) {
  verifyCodeStore.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });
}

function checkCode(email, code) {
  const entry = verifyCodeStore.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) { verifyCodeStore.delete(email); return false; }
  if (entry.code !== code) return false;
  verifyCodeStore.delete(email);
  return true;
}

function ok(data) { return { ok: true, data }; }
function fail(code, message, details) {
  return { ok: false, error: { code, message, ...(details && { details }) } };
}

async function getUserFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
  return result.rows[0] || null;
}

async function requireAdmin(req, res, next) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json(fail('UNAUTHORIZED', '未登录'));
    if (!user.is_admin) return res.status(403).json(fail('FORBIDDEN', '无管理员权限'));
    req.user = user;
    next();
  } catch (err) {
    console.error('admin auth error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
}

// ==================== 工作流 ====================

app.get('/api/workflows', async (req, res) => {
  try {
    const { category, type, search, sort, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ["status = 'active'"];
    let idx = 1;

    if (category && category !== '全部') {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (type) {
      conditions.push(`type = $${idx++}`);
      params.push(type);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR tagline ILIKE $${idx} OR description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY created_at DESC';
    if (sort === 'popular') orderBy = 'ORDER BY seed_clicks DESC';
    else if (sort === 'rating') orderBy = 'ORDER BY rating DESC';
    else if (sort === 'new') orderBy = 'ORDER BY created_at DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM workflows ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT id, name, slug, tagline, description, category, tags, type, target_url, external_url,
              cover_color, cover_image_url, rating, review_count, seed_clicks, seed_clicks_7d,
              is_free, pro_only, price_model, price_amount, cost_per_call, examples, status, created_at
       FROM workflows ${where} ${orderBy}
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json(ok({
      workflows: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        has_more: offset + result.rows.length < total
      }
    }));
  } catch (err) {
    console.error('GET /api/workflows error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM workflows WHERE id = $1 OR slug = $1`, [id]
    );
    if (!result.rows.length) {
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '工作流不存在'));
    }
    res.json(ok({ workflow: result.rows[0] }));
  } catch (err) {
    console.error('GET /api/workflows/:id error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 调用记录(点击) ====================

app.post('/api/workflows/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, search_query, user_id } = req.body;

    const wf = await pool.query('SELECT id, type, target_url FROM workflows WHERE id = $1', [id]);
    if (!wf.rows.length) {
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '工作流不存在'));
    }

    await pool.query(
      `INSERT INTO clicks (workflow_id, user_id, source, search_query) VALUES ($1, $2, $3, $4)`,
      [id, user_id || null, source || null, search_query || null]
    );

    const workflow = wf.rows[0];
    if (workflow.type === 'recommend' && workflow.target_url) {
      res.json(ok({ type: 'redirect', url: workflow.target_url }));
    } else {
      res.json(ok({ type: 'execute', workflow_id: id }));
    }
  } catch (err) {
    console.error('POST /api/workflows/:id/click error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.get('/api/clicks/stats', async (req, res) => {
  try {
    const totalResult = await pool.query(`
      SELECT w.id, w.seed_clicks, COUNT(c.id) as real_clicks
      FROM workflows w
      LEFT JOIN clicks c ON c.workflow_id = w.id
      WHERE w.status = 'active'
      GROUP BY w.id
    `);

    const stats = {};
    let totalAll = 0;
    for (const row of totalResult.rows) {
      const count = (row.seed_clicks || 0) + parseInt(row.real_clicks || 0);
      stats[row.id] = count;
      totalAll += count;
    }

    const sevenDayResult = await pool.query(`
      SELECT w.id, w.seed_clicks_7d, COUNT(c.id) as real_clicks
      FROM workflows w
      LEFT JOIN clicks c ON c.workflow_id = w.id AND c.clicked_at > NOW() - INTERVAL '7 days'
      WHERE w.status = 'active'
      GROUP BY w.id
    `);

    const stats7d = {};
    for (const row of sevenDayResult.rows) {
      stats7d[row.id] = (row.seed_clicks_7d || 0) + parseInt(row.real_clicks || 0);
    }

    res.json(ok({ total: totalAll, by_workflow: stats, by_workflow_7d: stats7d }));
  } catch (err) {
    console.error('GET /api/clicks/stats error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 评价 ====================

app.get('/api/workflows/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { sort = 'newest', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let orderBy = 'ORDER BY created_at DESC';
    if (sort === 'helpful') orderBy = 'ORDER BY helpful_count DESC';
    else if (sort === 'rating') orderBy = 'ORDER BY rating DESC';

    const result = await pool.query(
      `SELECT id, user_name, avatar, rating, text, helpful_count, reply, reply_at, date, created_at
       FROM reviews WHERE workflow_id = $1 ${orderBy}
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE workflow_id = $1', [id]
    );

    res.json(ok({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].count)
    }));
  } catch (err) {
    console.error('GET /api/workflows/:id/reviews error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.post('/api/workflows/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, avatar, rating, text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(fail('INVALID_PARAMS', '评分必须是 1-5'));
    }

    const result = await pool.query(
      `INSERT INTO reviews (workflow_id, user_name, avatar, rating, text, date)
       VALUES ($1, $2, $3, $4, $5, '刚刚') RETURNING id`,
      [id, user_name || '匿名用户', avatar || '匿', rating, text || '']
    );

    res.status(201).json(ok({ review_id: result.rows[0].id }));
  } catch (err) {
    console.error('POST /api/workflows/:id/reviews error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 推广位 ====================

app.get('/api/ad-slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_slots ORDER BY daily_impressions DESC');
    res.json(ok({ slots: result.rows }));
  } catch (err) {
    console.error('GET /api/ad-slots error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 推广位申请 ====================

app.get('/api/ad-applications', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM ad_applications';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY applied_at DESC';
    const result = await pool.query(query, params);
    res.json(ok({ applications: result.rows }));
  } catch (err) {
    console.error('GET /api/ad-applications error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.post('/api/ad-applications', async (req, res) => {
  try {
    const { advertiser_name, contact, workflow_name, workflow_url, workflow_desc, slot, price_model, price } = req.body;
    if (!advertiser_name || !contact || !slot) {
      return res.status(400).json(fail('INVALID_PARAMS', '缺少必填字段'));
    }
    const result = await pool.query(
      `INSERT INTO ad_applications (advertiser_name, contact, workflow_name, workflow_url, workflow_desc, slot, price_model, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [advertiser_name, contact, workflow_name || '', workflow_url || '', workflow_desc || '', slot, price_model || 'cpc', price || 0]
    );
    res.status(201).json(ok({ application_id: result.rows[0].id }));
  } catch (err) {
    console.error('POST /api/ad-applications error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.patch('/api/ad-applications/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'approved', 'rejected', 'paid', 'active', 'expired'];
    if (!valid.includes(status)) {
      return res.status(400).json(fail('INVALID_PARAMS', '无效状态'));
    }
    await pool.query('UPDATE ad_applications SET status = $1 WHERE id = $2', [status, id]);
    res.json(ok({ id, status }));
  } catch (err) {
    console.error('PATCH /api/ad-applications/:id/status error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 管理后台统计 ====================

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const userStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE tier = 'pro') as pro,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as new_today
      FROM users
    `);

    const wfStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'reviewing') as reviewing,
        COUNT(*) as total
      FROM workflows
    `);

    const clickStats = await pool.query(`
      SELECT COUNT(*) as today_clicks FROM clicks WHERE clicked_at > CURRENT_DATE
    `);

    const totalSeedClicks = await pool.query(`
      SELECT COALESCE(SUM(seed_clicks), 0) as total_seed FROM workflows WHERE status = 'active'
    `);

    const totalRealClicks = await pool.query(`
      SELECT COUNT(*) as total_real FROM clicks
    `);

    const adStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND applied_at > date_trunc('month', NOW())) as approved_this_month
      FROM ad_applications
    `);

    const u = userStats.rows[0];
    const w = wfStats.rows[0];
    const totalClicks = parseInt(totalSeedClicks.rows[0].total_seed) + parseInt(totalRealClicks.rows[0].total_real);

    res.json(ok({
      users: {
        total: parseInt(u.total),
        pro: parseInt(u.pro),
        new_today: parseInt(u.new_today)
      },
      workflows: {
        active: parseInt(w.active),
        reviewing: parseInt(w.reviewing),
        total_calls: totalClicks,
        today_calls: parseInt(clickStats.rows[0].today_clicks)
      },
      ad_applications: {
        pending: parseInt(adStats.rows[0].pending),
        approved_this_month: parseInt(adStats.rows[0].approved_this_month)
      }
    }));
  } catch (err) {
    console.error('GET /api/admin/stats error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 管理后台:工作流管理 ====================

app.get('/api/admin/workflows', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM workflows';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(ok({ workflows: result.rows }));
  } catch (err) {
    console.error('GET /api/admin/workflows error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.patch('/api/admin/workflows/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['draft', 'reviewing', 'active', 'rejected', 'archived'];
    if (!valid.includes(status)) {
      return res.status(400).json(fail('INVALID_PARAMS', '无效状态'));
    }
    await pool.query('UPDATE workflows SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    res.json(ok({ id, status }));
  } catch (err) {
    console.error('PATCH /api/admin/workflows/:id/status error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 通知 ====================

app.get('/api/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = 'SELECT * FROM notifications';
    const params = [];
    if (user_id) {
      query += ' WHERE user_id = $1';
      params.push(user_id);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await pool.query(query, params);
    res.json(ok({ notifications: result.rows }));
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 全量数据(兼容前端 getData) ====================

app.get('/api/data', requireAdmin, async (req, res) => {
  try {
    const workflows = await pool.query(
      `SELECT * FROM workflows WHERE status = 'active' ORDER BY created_at DESC`
    );
    const reviews = await pool.query(
      `SELECT * FROM reviews ORDER BY created_at DESC`
    );
    const adApps = await pool.query(
      `SELECT * FROM ad_applications ORDER BY applied_at DESC`
    );
    const adSlots = await pool.query(
      `SELECT * FROM ad_slots ORDER BY daily_impressions DESC`
    );
    const clicks = await pool.query(
      `SELECT * FROM clicks ORDER BY clicked_at DESC LIMIT 1000`
    );

    res.json(ok({
      workflows: workflows.rows,
      reviews: reviews.rows,
      clicks: clicks.rows,
      ad_applications: adApps.rows,
      ad_slots: adSlots.rows
    }));
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 用户认证 ====================

app.post('/api/auth/send-code', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }
    if (!code || code.length !== 6) {
      return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
    }
    if (!checkCode(email, code)) {
      return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
    }

    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(404).json(fail('USER_NOT_FOUND', '该邮箱未注册，请先注册'));
    }

    const user = result.rows[0];
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }
    if (!code || code.length !== 6) {
      return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
    }
    if (!checkCode(email, code)) {
      return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json(fail('USER_EXISTS', '该邮箱已注册'));
    }

    const token = crypto.randomBytes(32).toString('hex');
    const userName = name || ('用户' + email.split('@')[0].slice(-4));

    const result = await pool.query(
      `INSERT INTO users (email, name, tier, token, token_created_at, created_at)
       VALUES ($1, $2, 'free', $3, NOW(), NOW()) RETURNING id`,
      [email, userName, token]
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

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json(fail('UNAUTHORIZED', '未登录'));

    const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
    if (!result.rows.length) return res.status(401).json(fail('UNAUTHORIZED', 'token 无效'));

    const user = result.rows[0];
    const role = user.is_admin ? 'admin' : (user.is_creator ? 'creator' : 'user');
    res.json(ok({
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, role, created_at: user.created_at }
    }));
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 健康检查 ====================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json(ok({ status: 'healthy', timestamp: new Date().toISOString() }));
  } catch (err) {
    res.status(500).json(fail('DB_ERROR', '数据库连接失败'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FlowHub API running on port ${PORT}`);
});
