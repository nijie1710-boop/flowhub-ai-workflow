const express = require('express');
const router = express.Router();
const {
  pool,
  ok,
  fail
} = require('../lib/context');
const { optionalAuth } = require('../middleware/auth');

// ==================== 调用记录(点击) ====================

router.post('/api/workflows/:id/click', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { source, search_query } = req.body;
    const clickUserId = req.user?.id || null;

    const wf = await pool.query('SELECT id, type, target_url FROM workflows WHERE id = $1', [id]);
    if (!wf.rows.length) {
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '工作流不存在'));
    }

    await pool.query(
      `INSERT INTO clicks (workflow_id, user_id, source, search_query, clicked_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, clickUserId, source || null, search_query || null]
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

router.get('/api/clicks/stats', async (req, res) => {
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


module.exports = router;
