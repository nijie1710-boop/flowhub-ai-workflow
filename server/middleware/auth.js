const { pool, fail } = require('../lib/context');

const TOKEN_TTL_DAYS = parseInt(process.env.AUTH_TOKEN_TTL_DAYS || '7', 10);

function isTokenExpired(user) {
  if (!user.token_created_at) return true;
  const createdAt = new Date(user.token_created_at).getTime();
  if (!Number.isFinite(createdAt)) return true;
  return Date.now() - createdAt > TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

async function getUserFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
  const user = result.rows[0] || null;
  if (!user) return null;
  if (isTokenExpired(user)) {
    await pool.query('UPDATE users SET token = NULL, token_created_at = NULL WHERE id = $1', [user.id]);
    req.authExpired = true;
    return null;
  }
  return user;
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
    if (!user) {
      const code = req.authExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
      const message = req.authExpired ? '登录已过期，请重新登录' : '未登录';
      return res.status(401).json(fail(code, message));
    }
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
    if (!user) {
      const code = req.authExpired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED';
      const message = req.authExpired ? '登录已过期，请重新登录' : '未登录';
      return res.status(401).json(fail(code, message));
    }
    if (!user.is_admin) return res.status(403).json(fail('FORBIDDEN', '无管理员权限'));
    req.user = user;
    next();
  } catch (err) {
    console.error('admin auth error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
}

module.exports = { getUserFromToken, optionalAuth, requireAuth, requireAdmin };
