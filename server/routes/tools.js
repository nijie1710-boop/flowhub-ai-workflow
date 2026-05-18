const express = require('express');
const router = express.Router();
const {
  path,
  tesseract,
  upload,
  ok,
  fail,
  trimOutput,
  countWords,
  basicTextToMarkdown,
  htmlToMarkdown,
  assertPublicHttpUrl,
  fetchHtml,
  documentToMarkdown,
  buildFitnessMealPlan
} = require('../lib/context');

// ==================== 自营工具真实执行 ====================

router.post('/api/tools/webpage-markdown', async (req, res) => {
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

router.post('/api/tools/document-markdown', upload.single('file'), async (req, res) => {
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

router.post('/api/tools/image-ocr', upload.single('file'), async (req, res) => {
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

router.post('/api/tools/fitness-meal', async (req, res) => {
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


module.exports = router;
