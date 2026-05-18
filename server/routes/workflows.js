const express = require('express');
const router = express.Router();
const {
  pool,
  ok,
  fail
} = require('../lib/context');

// ==================== 工作流 ====================

router.get('/api/workflows', async (req, res) => {
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
              cover_color, cover_image_url, logo_url, gallery, rating, review_count, seed_clicks, seed_clicks_7d,
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

router.get('/api/workflows/:id', async (req, res) => {
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


module.exports = router;
