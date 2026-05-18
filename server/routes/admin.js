const express = require('express');
const router = express.Router();
const {
  pool,
  ok,
  fail,
  slugify,
  createWorkflowId,
  normalizeGallery
} = require('../lib/context');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ==================== 管理后台统计 ====================

router.get('/api/admin/stats', requireAdmin, async (req, res) => {
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
      SELECT
        COUNT(*) FILTER (WHERE clicked_at >= CURRENT_DATE) as today_clicks,
        COUNT(*) FILTER (WHERE clicked_at > NOW() - INTERVAL '7 days') as clicks_7d,
        COUNT(*) as total_real
      FROM clicks
    `);

    const seedClickStats = await pool.query(`
      SELECT
        COALESCE(SUM(seed_clicks), 0) as total_seed,
        COALESCE(SUM(seed_clicks_7d), 0) as seed_7d
      FROM workflows
      WHERE status = 'active'
    `);

    const adStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND applied_at > date_trunc('month', NOW())) as approved_this_month
      FROM ad_applications
    `);

    const toolSubmissionStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM tool_submissions
    `);

    const workflowRanking = await pool.query(`
      SELECT
        w.id, w.name, w.category, w.type, w.target_url, w.rating,
        (w.seed_clicks + COUNT(c.id))::INTEGER as clicks
      FROM workflows w
      LEFT JOIN clicks c ON c.workflow_id = w.id
      WHERE w.status = 'active'
      GROUP BY w.id
      ORDER BY clicks DESC
      LIMIT 10
    `);

    const searchRanking = await pool.query(`
      SELECT search_query, COUNT(*)::INTEGER as clicks
      FROM clicks
      WHERE search_query IS NOT NULL AND BTRIM(search_query) <> ''
      GROUP BY search_query
      ORDER BY clicks DESC
      LIMIT 10
    `);

    const externalRanking = await pool.query(`
      SELECT
        w.id, w.name, w.category, w.target_url,
        (w.seed_clicks + COUNT(c.id))::INTEGER as clicks
      FROM workflows w
      LEFT JOIN clicks c ON c.workflow_id = w.id
      WHERE w.status = 'active' AND w.type = 'recommend'
      GROUP BY w.id
      ORDER BY clicks DESC
      LIMIT 10
    `);

    const u = userStats.rows[0];
    const w = wfStats.rows[0];
    const c = clickStats.rows[0];
    const s = seedClickStats.rows[0];
    const ts = toolSubmissionStats.rows[0];
    const totalClicks = parseInt(s.total_seed) + parseInt(c.total_real);
    const sevenDayClicks = parseInt(s.seed_7d) + parseInt(c.clicks_7d);

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
        today_calls: parseInt(c.today_clicks),
        last_7_days_calls: sevenDayClicks
      },
      clicks: {
        total: totalClicks,
        today: parseInt(c.today_clicks),
        last_7_days: sevenDayClicks
      },
      ad_applications: {
        pending: parseInt(adStats.rows[0].pending),
        approved_this_month: parseInt(adStats.rows[0].approved_this_month)
      },
      tool_submissions: {
        pending: parseInt(ts.pending),
        approved: parseInt(ts.approved),
        rejected: parseInt(ts.rejected)
      },
      rankings: {
        workflows: workflowRanking.rows,
        search_terms: searchRanking.rows,
        external_redirects: externalRanking.rows
      }
    }));
  } catch (err) {
    console.error('GET /api/admin/stats error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 管理后台:工作流管理 ====================

router.get('/api/admin/workflows', requireAdmin, async (req, res) => {
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

router.post('/api/admin/workflows', requireAdmin, async (req, res) => {
  try {
    const {
      name, tagline, description, target_url, type, category, tags,
      price_model, price_amount, cover_color, cover_image_url, logo_url, gallery
    } = req.body;
    if (!name || !target_url || !category) {
      return res.status(400).json(fail('INVALID_PARAMS', '缺少必填字段'));
    }
    try { new URL(target_url); } catch {
      return res.status(400).json(fail('INVALID_PARAMS', 'URL 格式不正确'));
    }
    const workflowId = createWorkflowId('wf');
    const slug = `${slugify(name)}-${workflowId.slice(-6)}`;
    const result = await pool.query(
      `INSERT INTO workflows
        (id, name, slug, tagline, description, category, tags, type, target_url,
         cover_color, logo_url, cover_image_url, gallery, status, rating, review_count,
         price_model, price_amount, is_free, pro_only, examples, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13::jsonb, 'active', 5.0, 0,
         $14, $15, $16, $17, '[]'::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        workflowId,
        name,
        slug,
        tagline || '',
        description || tagline || '',
        category,
        Array.isArray(tags) ? tags : [],
        ['self', 'recommend', 'ad'].includes(type) ? type : 'self',
        target_url,
        cover_color || '#1A5D3A',
        logo_url || cover_image_url || '',
        cover_image_url || logo_url || '',
        JSON.stringify(normalizeGallery(gallery)),
        price_model || 'free',
        price_amount || 0,
        (price_model || 'free') === 'free',
        (price_model || 'free') === 'pro'
      ]
    );
    res.status(201).json(ok({ workflow: result.rows[0] }));
  } catch (err) {
    console.error('POST /api/admin/workflows error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.put('/api/admin/workflows/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, tagline, description, target_url, type, category, tags,
      price_model, price_amount, cover_color, cover_image_url, logo_url, gallery
    } = req.body;
    if (!name || !target_url || !category) {
      return res.status(400).json(fail('INVALID_PARAMS', '缺少必填字段'));
    }
    try { new URL(target_url); } catch {
      return res.status(400).json(fail('INVALID_PARAMS', 'URL 格式不正确'));
    }
    const result = await pool.query(
      `UPDATE workflows
       SET name = $1,
           tagline = $2,
           description = $3,
           category = $4,
           tags = $5,
           type = $6,
           target_url = $7,
           cover_color = $8,
           logo_url = $9,
           cover_image_url = $10,
           gallery = $11::jsonb,
           price_model = $12,
           price_amount = $13,
           is_free = $14,
           pro_only = $15,
           updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        name,
        tagline || '',
        description || tagline || '',
        category,
        Array.isArray(tags) ? tags : [],
        ['self', 'recommend', 'ad'].includes(type) ? type : 'self',
        target_url,
        cover_color || '#1A5D3A',
        logo_url || cover_image_url || '',
        cover_image_url || logo_url || '',
        JSON.stringify(normalizeGallery(gallery)),
        price_model || 'free',
        price_amount || 0,
        (price_model || 'free') === 'free',
        (price_model || 'free') === 'pro',
        id
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '工作流不存在'));
    }
    res.json(ok({ workflow: result.rows[0] }));
  } catch (err) {
    console.error('PUT /api/admin/workflows/:id error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.patch('/api/admin/workflows/:id/status', requireAdmin, async (req, res) => {
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

router.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const requestedUserId = req.user.is_admin && req.query.user_id ? req.query.user_id : req.user.id;
    const query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50';
    const params = [requestedUserId];
    const result = await pool.query(query, params);
    res.json(ok({ notifications: result.rows }));
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 全量数据(兼容前端 getData) ====================

router.get('/api/data', requireAdmin, async (req, res) => {
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
    const toolSubmissions = await pool.query(
      `SELECT * FROM tool_submissions ORDER BY submitted_at DESC`
    );

    res.json(ok({
      workflows: workflows.rows,
      reviews: reviews.rows,
      clicks: clicks.rows,
      ad_applications: adApps.rows,
      ad_slots: adSlots.rows,
      tool_submissions: toolSubmissions.rows
    }));
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});


module.exports = router;
