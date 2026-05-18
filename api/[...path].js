const app = require('../server');

module.exports = (req, res) => {
  const rawPath = req.query && req.query.path;
  const pathValue = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

  if (pathValue && !req.url.startsWith('/api/' + pathValue)) {
    const query = new URLSearchParams();
    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (key === 'path') return;
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else if (value !== undefined) query.append(key, value);
    });
    req.url = '/api/' + pathValue + (query.toString() ? '?' + query.toString() : '');
  }

  return app(req, res);
};
