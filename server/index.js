try {
  require('dotenv').config();
} catch {
  // dotenv is optional in production when env vars are injected by the host.
}

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const tesseract = require('tesseract.js');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '20mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
});

// ==================== 邮箱验证码 ====================

const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('SMTP_USER/SMTP_PASS is not set; email verification will fail until configured.');
}

const SMTP_FROM = process.env.SMTP_FROM
  || (process.env.SMTP_USER ? `"FlowHub" <${process.env.SMTP_USER}>` : '"FlowHub" <no-reply@flowhub.local>');

const verifyCodeStore = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setCode(email, code) {
  verifyCodeStore.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });
}

function checkCode(email, code) {
  const entry = verifyCodeStore.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expires) { verifyCodeStore.delete(email); return false; }
  if (entry.code !== code) return false;
  verifyCodeStore.delete(email);
  return true;
}

function ok(data) { return { ok: true, data }; }
function fail(code, message, details) {
  return { ok: false, error: { code, message, ...(details && { details }) } };
}

function slugify(input) {
  const slug = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'tool';
}

function createWorkflowId(prefix = 'wf_tool') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [scheme, salt, hash] = storedHash.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function normalizeGallery(gallery) {
  if (!Array.isArray(gallery)) return [];
  return gallery
    .filter(item => item && item.url)
    .slice(0, 6)
    .map((item, index) => ({
      label: String(item.label || `产品图 ${index + 1}`).slice(0, 80),
      shortLabel: String(item.shortLabel || `图 ${index + 1}`).slice(0, 20),
      title: String(item.title || '').slice(0, 120),
      url: String(item.url).slice(0, 2_500_000)
    }));
}

function trimOutput(value, max = 120000) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  return text.length > max ? text.slice(0, max) + '\n\n<!-- 已截断: 输出过长 -->' : text;
}

function countWords(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;
  const latin = normalized.match(/[A-Za-z0-9_]+/g) || [];
  const cjk = normalized.match(/[\u4e00-\u9fff]/g) || [];
  return latin.length + cjk.length;
}

function basicTextToMarkdown(text) {
  return trimOutput(String(text || '')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .join('\n\n'));
}

function createTurndown() {
  return new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  });
}

function htmlToMarkdown(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const title = article?.title || dom.window.document.title || '';
  const content = article?.content || dom.window.document.body?.innerHTML || html;
  const markdown = createTurndown().turndown(content);
  return {
    title: trimOutput(title, 300),
    markdown: trimOutput(markdown),
    excerpt: trimOutput(article?.excerpt || '', 800)
  };
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || parts[0] === 0;
  }
  return false;
}

async function assertPublicHttpUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error('请输入有效 URL'), { status: 400, code: 'INVALID_URL' });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('仅支持 http/https URL'), { status: 400, code: 'INVALID_URL' });
  }
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname)) {
    throw Object.assign(new Error('不支持抓取本地地址'), { status: 400, code: 'PRIVATE_URL' });
  }
  const records = await dns.lookup(parsed.hostname, { all: true });
  if (!records.length || records.some(record => isPrivateIp(record.address))) {
    throw Object.assign(new Error('不支持抓取内网地址'), { status: 400, code: 'PRIVATE_URL' });
  }
  return parsed;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'FlowHubBot/1.0 (+https://flowhub.local)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!resp.ok) {
      throw Object.assign(new Error(`网页请求失败: HTTP ${resp.status}`), { status: 502, code: 'FETCH_FAILED' });
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw Object.assign(new Error('目标地址不是 HTML 页面'), { status: 400, code: 'UNSUPPORTED_CONTENT_TYPE' });
    }
    const html = await resp.text();
    return html.slice(0, 3_000_000);
  } finally {
    clearTimeout(timeout);
  }
}

