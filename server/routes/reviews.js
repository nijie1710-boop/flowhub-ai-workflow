const express = require('express');
const router = express.Router();
const {
  pool,
  ok,
  fail
} = require('../lib/context');
const { requireAuth } = require('../middleware/auth');

// ==================== 评价 ====================

router.get('/api/workflows/:id/reviews', async (req, res) => {
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

router.post('/api/workflows/:id/reviews', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, avatar, rating, text } = req.body;
    const displayName = user_name || req.user?.name || '匿名用户';
    const displayAvatar = avatar || (displayName ? displayName.slice(0, 1) : '匿');

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(fail('INVALID_PARAMS', '评分必须是 1-5'));
    }

    const result = await pool.query(
      `INSERT INTO reviews (workflow_id, user_id, user_name, avatar, rating, text, date)
       VALUES ($1, $2, $3, $4, $5, $6, '刚刚') RETURNING id`,
      [id, req.user.id, displayName, displayAvatar, rating, text || '']
    );

    res.status(201).json(ok({ review_id: result.rows[0].id }));
  } catch (err) {
    console.error('POST /api/workflows/:id/reviews error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});


module.exports = router;
