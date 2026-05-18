try {
  require('dotenv').config();
} catch {
  // dotenv is optional in production when env vars are injected by the host.
}

const pool = require('../db');
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

module.exports = {
  pool,
  crypto,
  path,
  tesseract,
  upload,
  mailTransport,
  SMTP_FROM,
  verifyCodeStore,
  generateCode,
  setCode,
  checkCode,
  ok,
  fail,
  slugify,
  createWorkflowId,
  hashPassword,
  verifyPassword,
  normalizeGallery,
  trimOutput,
  countWords,
  basicTextToMarkdown,
  htmlToMarkdown,
  assertPublicHttpUrl,
  fetchHtml,
  documentToMarkdown,
  buildFitnessMealPlan
};