async function documentToMarkdown(file) {
  if (!file) {
    throw Object.assign(new Error('请上传文件'), { status: 400, code: 'FILE_REQUIRED' });
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = file.mimetype || '';
  if (ext === '.docx' || mime.includes('wordprocessingml')) {
    const result = await mammoth.convertToMarkdown({ buffer: file.buffer });
    return {
      markdown: trimOutput(result.value),
      warnings: (result.messages || []).map(item => item.message).filter(Boolean)
    };
  }
  if (ext === '.pdf' || mime === 'application/pdf') {
    const result = await pdfParse(file.buffer);
    return {
      markdown: basicTextToMarkdown(result.text),
      pages: result.numpages || null,
      warnings: []
    };
  }
  const raw = file.buffer.toString('utf8');
  if (ext === '.html' || ext === '.htm' || mime.includes('html')) {
    const converted = htmlToMarkdown(raw, 'https://flowhub.local/upload');
    return { markdown: converted.markdown, title: converted.title, warnings: [] };
  }
  if (['.txt', '.md', '.markdown', '.csv', '.json'].includes(ext) || mime.startsWith('text/')) {
    return { markdown: basicTextToMarkdown(raw), warnings: [] };
  }
  throw Object.assign(new Error('暂不支持该文件类型,请上传 PDF、DOCX、HTML、TXT、MD、CSV 或 JSON'), {
    status: 400,
    code: 'UNSUPPORTED_FILE_TYPE'
  });
}

const FITNESS_FOODS = [
  { name: '鸡胸肉', aliases: ['鸡胸肉', '鸡肉', 'chicken breast'], kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: '鸡蛋', aliases: ['鸡蛋', '蛋', 'egg', 'eggs'], kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, pieceGram: 50 },
  { name: '米饭', aliases: ['米饭', '白米饭', '熟米饭', 'rice', 'cooked rice'], kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  { name: '糙米饭', aliases: ['糙米', '糙米饭', 'brown rice'], kcal: 112, protein: 2.6, carbs: 23, fat: 0.9 },
  { name: '燕麦', aliases: ['燕麦', '燕麦片', 'oats', 'oatmeal'], kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { name: '红薯', aliases: ['红薯', '地瓜', 'sweet potato'], kcal: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
  { name: '土豆', aliases: ['土豆', '马铃薯', 'potato'], kcal: 77, protein: 2, carbs: 17, fat: 0.1 },
  { name: '西兰花', aliases: ['西兰花', 'broccoli'], kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { name: '菠菜', aliases: ['菠菜', 'spinach'], kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: '生菜', aliases: ['生菜', 'lettuce'], kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: '番茄', aliases: ['番茄', '西红柿', 'tomato'], kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: '黄瓜', aliases: ['黄瓜', 'cucumber'], kcal: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: '胡萝卜', aliases: ['胡萝卜', 'carrot'], kcal: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  { name: '牛肉', aliases: ['牛肉', '瘦牛肉', 'beef', 'lean beef'], kcal: 217, protein: 26.1, carbs: 0, fat: 11.8 },
  { name: '三文鱼', aliases: ['三文鱼', 'salmon'], kcal: 208, protein: 20.4, carbs: 0, fat: 13.4 },
  { name: '虾仁', aliases: ['虾仁', '虾', 'shrimp'], kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: '金枪鱼', aliases: ['金枪鱼', 'tuna'], kcal: 132, protein: 28, carbs: 0, fat: 1.3 },
  { name: '豆腐', aliases: ['豆腐', 'tofu'], kcal: 76, protein: 8.1, carbs: 1.9, fat: 4.8 },
  { name: '希腊酸奶', aliases: ['希腊酸奶', '无糖酸奶', '酸奶', 'greek yogurt', 'yogurt'], kcal: 59, protein: 10.3, carbs: 3.6, fat: 0.4 },
  { name: '牛奶', aliases: ['牛奶', 'milk'], kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: '香蕉', aliases: ['香蕉', 'banana'], kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, pieceGram: 118 },
  { name: '苹果', aliases: ['苹果', 'apple'], kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, pieceGram: 180 },
  { name: '牛油果', aliases: ['牛油果', '鳄梨', 'avocado'], kcal: 160, protein: 2, carbs: 8.5, fat: 14.7, pieceGram: 150 },
  { name: '橄榄油', aliases: ['橄榄油', 'olive oil'], kcal: 884, protein: 0, carbs: 0, fat: 100, density: 0.91 },
  { name: '花生酱', aliases: ['花生酱', 'peanut butter'], kcal: 588, protein: 25, carbs: 20, fat: 50 }
];

function findFitnessFood(text) {
  const lower = String(text || '').toLowerCase();
  return FITNESS_FOODS.find(food => food.aliases.some(alias => lower.includes(alias.toLowerCase())));
}

function gramsFromIngredient(line, food) {
  const text = String(line || '').replace(/\s+/g, ' ');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|公斤|千克|斤|g|克|ml|毫升|个|只|颗|根|片|份)?/i);
  if (!match) return { grams: 100, note: '未识别重量,按 100g 估算' };
  const amount = Number(match[1]);
  const unit = (match[2] || 'g').toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return { grams: 100, note: '重量异常,按 100g 估算' };
  if (['kg', '公斤', '千克'].includes(unit)) return { grams: amount * 1000 };
  if (unit === '斤') return { grams: amount * 500 };
  if (['个', '只', '颗', '根', '片', '份'].includes(unit)) return { grams: amount * (food.pieceGram || 50) };
  if (['ml', '毫升'].includes(unit)) return { grams: amount * (food.density || 1) };
  return { grams: amount };
}

function roundMacro(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function parseFitnessIngredients(raw) {
  const lines = String(raw || '')
    .split(/[\n,，;；、]+/)
    .map(item => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 24);
  const unknown = [];
  const parsed = [];
  lines.forEach(line => {
    const food = findFitnessFood(line);
    if (!food) {
      unknown.push(line);
      return;
    }
    const weight = gramsFromIngredient(line, food);
    const factor = weight.grams / 100;
    parsed.push({
      input: line,
      name: food.name,
      grams: Math.round(weight.grams),
      kcal: roundMacro(food.kcal * factor),
      protein: roundMacro(food.protein * factor),
      carbs: roundMacro(food.carbs * factor),
      fat: roundMacro(food.fat * factor),
      note: weight.note || ''
    });
  });
  return { parsed, unknown };
}

function buildFitnessMealPlan({ ingredients, goal, mealType, servings }) {
  const { parsed, unknown } = parseFitnessIngredients(ingredients);
  if (!parsed.length) {
    throw Object.assign(new Error('没有匹配到可计算的常见食材,请至少输入鸡胸肉、米饭、鸡蛋、西兰花等食材和重量'), {
      status: 400,
      code: 'NO_MATCHED_INGREDIENTS'
    });
  }
  const total = parsed.reduce((acc, item) => {
    acc.kcal += item.kcal;
    acc.protein += item.protein;
    acc.carbs += item.carbs;
    acc.fat += item.fat;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  Object.keys(total).forEach(key => { total[key] = roundMacro(total[key]); });
  const portion = Math.max(1, Math.min(8, parseInt(servings || 1, 10) || 1));
  const perServing = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, roundMacro(value / portion)]));
  const goalMap = {
    fat_loss: { label: '减脂', method: '少油煎/蒸煮', tip: '优先保留高蛋白和蔬菜,主食可按训练量上下浮动 20%。' },
    muscle_gain: { label: '增肌', method: '补足主食和优质脂肪', tip: '如果训练后食用,可以额外加 50-100g 米饭或一杯牛奶。' },
    balanced: { label: '均衡', method: '一锅热食或便当碗', tip: '蛋白、主食、蔬菜比例已经较均衡,适合作为日常正餐。' }
  };
  const mealMap = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
  const target = goalMap[goal] || goalMap.balanced;
  const mealName = mealMap[mealType] || '正餐';
  const proteinFood = parsed.find(item => item.protein >= 12) || parsed[0];
  const carbFood = parsed.find(item => item.carbs >= 15);
  const vegFoods = parsed.filter(item => item.carbs < 15 && item.protein < 8 && item.fat < 5).map(item => item.name);
  const title = `${target.label}${mealName} · ${proteinFood.name}${carbFood ? carbFood.name : ''}能量碗`;
  const steps = [
    `将 ${parsed.map(item => `${item.name}${item.grams}g`).join('、')} 备好,蔬菜洗净切块。`,
    `优先处理蛋白质食材: ${proteinFood.name} 用黑胡椒、少量盐或低钠酱油调味,采用${target.method}。`,
    carbFood ? `${carbFood.name} 作为主食铺底,控制油脂,保持饱腹感。` : '这份食材主食较少,如果是训练日可增加米饭、红薯或燕麦。',
    vegFoods.length ? `加入 ${vegFoods.join('、')} 增加体积和膳食纤维,最后合盘。` : '搭配一份绿叶菜或番茄黄瓜,让微量营养更完整。',
    `分成 ${portion} 份食用,每份约 ${perServing.kcal} kcal。`
  ];
  const warnings = [];
  parsed.filter(item => item.note).forEach(item => warnings.push(`${item.input}: ${item.note}`));
  if (unknown.length) warnings.push(`未计入营养: ${unknown.join('、')}`);
  if (perServing.protein < 25 && goal === 'muscle_gain') warnings.push('增肌目标下每份蛋白偏低,建议增加鸡胸肉、牛肉、虾仁、鸡蛋或希腊酸奶。');
  const markdown = [
    `# ${title}`,
    '',
    `目标: ${target.label} / 餐次: ${mealName} / 份数: ${portion}`,
    '',
    '## 营养估算',
    `- 总热量: ${total.kcal} kcal`,
    `- 总蛋白质: ${total.protein} g`,
    `- 总碳水: ${total.carbs} g`,
    `- 总脂肪: ${total.fat} g`,
    `- 每份: ${perServing.kcal} kcal / 蛋白质 ${perServing.protein} g / 碳水 ${perServing.carbs} g / 脂肪 ${perServing.fat} g`,
    '',
    '## 食材',
    ...parsed.map(item => `- ${item.name} ${item.grams}g: ${item.kcal} kcal, P ${item.protein}g / C ${item.carbs}g / F ${item.fat}g`),
    '',
    '## 做法',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## 建议',
    `- ${target.tip}`,
    '- 营养值为估算值,会因品牌、烹饪方式和熟重/生重差异变化。'
  ].join('\n');
  return { title, goal: target.label, meal_type: mealName, servings: portion, ingredients: parsed, unknown, total, per_serving: perServing, steps, tips: [target.tip], warnings, markdown };
}

async function getUserFromToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
  return result.rows[0] || null;
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

// ==================== 工作流 ====================

app.get('/api/workflows', async (req, res) => {
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

app.get('/api/workflows/:id', async (req, res) => {
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

// ==================== 调用记录(点击) ====================

app.post('/api/workflows/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const { source, search_query, user_id } = req.body;

    const wf = await pool.query('SELECT id, type, target_url FROM workflows WHERE id = $1', [id]);
    if (!wf.rows.length) {
      return res.status(404).json(fail('RESOURCE_NOT_FOUND', '工作流不存在'));
    }

    await pool.query(
      `INSERT INTO clicks (workflow_id, user_id, source, search_query) VALUES ($1, $2, $3, $4)`,
      [id, user_id || null, source || null, search_query || null]
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

app.get('/api/clicks/stats', async (req, res) => {
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

// ==================== 评价 ====================

app.get('/api/workflows/:id/reviews', async (req, res) => {
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

app.post('/api/workflows/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, avatar, rating, text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(fail('INVALID_PARAMS', '评分必须是 1-5'));
    }

    const result = await pool.query(
      `INSERT INTO reviews (workflow_id, user_name, avatar, rating, text, date)
       VALUES ($1, $2, $3, $4, $5, '刚刚') RETURNING id`,
      [id, user_name || '匿名用户', avatar || '匿', rating, text || '']
    );

    res.status(201).json(ok({ review_id: result.rows[0].id }));
  } catch (err) {
    console.error('POST /api/workflows/:id/reviews error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 自营工具真实执行 ====================

app.post('/api/tools/webpage-markdown', async (req, res) => {
  try {
    const { url } = req.body || {};
    const parsed = await assertPublicHttpUrl(url);
    const html = await fetchHtml(parsed.toString());
    const result = htmlToMarkdown(html, parsed.toString());
    res.json(ok({
      source_url: parsed.toString(),
      title: result.title,
      excerpt: result.excerpt,
      markdown: result.markdown,
      word_count: countWords(result.markdown),
      engine: 'Readability + Turndown'
    }));
  } catch (err) {
    const status = err.status || (err.name === 'AbortError' ? 504 : 500);
    console.error('POST /api/tools/webpage-markdown error:', err.message);
    res.status(status).json(fail(err.code || 'TOOL_ERROR', err.message || '网页转换失败'));
  }
});

app.post('/api/tools/document-markdown', upload.single('file'), async (req, res) => {
  try {
    const result = await documentToMarkdown(req.file);
    res.json(ok({
      file_name: req.file.originalname,
      file_size: req.file.size,
      title: result.title || path.basename(req.file.originalname || 'document'),
      markdown: result.markdown,
      word_count: countWords(result.markdown),
      pages: result.pages || null,
      warnings: result.warnings || [],
      engine: 'mammoth / pdf-parse / Turndown'
    }));
  } catch (err) {
    const status = err.status || 500;
    console.error('POST /api/tools/document-markdown error:', err.message);
    res.status(status).json(fail(err.code || 'TOOL_ERROR', err.message || '文档转换失败'));
  }
});

app.post('/api/tools/image-ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(fail('FILE_REQUIRED', '请上传图片'));
    }
    if (!/^image\/(png|jpe?g|webp|bmp|tiff?)$/i.test(req.file.mimetype || '')) {
      return res.status(400).json(fail('UNSUPPORTED_FILE_TYPE', '请上传 PNG、JPG、WEBP、BMP 或 TIFF 图片'));
    }
    const lang = String(req.body.lang || 'chi_sim+eng').replace(/[^a-zA-Z0-9_+]/g, '') || 'chi_sim+eng';
    const result = await tesseract.recognize(req.file.buffer, lang, {
      cachePath: process.env.TESSDATA_CACHE || '/tmp/flowhub-tesseract-cache',
      logger: () => {}
    });
    const text = trimOutput(result.data?.text || '');
    res.json(ok({
      file_name: req.file.originalname,
      file_size: req.file.size,
      text,
      markdown: basicTextToMarkdown(text),
      word_count: countWords(text),
      confidence: Math.round(result.data?.confidence || 0),
      language: lang,
      engine: 'Tesseract.js'
    }));
  } catch (err) {
    console.error('POST /api/tools/image-ocr error:', err.message);
    res.status(500).json(fail('TOOL_ERROR', err.message || '图片 OCR 失败'));
  }
});

app.post('/api/tools/fitness-meal', async (req, res) => {
  try {
    const result = buildFitnessMealPlan({
      ingredients: req.body?.ingredients,
      goal: req.body?.goal,
      mealType: req.body?.meal_type,
      servings: req.body?.servings
    });
    res.json(ok({
      ...result,
      word_count: countWords(result.markdown),
      source_project: 'zen-apps/ai-fitness-planner',
      source_url: 'https://github.com/zen-apps/ai-fitness-planner',
      engine: 'FlowHub nutrition rules + USDA-style macro table'
    }));
  } catch (err) {
    const status = err.status || 500;
    console.error('POST /api/tools/fitness-meal error:', err.message);
    res.status(status).json(fail(err.code || 'TOOL_ERROR', err.message || '健身餐生成失败'));
  }
});

// ==================== 推广位 ====================

app.get('/api/ad-slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ad_slots ORDER BY daily_impressions DESC');
    res.json(ok({ slots: result.rows }));
  } catch (err) {
    console.error('GET /api/ad-slots error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 推广位申请 ====================

app.get('/api/ad-applications', requireAdmin, async (req, res) => {
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

app.post('/api/ad-applications', async (req, res) => {
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

app.patch('/api/ad-applications/:id/status', requireAdmin, async (req, res) => {
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

app.post('/api/tool-submissions', async (req, res) => {
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
         submission_type, price_model, price_amount, logo_url, gallery)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING *`,
      [
        submitter_name || '',
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
        JSON.stringify(normalizeGallery(gallery))
      ]
    );
    res.status(201).json(ok({ submission: result.rows[0] }));
  } catch (err) {
    console.error('POST /api/tool-submissions error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.get('/api/admin/tool-submissions', requireAdmin, async (req, res) => {
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

app.post('/api/admin/tool-submissions/:id/approve', requireAdmin, async (req, res) => {
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

app.post('/api/admin/tool-submissions/:id/reject', requireAdmin, async (req, res) => {
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

// ==================== 管理后台统计 ====================

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
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

app.get('/api/admin/workflows', requireAdmin, async (req, res) => {
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

app.post('/api/admin/workflows', requireAdmin, async (req, res) => {
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

app.put('/api/admin/workflows/:id', requireAdmin, async (req, res) => {
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

app.patch('/api/admin/workflows/:id/status', requireAdmin, async (req, res) => {
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

app.get('/api/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = 'SELECT * FROM notifications';
    const params = [];
    if (user_id) {
      query += ' WHERE user_id = $1';
      params.push(user_id);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await pool.query(query, params);
    res.json(ok({ notifications: result.rows }));
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 全量数据(兼容前端 getData) ====================

app.get('/api/data', requireAdmin, async (req, res) => {
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

// ==================== 用户认证 ====================

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }

    const existing = verifyCodeStore.get(email);
    if (existing && Date.now() - (existing.expires - 5 * 60 * 1000) < 60 * 1000) {
      return res.status(429).json(fail('RATE_LIMIT', '请 60 秒后再试'));
    }

    const code = generateCode();
    setCode(email, code);

    await mailTransport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'FlowHub 验证码',
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#FAFAF7;border-radius:12px">
        <h2 style="color:#0F0F0E;margin:0 0 16px">FlowHub 验证码</h2>
        <p style="color:#666;font-size:14px;margin:0 0 24px">你的验证码是：</p>
        <div style="background:#1A5D3A;color:#fff;font-size:28px;letter-spacing:8px;text-align:center;padding:16px;border-radius:8px;font-family:monospace">${code}</div>
        <p style="color:#999;font-size:12px;margin:24px 0 0">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>`
    });

    res.json(ok({ sent: true }));
  } catch (err) {
    console.error('POST /api/auth/send-code error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '验证码发送失败，请稍后重试'));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, code, mode } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }

    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(404).json(fail('USER_NOT_FOUND', '该邮箱未注册，请先注册'));
    }

    const user = result.rows[0];
    if (mode === 'email_code' || code) {
      if (!code || code.length !== 6) {
        return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
      }
      if (!checkCode(email, code)) {
        return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
      }
    } else {
      if (!password) return res.status(400).json(fail('INVALID_PARAMS', '请输入密码'));
      if (!verifyPassword(password, user.password_hash)) {
        return res.status(401).json(fail('INVALID_PASSWORD', user.password_hash ? '密码不正确' : '该账号还没有设置密码，请使用忘记密码邮箱验证登录'));
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE users SET token = $1, token_created_at = NOW(), last_seen_at = NOW() WHERE id = $2',
      [token, user.id]
    );

    const role = user.is_admin ? 'admin' : (user.is_creator ? 'creator' : 'user');
    res.json(ok({
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, role, created_at: user.created_at },
      token
    }));
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, code, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json(fail('INVALID_PARAMS', '邮箱格式不正确'));
    }
    if (password) {
      if (password.length < 6) return res.status(400).json(fail('INVALID_PARAMS', '密码至少 6 位'));
    } else {
      if (!code || code.length !== 6) {
        return res.status(400).json(fail('INVALID_PARAMS', '请输入 6 位验证码'));
      }
      if (!checkCode(email, code)) {
        return res.status(400).json(fail('INVALID_CODE', '验证码错误或已过期'));
      }
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json(fail('USER_EXISTS', '该邮箱已注册'));
    }

    const token = crypto.randomBytes(32).toString('hex');
    const userName = name || ('用户' + email.split('@')[0].slice(-4));
    const passwordHash = password ? hashPassword(password) : null;

    const result = await pool.query(
      `INSERT INTO users (email, name, tier, password_hash, token, token_created_at, created_at)
       VALUES ($1, $2, 'free', $3, $4, NOW(), NOW()) RETURNING id`,
      [email, userName, passwordHash, token]
    );

    res.status(201).json(ok({
      user: { id: result.rows[0].id, email, name: userName, tier: 'free', role: 'user', created_at: new Date().toISOString() },
      token
    }));
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    if (err.code === '23505') return res.status(409).json(fail('USER_EXISTS', '该邮箱已注册'));
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json(fail('UNAUTHORIZED', '未登录'));

    const result = await pool.query('SELECT * FROM users WHERE token = $1', [token]);
    if (!result.rows.length) return res.status(401).json(fail('UNAUTHORIZED', 'token 无效'));

    const user = result.rows[0];
    const role = user.is_admin ? 'admin' : (user.is_creator ? 'creator' : 'user');
    res.json(ok({
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier, role, created_at: user.created_at }
    }));
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});

// ==================== 健康检查 ====================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json(ok({ status: 'healthy', timestamp: new Date().toISOString() }));
  } catch (err) {
    res.status(500).json(fail('DB_ERROR', '数据库连接失败'));
  }
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowHub API running on port ${PORT}`);
  });
}

module.exports = app;
