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

// ==================== 推广位 ====================

router.get('/api/ad-slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_slots ORDER BY daily_impressions DESC');
    res.json(ok({ slots: result.rows }));
  } catch (err) {
    console.error('GET /api/ad-slots error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 推广位申请 ====================

router.get('/api/ad-applications', requireAdmin, async (req, res) => {
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

router.post('/api/ad-applications', async (req, res) => {
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

router.patch('/api/ad-applications/:id/status', requireAdmin, async (req, res) => {
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

// ==================== 外部工具提交审核 ====================

router.post('/api/tool-submissions', requireAuth, async (req, res) => {
  try {
    const {
      submitter_name, contact, tool_name, tool_url, tool_desc, category, tags,
      submission_type, price_model, price_amount, logo_url, gallery
    } = req.body;
    if (!contact || !tool_name || !tool_url) {
      return res.status(400).json(fail('INVALID_PARAMS', '缺少必填字段'));
    }
    try { new URL(tool_url); } catch {
      return res.status(400).json(fail('INVALID_PARAMS', '工具 URL 格式不正确'));
    }
    const submissionType = ['self', 'recommend', 'ad'].includes(submission_type) ? submission_type : 'recommend';

    const result = await pool.query(
      `INSERT INTO tool_submissions
        (submitter_name, contact, tool_name, tool_url, tool_desc, category, tags,
         submission_type, price_model, price_amount, logo_url, gallery, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
       RETURNING *`,
      [
        submitter_name || req.user?.name || '',
        contact,
        tool_name,
        tool_url,
        tool_desc || '',
        category || '其他',
        Array.isArray(tags) ? tags : [],
        submissionType,
        price_model || 'free',
        price_amount || 0,
        String(logo_url || '').slice(0, 2_500_000),
        JSON.stringify(normalizeGallery(gallery)),
        req.user.id
      ]
    );
    res.status(201).json(ok({ submission: result.rows[0] }));
  } catch (err) {
    console.error('POST /api/tool-submissions error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.get('/api/admin/tool-submissions', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json(fail('INVALID_PARAMS', '无效审核状态'));
    }
    const params = [];
    let query = 'SELECT * FROM tool_submissions';
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    query += ' ORDER BY submitted_at DESC';
    const result = await pool.query(query, params);
    res.json(ok({ submissions: result.rows }));
  } catch (err) {
    console.error('GET /api/admin/tool-submissions error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

router.post('/api/admin/tool-submissions/:id/approve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const submissionResult = await client.query(
      `SELECT * FROM tool_submissions WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!submissionResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '提交记录不存在'));
    }
    const submission = submissionResult.rows[0];
    if (submission.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json(fail('INVALID_STATUS', '该提交已处理'));
    }

    const workflowId = createWorkflowId('wf_tool');
    const slug = `${slugify(submission.tool_name)}-${workflowId.slice(-6)}`;
    const submissionType = ['self', 'recommend', 'ad'].includes(submission.submission_type) ? submission.submission_type : 'recommend';
    const workflowType = submissionType === 'self' ? 'self' : 'recommend';
    const priceModel = submission.price_model || (workflowType === 'self' ? 'pro' : 'free');
    const workflowResult = await client.query(
      `INSERT INTO workflows
        (id, name, slug, tagline, description, category, tags, type, target_url,
         cover_color, logo_url, cover_image_url, gallery, status, rating, review_count,
         price_model, price_amount, is_free, pro_only, examples, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13::jsonb, 'active', 4.5, 0,
         $14, $15, $16, $17, '[]'::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        workflowId,
        submission.tool_name,
        slug,
        (submission.tool_desc || '用户提交的外部 AI 工具').slice(0, 80),
        submission.tool_desc || '用户提交的外部 AI 工具',
        submission.category || '其他',
        submission.tags || [],
        workflowType,
        submission.tool_url,
        workflowType === 'self' ? '#1A5D3A' : '#B85C00',
        submission.logo_url || '',
        submission.logo_url || '',
        JSON.stringify(normalizeGallery(submission.gallery)),
        priceModel,
        submission.price_amount || 0,
        priceModel === 'free',
        priceModel === 'pro'
      ]
    );

    const updatedSubmission = await client.query(
      `UPDATE tool_submissions
       SET status = 'approved', workflow_id = $1, reviewed_at = NOW(), admin_note = COALESCE($2, admin_note)
       WHERE id = $3
       RETURNING *`,
      [workflowId, req.body.admin_note || null, id]
    );

    await client.query('COMMIT');
    res.json(ok({ submission: updatedSubmission.rows[0], workflow: workflowResult.rows[0] }));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/admin/tool-submissions/:id/approve error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  } finally {
    client.release();
  }
});

router.post('/api/admin/tool-submissions/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const result = await pool.query(
      `UPDATE tool_submissions
       SET status = 'rejected', admin_note = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [admin_note || '', id]
    );
    if (!result.rows.length) {
      const existing = await pool.query('SELECT status FROM tool_submissions WHERE id = $1', [id]);
      if (!existing.rows.length) {
        return res.status(404).json(fail('RESOURCE_NOT_FOUND', '提交记录不存在'));
      }
      return res.status(400).json(fail('INVALID_STATUS', '该提交已处理'));
    }
    res.json(ok({ submission: result.rows[0] }));
  } catch (err) {
    console.error('POST /api/admin/tool-submissions/:id/reject error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});


module.exports = router;
