try {
  require('dotenv').config();
} catch {
  // Environment variables can also be injected by Vercel or another host.
}

const express = require('express');
const cors = require('cors');
const { pool, ok, fail } = require('./lib/context');
const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const clickRoutes = require('./routes/clicks');
const reviewRoutes = require('./routes/reviews');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const toolRoutes = require('./routes/tools');
const {
  authLimiter,
  clickLimiter,
  reviewLimiter,
  adminLimiter
} = require('./middleware/rateLimiters');

const app = express();

app.set('trust proxy', 1);

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'https://flowhub-ai-workflow.vercel.app',
  'https://flowhub-ai-workflow-nijie1710-7329s-projects.vercel.app',
  'https://flowhub-ai-workflow-git-main-nijie1710-7329s-projects.vercel.app'
];

const allowedOrigins = (process.env.CORS_ORIGIN || DEFAULT_ALLOWED_ORIGINS.join(','))
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '20mb' }));

app.use('/api/auth', authLimiter);
app.use(/^\/api\/workflows\/[^/]+\/click$/, clickLimiter);
app.use('/api/clicks', clickLimiter);
app.use(/^\/api\/workflows\/[^/]+\/reviews$/, reviewLimiter);
app.use('/api/admin', adminLimiter);

app.use(authRoutes);
app.use(workflowRoutes);
app.use(clickRoutes);
app.use(reviewRoutes);
app.use(submissionRoutes);
app.use(adminRoutes);
app.use(toolRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json(ok({ status: 'healthy', timestamp: new Date().toISOString() }));
  } catch (err) {
    res.status(500).json(fail('DB_ERROR', '数据库连接失败'));
  }
});

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    res.status(403).json(fail('CORS_FORBIDDEN', '当前来源不允许访问 API'));
    return;
  }
  next(err);
});

module.exports = app;
