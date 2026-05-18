const rateLimit = require('express-rate-limit');
const { fail } = require('../lib/context');

function createLimiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(fail('RATE_LIMIT', options.message || '请求过于频繁，请稍后再试'));
    },
    ...options
  });
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: '认证请求过于频繁，请稍后再试'
});

const clickLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: '点击记录过于频繁，请稍后再试'
});

const reviewLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: '评价请求过于频繁，请稍后再试'
});

const adminLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 90,
  message: '后台请求过于频繁，请稍后再试'
});

module.exports = {
  authLimiter,
  clickLimiter,
  reviewLimiter,
  adminLimiter
};
