const { pool, fail } = require('../lib/context');

async function getUserFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
  return result.rows[0] || null;
}

async function optionalAuth(req, res, next) {
  try {
    req.user = await getUserFromToken(req);
    next();
  } catch (err) {
    console.error('optional auth error:', err.message);
    next();
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json(fail('UNAUTHORIZED', '未登录'));
    req.user = user;
    next();
  } catch (err) {
    console.error('auth error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
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

module.exports = { getUserFromToken, optionalAuth, requireAuth, requireAdmin };
