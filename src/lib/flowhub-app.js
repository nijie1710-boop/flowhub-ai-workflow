/* =============================================================
   FlowHub 完整 Demo · 数据层
   ============================================================= */

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:3001/api'
  : '/api';
const DEMO_EMAIL_CODE = '123456';
let _apiCache = null;
let _apiLoaded = false;
let _memoryData = null;
let _sessionUser = null;
let _sessionNotifs = null;
let _searchHistory = [];
let _localAccounts = {};

const CATEGORIES = ['全部', '设计 · 海报', '写作 · 文案', '编程 · 开发', '效率 · 办公', '数据 · 分析', '营销 · 增长', '其他'];
const VERIFIED_SELF_WORKFLOW_IDS = new Set([
  'wf_seed_doc_markdown',
  'wf_seed_image_ocr',
  'wf_seed_fitness_meal'
]);
const KEEP_IN_PROGRESS_SELF_WORKFLOW_IDS = new Set([
  'wf_seed_image_video'
]);
const REMOVED_SELF_WORKFLOW_IDS = new Set([
  'wf_seed_xhs',
  'wf_seed_palette',
  'wf_seed_translate',
  'wf_seed_codereview',
  'wf_seed_poster',
  'wf_seed_meeting',
  'wf_seed_dataclean',
  'wf_seed_social',
  'wf_seed_sql',
  'wf_seed_web_markdown'
]);

const SEED_DATA = {
  user: null,
  workflows: [
    {
      id: 'wf_seed_picspark',
      name: 'PicSpark · 商品图 AI',
      tagline: '电商商品图智能生成 · 主图换背景 · 模特图',
      description: 'PicSpark 是专门为电商场景设计的 AI 商品图生成工具。无论你是要换背景、生成模特上身图、做节日营销海报,都能一键完成。基于扩散模型 + 视觉理解,生成质量接近专业摄影。',
      target_url: 'https://www.picspark.cn',
      type: 'recommend',
      category: '设计 · 海报',
      tags: ['电商', 'AI 生图', '中文'],
      price_model: 'cps',
      price_amount: 0,
      cover_color: '#1A5D3A',
      status: 'active',
      rating: 4.9,
      review_count: 2830,
      examples: [
        { label: '场景 · 商品换背景', text: '输入:一张白底奶粉罐照片\n输出:同一罐奶粉,但在温馨的家庭厨房场景中,自然光照明,配以新鲜水果作为陪衬' },
        { label: '场景 · 节日营销图', text: '输入:口红产品图\n输出:春节红金主题海报,口红嵌入福字图案,左下角自动留出文案区域' }
      ],
      seed_clicks: 4500,
      seed_clicks_7d: 380,
      created_at: '2026-04-15'
    },
    {
      id: 'wf_seed_xhs',
      name: '小红书爆款笔记生成',
      tagline: '输入关键词,产出符合平台调性的完整笔记',
      description: '抓住小红书的第三人称口吻、emoji 节奏、热搜词 hook。每次返回 3 种风格变体(干货向、故事向、对比向),供你按账号定位挑选。',
      target_url: 'https://flowhub.cn/run/xhs-note',
      type: 'self',
      category: '写作 · 文案',
      tags: ['小红书', '种草', '内容'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#1E3A8A',
      status: 'active',
      rating: 4.8,
      review_count: 1247,
      examples: [
        { label: '场景 · 美妆笔记', text: '输入:平价精华水 · 25-30 岁敏感肌\n输出:敏感肌姐妹冲!这瓶平价精华水我藏了三个月才舍得分享 ✨ ...' }
      ],
      seed_clicks: 2100,
      seed_clicks_7d: 210,
      created_at: '2026-04-20'
    },
    {
      id: 'wf_seed_palette',
      name: '品牌色板生成',
      tagline: '输入品牌关键词,生成完整 VI 配色方案',
      description: '基于色彩心理学和品牌定位理论,自动产出 6 色完整配色 + 主辅色应用建议 + 配色禁忌。',
      target_url: 'https://flowhub.cn/run/palette',
      type: 'self',
      category: '设计 · 海报',
      tags: ['VI', '配色', '品牌'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#B83A6B',
      status: 'active',
      rating: 4.7,
      review_count: 612,
      examples: [],
      seed_clicks: 890,
      seed_clicks_7d: 95,
      created_at: '2026-04-25'
    },
    {
      id: 'wf_seed_resume',
      name: '简历优化助手(合作方)',
      tagline: '针对岗位 JD 优化简历,给出修改建议',
      description: '上传简历 + 目标岗位描述,AI 给出针对性改写建议,包括关键词覆盖、量化成果表述、格式优化。',
      target_url: 'https://example-resume.com',
      type: 'recommend',
      category: '其他',
      tags: ['求职', '简历', '免费'],
      price_model: 'cps',
      price_amount: 8,
      cover_color: '#5B3FA8',
      status: 'active',
      rating: 4.5,
      review_count: 1842,
      examples: [],
      seed_clicks: 3200,
      seed_clicks_7d: 280,
      created_at: '2026-05-01'
    },
    {
      id: 'wf_seed_compete',
      name: '竞品监控周报(合作方)',
      tagline: '自动抓取竞品官网与社媒,产出洞察周报',
      description: '加入竞品列表 → 每周一自动生成竞品动态周报 → 邮箱推送。覆盖产品更新、价格变化、营销活动、社媒舆情。',
      target_url: 'https://example-compete.com',
      type: 'recommend',
      category: '营销 · 增长',
      tags: ['竞品', '情报', '订阅'],
      price_model: 'cpc',
      price_amount: 1.2,
      cover_color: '#B85C00',
      status: 'active',
      rating: 4.8,
      review_count: 287,
      examples: [],
      seed_clicks: 640,
      seed_clicks_7d: 72,
      created_at: '2026-05-03'
    },
    {
      id: 'wf_seed_translate',
      name: '多语言翻译大师',
      tagline: '支持 50+ 语言的智能翻译,保留语境和风格',
      description: '基于大语言模型的多语言翻译工具。不同于传统机翻,能准确理解上下文语境,保持原文风格和专业术语。支持文档批量翻译。',
      target_url: 'https://flowhub.cn/run/translate',
      type: 'self',
      category: '写作 · 文案',
      tags: ['翻译', '多语言', '文档'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#0D7377',
      status: 'active',
      rating: 4.7,
      review_count: 956,
      examples: [
        { label: '场景 · 商务邮件', text: '输入:中文商务邮件\n输出:地道的英文商务邮件,保留原文的礼貌程度和正式感' }
      ],
      seed_clicks: 1800,
      seed_clicks_7d: 165,
      created_at: '2026-04-18'
    },
    {
      id: 'wf_seed_codereview',
      name: '代码 Review 助手',
      tagline: '自动审查代码质量,发现潜在 Bug 和安全漏洞',
      description: '提交代码片段或 GitHub PR 链接,AI 自动进行代码审查。覆盖代码风格、性能优化、安全漏洞、最佳实践等维度。',
      target_url: 'https://flowhub.cn/run/codereview',
      type: 'self',
      category: '编程 · 开发',
      tags: ['代码审查', '安全', 'GitHub'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#24292E',
      status: 'active',
      rating: 4.8,
      review_count: 723,
      examples: [],
      seed_clicks: 1520,
      seed_clicks_7d: 198,
      created_at: '2026-04-22'
    },
    {
      id: 'wf_seed_poster',
      name: '节日海报生成器',
      tagline: '输入节日 + 品牌元素,生成多款营销海报',
      description: '覆盖春节、618、双 11、圣诞等 30+ 节日模板。输入品牌 Logo 和主色调,自动生成符合品牌调性的节日营销海报。',
      target_url: 'https://flowhub.cn/run/poster',
      type: 'self',
      category: '设计 · 海报',
      tags: ['海报', '营销', '节日'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#DC2626',
      status: 'active',
      rating: 4.6,
      review_count: 438,
      examples: [],
      seed_clicks: 980,
      seed_clicks_7d: 125,
      created_at: '2026-04-28'
    },
    {
      id: 'wf_seed_meeting',
      name: '会议纪要提取',
      tagline: '上传录音或文本,自动生成结构化会议纪要',
      description: '支持上传录音文件或粘贴文字记录,自动识别发言人、提取关键决策、待办事项、时间节点,生成结构化纪要并可导出。',
      target_url: 'https://flowhub.cn/run/meeting',
      type: 'self',
      category: '效率 · 办公',
      tags: ['会议', '纪要', '效率'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#7C3AED',
      status: 'active',
      rating: 4.9,
      review_count: 1102,
      examples: [],
      seed_clicks: 2350,
      seed_clicks_7d: 312,
      created_at: '2026-04-10'
    },
    {
      id: 'wf_seed_dataclean',
      name: '数据清洗助手',
      tagline: '上传 Excel/CSV,自动清洗格式化数据',
      description: '识别并修复数据中的格式不一致、重复值、缺失值、异常值。支持自定义清洗规则,处理完成后导出干净数据。',
      target_url: 'https://flowhub.cn/run/dataclean',
      type: 'self',
      category: '数据 · 分析',
      tags: ['数据', 'Excel', '清洗'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#059669',
      status: 'active',
      rating: 4.6,
      review_count: 389,
      examples: [],
      seed_clicks: 760,
      seed_clicks_7d: 88,
      created_at: '2026-05-02'
    },
    {
      id: 'wf_seed_seo',
      name: 'SEO 文章优化器(合作方)',
      tagline: '输入关键词,生成 SEO 友好的长文章',
      description: '基于搜索引擎算法分析,自动优化文章结构、关键词密度、标题层级、内链建议,提升搜索排名。',
      target_url: 'https://example-seo.com',
      type: 'recommend',
      category: '营销 · 增长',
      tags: ['SEO', '内容营销', '搜索'],
      price_model: 'cpc',
      price_amount: 0.8,
      cover_color: '#EA580C',
      status: 'active',
      rating: 4.4,
      review_count: 567,
      examples: [],
      seed_clicks: 1100,
      seed_clicks_7d: 142,
      created_at: '2026-04-30'
    },
    {
      id: 'wf_seed_contract',
      name: '合同风险审查(合作方)',
      tagline: '上传合同,AI 标注风险条款和修改建议',
      description: '基于法律知识库训练,自动识别合同中的不公平条款、缺失条款、法律风险,给出修改建议和风险等级评估。',
      target_url: 'https://example-legal.com',
      type: 'recommend',
      category: '其他',
      tags: ['法律', '合同', '风控'],
      price_model: 'cps',
      price_amount: 12,
      cover_color: '#1E40AF',
      status: 'active',
      rating: 4.7,
      review_count: 234,
      examples: [],
      seed_clicks: 520,
      seed_clicks_7d: 68,
      created_at: '2026-05-05'
    },
    {
      id: 'wf_seed_social',
      name: '社媒排期管家',
      tagline: '一键规划多平台内容日历,自动排期发布',
      description: '支持微博、抖音、小红书、公众号等主流平台。输入内容主题和发布频率,自动生成一周/月内容日历和文案草稿。',
      target_url: 'https://flowhub.cn/run/social',
      type: 'self',
      category: '营销 · 增长',
      tags: ['社媒', '排期', '内容'],
      price_model: 'pro',
      price_amount: 0,
      cover_color: '#DB2777',
      status: 'active',
      rating: 4.5,
      review_count: 678,
      examples: [],
      seed_clicks: 1350,
      seed_clicks_7d: 156,
      created_at: '2026-04-26'
    },
    {
      id: 'wf_seed_image_video',
      name: 'Image2Video 画布导演',
      tagline: 'Image2 生关键帧,拖入画布连线,再生成短视频分镜',
      description: 'FlowHub 自营的图生视频创作工作流。右侧像聊天一样用 Image2 生成关键帧,左侧画布拖拽排镜头并建立顺序,最后交给视频引擎生成 6-12 秒短视频预览。适合商品广告、短剧分镜、社媒视频和动态海报。',
      target_url: 'https://flowhub.cn/run/image-video',
      type: 'self',
      category: '设计 · 海报',
      tags: ['Image2', '图生视频', '画布'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#0F766E',
      status: 'active',
      rating: 4.9,
      review_count: 328,
      examples: [],
      seed_clicks: 1180,
      seed_clicks_7d: 224,
      created_at: '2026-05-14'
    },
    {
      id: 'wf_seed_sql',
      name: 'SQL 查询生成器',
      tagline: '用自然语言描述需求,自动生成 SQL 查询',
      description: '支持 MySQL、PostgreSQL、SQLite 等主流数据库。描述你的查询需求,自动生成优化后的 SQL,并附带执行计划分析。',
      target_url: 'https://flowhub.cn/run/sql',
      type: 'self',
      category: '编程 · 开发',
      tags: ['SQL', '数据库', '查询'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#0369A1',
      status: 'active',
      rating: 4.8,
      review_count: 1456,
      examples: [],
      seed_clicks: 2680,
      seed_clicks_7d: 345,
      created_at: '2026-04-12'
    },
    {
      id: 'wf_seed_doc_markdown',
      name: '文档转 Markdown',
      tagline: '上传 PDF / Word / HTML,转成 AI 可读 Markdown',
      description: '基于开源解析能力的 FlowHub 自营工具。支持 PDF、DOCX、HTML、TXT、MD、CSV、JSON 文件,把文档转成结构化 Markdown,方便继续交给 AI 摘要、知识库入库或内容复用。',
      target_url: 'https://flowhub.cn/run/document-markdown',
      type: 'self',
      category: '效率 · 办公',
      tags: ['文档', 'Markdown', 'PDF'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#2563EB',
      status: 'active',
      rating: 4.8,
      review_count: 216,
      examples: [
        { label: '场景 · 合同转 Markdown', text: '输入:PDF 合同\n输出:保留段落结构的 Markdown 文本,可继续摘要或提取条款' }
      ],
      seed_clicks: 1380,
      seed_clicks_7d: 176,
      created_at: '2026-05-16'
    },
    {
      id: 'wf_seed_web_markdown',
      name: '网页转 Markdown',
      tagline: '输入网址,自动提取正文并转成 Markdown',
      description: '输入公开网页地址,自动抓取正文、去掉导航和广告噪声,输出干净 Markdown。适合竞品分析、SEO 素材整理、知识库采集和文章归档。',
      target_url: 'https://flowhub.cn/run/webpage-markdown',
      type: 'self',
      category: '营销 · 增长',
      tags: ['网页抓取', 'Markdown', '知识库'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#0891B2',
      status: 'active',
      rating: 4.7,
      review_count: 184,
      examples: [
        { label: '场景 · 竞品页面采集', text: '输入:竞品落地页 URL\n输出:页面标题、摘要、正文 Markdown 和字数统计' }
      ],
      seed_clicks: 1160,
      seed_clicks_7d: 143,
      created_at: '2026-05-16'
    },
    {
      id: 'wf_seed_image_ocr',
      name: '图片 OCR 识别',
      tagline: '上传截图或图片,识别中英文文字',
      description: '基于本地开源 OCR 引擎的 FlowHub 自营工具。上传 PNG、JPG、WEBP 等图片,识别中文和英文文字,输出纯文本与 Markdown,适合截图整理、票据录入和图片资料转写。',
      target_url: 'https://flowhub.cn/run/image-ocr',
      type: 'self',
      category: '效率 · 办公',
      tags: ['OCR', '截图', '中文识别'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#7C3AED',
      status: 'active',
      rating: 4.6,
      review_count: 162,
      examples: [
        { label: '场景 · 截图转文字', text: '输入:中文网页截图\n输出:识别文本、置信度和 Markdown 结果' }
      ],
      seed_clicks: 980,
      seed_clicks_7d: 121,
      created_at: '2026-05-16'
    },
    {
      id: 'wf_seed_fitness_meal',
      name: '健身餐菜谱生成器',
      tagline: '输入现有食材,生成菜谱并计算热量和三大营养素',
      description: '参考开源 AI fitness planner 的营养计算思路,输入鸡胸肉、米饭、西兰花、鸡蛋等食材和重量,自动生成一份健身餐做法,并计算总热量、蛋白质、碳水和脂肪。第一版使用本地常见食材营养表,不依赖付费 API。',
      target_url: 'https://flowhub.cn/run/fitness-meal',
      type: 'self',
      category: '效率 · 办公',
      tags: ['健身餐', '菜谱', '热量计算'],
      price_model: 'free',
      price_amount: 0,
      cover_color: '#16A34A',
      status: 'active',
      rating: 4.7,
      review_count: 88,
      examples: [
        { label: '场景 · 减脂晚餐', text: '输入:鸡胸肉 200g、米饭 150g、西兰花 100g、鸡蛋 2个\n输出:高蛋白健身餐做法、总热量和 P/C/F 三大营养素' }
      ],
      seed_clicks: 760,
      seed_clicks_7d: 94,
      created_at: '2026-05-16'
    },
    {
      id: 'wf_seed_email',
      name: '邮件模板工厂(合作方)',
      tagline: '输入场景和要点,生成专业邮件模板',
      description: '覆盖商务沟通、客户跟进、面试邀约、催款提醒等 50+ 常见场景。支持中英双语,一键生成得体的邮件正文。',
      target_url: 'https://example-email.com',
      type: 'recommend',
      category: '效率 · 办公',
      tags: ['邮件', '商务', '模板'],
      price_model: 'cpc',
      price_amount: 0.5,
      cover_color: '#4338CA',
      status: 'active',
      rating: 4.3,
      review_count: 892,
      examples: [],
      seed_clicks: 1650,
      seed_clicks_7d: 198,
      created_at: '2026-05-06'
    }
  ],
  clicks: [],
  inline_runs: [],
  reviews: [
    { id: 'rv_1', workflow_id: 'wf_seed_picspark', user_name: '电商小赵', avatar: '赵', rating: 5, text: '主图换背景效果非常自然,比之前用 PS 抠图省了 80% 时间。强推!', date: '3 天前' },
    { id: 'rv_2', workflow_id: 'wf_seed_picspark', user_name: '跨境老王', avatar: '王', rating: 5, text: '节日海报这块尤其好用,春节促销前批量生成了 200+ 张图,客户验收一次过。', date: '1 周前' },
    { id: 'rv_3', workflow_id: 'wf_seed_picspark', user_name: '某 MCN 运营', avatar: '李', rating: 4, text: '整体很好,偶尔模特图的手部细节会有问题,需要手动挑选。', date: '2 周前' },
    { id: 'rv_4', workflow_id: 'wf_seed_picspark', user_name: '独立设计师 J', avatar: 'J', rating: 5, text: '终于不用每次都开 Photoshop 了。客户改方案也能秒响应,生产力提升 10 倍不夸张。', date: '3 周前' },
    { id: 'rv_5', workflow_id: 'wf_seed_picspark', user_name: '某护肤品牌主理人', avatar: '陈', rating: 5, text: '我们 3 人电商小团队,以前每月在外包修图上花 ¥8000+。用了 PicSpark 之后,改成 ¥39 月费,且效率更高。', date: '1 个月前' },
    { id: 'rv_6', workflow_id: 'wf_seed_picspark', user_name: '某童装店', avatar: '吴', rating: 4, text: '生成速度很快,大部分场景都能用。希望能加一个「同款多尺寸输出」的功能。', date: '1 个月前' },

    { id: 'rv_xhs_1', workflow_id: 'wf_seed_xhs', user_name: '小红书博主 @云朵', avatar: '云', rating: 5, text: '终于不用绞尽脑汁想 hook 了。生成 3 个版本任挑,平台调性把握得很准。', date: '5 天前' },
    { id: 'rv_xhs_2', workflow_id: 'wf_seed_xhs', user_name: '某美妆代运营', avatar: '美', rating: 4, text: '日常种草笔记很好用,但生硬植入广告时还是需要手动调一调。', date: '2 周前' },
    { id: 'rv_xhs_3', workflow_id: 'wf_seed_xhs', user_name: '探店小老板', avatar: '探', rating: 5, text: '一个月发了 30 篇笔记,涨粉 1200。AI 出脚本,我只需要拍照和发布。', date: '3 周前' },

    { id: 'rv_pal_1', workflow_id: 'wf_seed_palette', user_name: '品牌策划 Yuki', avatar: 'Y', rating: 5, text: '给客户做 VI 提案,色板配套理由都给了,客户接受度极高。', date: '1 周前' },
    { id: 'rv_pal_2', workflow_id: 'wf_seed_palette', user_name: '独立咖啡品牌', avatar: '咖', rating: 4, text: '配色提案很有启发性,虽然最终用了改良版,但起点比从零强 100 倍。', date: '2 周前' },

    { id: 'rv_resume_1', workflow_id: 'wf_seed_resume', user_name: '应届毕业生', avatar: '生', rating: 5, text: '关键词优化后,投简历回复率从 5% 提到 22%。', date: '4 天前' },
    { id: 'rv_resume_2', workflow_id: 'wf_seed_resume', user_name: '某互联网 PM', avatar: 'P', rating: 4, text: '量化表述建议很专业,适合写到亮点项目。', date: '2 周前' },

    { id: 'rv_compete_1', workflow_id: 'wf_seed_compete', user_name: 'SaaS 创业者', avatar: 'S', rating: 5, text: '每周一收到周报,省下我自己刷竞品官网的时间,价值无价。', date: '1 周前' },
    { id: 'rv_compete_2', workflow_id: 'wf_seed_compete', user_name: '某市场负责人', avatar: 'M', rating: 5, text: '舆情监控部分尤其好,竞品负面热搜出来 30 分钟就能收到推送。', date: '3 周前' },

    { id: 'rv_trans_1', workflow_id: 'wf_seed_translate', user_name: '外贸业务员', avatar: '贸', rating: 5, text: '终于不用一段段丢进翻译器了,整篇文档保持格式翻译,客户直接能用。', date: '3 天前' },
    { id: 'rv_trans_2', workflow_id: 'wf_seed_translate', user_name: '跨境卖家 Leo', avatar: 'L', rating: 4, text: '日语和韩语翻译质量很高,小语种偶尔需要校对,但已经比 Google Translate 好太多。', date: '1 周前' },
    { id: 'rv_code_1', workflow_id: 'wf_seed_codereview', user_name: '全栈工程师', avatar: '码', rating: 5, text: '提交 PR 前先过一遍,能发现不少低级错误和潜在的安全隐患,相当于一个不知疲倦的 reviewer。', date: '2 天前' },
    { id: 'rv_code_2', workflow_id: 'wf_seed_codereview', user_name: 'CTO 小张', avatar: '张', rating: 5, text: '团队 15 人,用了之后 code review 效率提升明显,特别是能 catch 住内存泄漏问题。', date: '1 周前' },
    { id: 'rv_meeting_1', workflow_id: 'wf_seed_meeting', user_name: '产品经理 Amy', avatar: 'A', rating: 5, text: '开会再也不用边听边记了,录音传上去自动出纪要,还能识别不同人的发言。', date: '1 天前' },
    { id: 'rv_meeting_2', workflow_id: 'wf_seed_meeting', user_name: '某咨询公司', avatar: '咨', rating: 5, text: '客户访谈直接录音转纪要,效率提升 5 倍,待办事项自动提取太好用了。', date: '5 天前' },
    { id: 'rv_sql_1', workflow_id: 'wf_seed_sql', user_name: '数据分析师', avatar: '析', rating: 5, text: '不会写复杂 JOIN 的同事也能自己查数据了,减少了运营找我写 SQL 的次数。', date: '4 天前' },
    { id: 'rv_sql_2', workflow_id: 'wf_seed_sql', user_name: '后端实习生', avatar: '实', rating: 5, text: '免费的!学 SQL 的最佳工具,生成的查询还附带解释,相当于带教了。', date: '1 周前' },
    { id: 'rv_social_1', workflow_id: 'wf_seed_social', user_name: '新媒体运营', avatar: '媒', rating: 4, text: '内容日历规划省了很多时间,但希望能支持直接对接平台 API 定时发布。', date: '3 天前' },
    { id: 'rv_contract_1', workflow_id: 'wf_seed_contract', user_name: '创业公司 CEO', avatar: 'C', rating: 5, text: '签合同前先过一遍,标出的风险条款确实专业,请律师之前先自查一遍心里有底。', date: '6 天前' }
  ],
  ad_applications: [
    {
      id: 'ad_app_1',
      advertiser_name: '北京 XX 科技',
      contact: 'contact@xxtech.cn',
      workflow_name: '某 AI 写作工具',
      workflow_url: 'https://example-writing.com',
      workflow_desc: '专业的 AI 写作平台',
      slot: 'hero',
      price_model: 'package',
      price: 4200,
      status: 'pending',
      applied_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'ad_app_2',
      advertiser_name: '上海 XX 数据',
      contact: 'biz@xxdata.com',
      workflow_name: '某 SaaS 数据平台',
      workflow_url: 'https://example-data.com',
      workflow_desc: '企业级数据分析平台',
      slot: 'category_top',
      price_model: 'cpc',
      price: 1.5,
      status: 'pending',
      applied_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  tool_submissions: [
    {
      id: 'tool_sub_1',
      submitter_name: '陈同学',
      contact: 'chen@example.com',
      tool_name: 'PromptForge 提示词库',
      tool_url: 'https://example-promptforge.com',
      tool_desc: '面向中文运营和设计团队的提示词协作工具,支持团队收藏和版本管理。',
      category: '效率 · 办公',
      tags: ['提示词', '团队协作', '效率'],
      price_model: 'free',
      price_amount: 0,
      status: 'pending',
      admin_note: '',
      workflow_id: null,
      submitted_at: new Date(Date.now() - 43200000).toISOString(),
      reviewed_at: null
    },
    {
      id: 'tool_sub_2',
      submitter_name: '杭州某电商团队',
      contact: 'ops@example.com',
      tool_name: 'ModelShot 商品模特图',
      tool_url: 'https://example-modelshot.com',
      tool_desc: '上传平铺商品图后生成不同人群、场景和姿势的模特穿搭图。',
      category: '设计 · 海报',
      tags: ['电商', '模特图', 'AI 生图'],
      price_model: 'cpc',
      price_amount: 0.8,
      status: 'pending',
      admin_note: '',
      workflow_id: null,
      submitted_at: new Date(Date.now() - 7200000).toISOString(),
      reviewed_at: null
    }
  ]
};

// 推广位定义
const AD_SLOTS = [
  { id: 'hero', name: '首页 Hero 卡片', desc: '首页最显眼位置,独占整张大卡', daily_impressions: 18500, ctr_baseline: '15-25%', package_price: 4200, package_unit: '周', cpc_min: 2.5 },
  { id: 'featured', name: '本周精选位', desc: '首页本周精选区域,1 个共 5 个位置', daily_impressions: 12000, ctr_baseline: '8-12%', package_price: 2800, package_unit: '周', cpc_min: 1.5 },
  { id: 'category_top', name: '分类页置顶', desc: '指定分类页第一屏,1 个共 3 个位置', daily_impressions: 6500, ctr_baseline: '10-18%', package_price: 1800, package_unit: '周', cpc_min: 1.2 },
  { id: 'category_inline', name: '分类页腰部', desc: '指定分类页混排在卡片网格中', daily_impressions: 4200, ctr_baseline: '5-10%', package_price: 800, package_unit: '周', cpc_min: 0.6 },
  { id: 'sidebar', name: '工作流详情页侧栏', desc: '所有详情页右侧推荐栏', daily_impressions: 8800, ctr_baseline: '3-7%', package_price: 1200, package_unit: '周', cpc_min: 0.4 },
];

function normalizeDataShape(data) {
  if (!data || typeof data !== 'object') return JSON.parse(JSON.stringify(SEED_DATA));
  if (!Array.isArray(data.workflows)) data.workflows = [];
  data.workflows = data.workflows.filter(w => w && !REMOVED_SELF_WORKFLOW_IDS.has(w.id));
  const existingWorkflowIds = new Set(data.workflows.map(w => w && w.id).filter(Boolean));
  (SEED_DATA.workflows || []).forEach(seedWf => {
    if (!REMOVED_SELF_WORKFLOW_IDS.has(seedWf.id) && !existingWorkflowIds.has(seedWf.id)) {
      data.workflows.push(JSON.parse(JSON.stringify(seedWf)));
    }
  });
  if (!Array.isArray(data.clicks)) data.clicks = [];
  if (!Array.isArray(data.inline_runs)) data.inline_runs = [];
  if (!Array.isArray(data.reviews)) data.reviews = [];
  data.clicks = data.clicks.filter(c => !REMOVED_SELF_WORKFLOW_IDS.has(c.workflow_id));
  data.inline_runs = data.inline_runs.filter(r => !REMOVED_SELF_WORKFLOW_IDS.has(r.workflow_id));
  data.reviews = data.reviews.filter(r => !REMOVED_SELF_WORKFLOW_IDS.has(r.workflow_id));
  if (!Array.isArray(data.ad_applications)) data.ad_applications = [];
  if (!Array.isArray(data.ad_slots)) data.ad_slots = [];
  if (!Array.isArray(data.tool_submissions)) {
    data.tool_submissions = JSON.parse(JSON.stringify(SEED_DATA.tool_submissions || []));
  }
  return data;
}

function getData() {
  if (_apiCache) {
    const merged = Object.assign({}, _apiCache);
    if (_sessionUser !== null) merged.user = _sessionUser;
    if (_sessionNotifs !== null) merged._notifs = _sessionNotifs;
    return normalizeDataShape(merged);
  }
  if (!_memoryData) _memoryData = JSON.parse(JSON.stringify(SEED_DATA));
  return normalizeDataShape(_memoryData);
}

function saveData(data) {
  const normalized = normalizeDataShape(data);
  if (_apiCache) {
    _apiCache = normalizeDataShape({
      ..._apiCache,
      ...normalized,
      user: _apiCache.user,
      _notifs: _apiCache._notifs
    });
  } else {
    _memoryData = normalized;
  }
  if (data.user !== undefined) {
    _sessionUser = data.user;
  }
  if (data._notifs !== undefined) {
    _sessionNotifs = data._notifs;
  }
}

let _clickStats = null;
let _reviewsCache = {};
let _adminDataLoaded = false;

function authHeaders(extra) {
  const headers = Object.assign({}, extra || {});
  const token = window.FlowHubAuth?.getToken ? window.FlowHubAuth.getToken() : localStorage.getItem('flowhub_token');
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

function _parseWorkflow(w) {
  return {
    ...w,
    rating: parseFloat(w.rating) || 0,
    review_count: parseInt(w.review_count) || 0,
    seed_clicks: parseInt(w.seed_clicks) || 0,
    seed_clicks_7d: parseInt(w.seed_clicks_7d) || 0,
    price_amount: parseFloat(w.price_amount) || 0,
    gallery: Array.isArray(w.gallery) ? w.gallery : [],
    cover_image_url: w.cover_image_url || '',
    logo_url: w.logo_url || w.cover_image_url || '',
    examples: w.examples || []
  };
}

async function loadDataFromAPI() {
  try {
    const resp = await fetch(API_BASE + '/workflows?limit=100');
    const json = await resp.json();
    if (json.ok) {
      _apiCache = {
        workflows: json.data.workflows.map(_parseWorkflow),
        clicks: [],
        reviews: [],
        ad_applications: [],
        ad_slots: [],
        tool_submissions: [],
        user: null,
        _notifs: null
      };
      _apiLoaded = true;
      console.log('[FlowHub] Workflows loaded:', _apiCache.workflows.length);
      loadClickStatsAsync();
      loadAdDataAsync();
    }
  } catch (err) {
    console.warn('[FlowHub] API unavailable, using in-memory seed fallback:', err.message);
    _apiCache = null;
  }
}

async function loadAdminDataAsync() {
  if (!_apiLoaded || !_apiCache) return;
  try {
    const resp = await fetch(API_BASE + '/data', { headers: authHeaders() });
    const json = await resp.json();
    if (json.ok) {
      _apiCache = normalizeDataShape({
        ..._apiCache,
        workflows: (json.data.workflows || []).map(_parseWorkflow),
        reviews: json.data.reviews || [],
        clicks: json.data.clicks || [],
        ad_applications: json.data.ad_applications || [],
        ad_slots: json.data.ad_slots || [],
        tool_submissions: json.data.tool_submissions || [],
        user: _apiCache.user,
        _notifs: _apiCache._notifs
      });
      _adminDataLoaded = true;
      console.log('[FlowHub] Admin data loaded');
    }
  } catch (err) {
    console.warn('[FlowHub] Admin data load failed:', err.message);
  }
}

async function loadClickStatsAsync() {
  try {
    const resp = await fetch(API_BASE + '/clicks/stats');
    const json = await resp.json();
    if (json.ok) {
      _clickStats = json.data;
      console.log('[FlowHub] Click stats loaded');
    }
  } catch (err) {
    console.warn('[FlowHub] Click stats load failed:', err.message);
  }
}

async function loadAdDataAsync() {
  try {
    const [appsResp, slotsResp] = await Promise.all([
      fetch(API_BASE + '/ad-applications', { headers: authHeaders() }),
      fetch(API_BASE + '/ad-slots')
    ]);
    const [appsJson, slotsJson] = await Promise.all([appsResp.json(), slotsResp.json()]);
    if (appsJson.ok) _apiCache.ad_applications = appsJson.data.applications || [];
    if (slotsJson.ok) _apiCache.ad_slots = slotsJson.data.slots || [];
    normalizeDataShape(_apiCache);
    console.log('[FlowHub] Ad data loaded');
  } catch (err) {
    console.warn('[FlowHub] Ad data load failed:', err.message);
  }
}

async function loadReviewsForWorkflow(wfId) {
  if (_reviewsCache[wfId]) return _reviewsCache[wfId];
  try {
    const resp = await fetch(API_BASE + '/workflows/' + wfId + '/reviews?limit=50');
    const json = await resp.json();
    if (json.ok) {
      _reviewsCache[wfId] = json.data.reviews || [];
      return _reviewsCache[wfId];
    }
  } catch (err) {
    console.warn('[FlowHub] Reviews load failed for', wfId, err.message);
  }
  const data = getData();
  return (data.reviews || []).filter(r => r.workflow_id === wfId);
}

async function apiPost(path, body) {
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    return await resp.json();
  } catch (err) {
    console.warn('[FlowHub] API POST failed:', path, err.message);
    return { ok: false };
  }
}

async function apiPatch(path, body) {
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    return await resp.json();
  } catch (err) {
    console.warn('[FlowHub] API PATCH failed:', path, err.message);
    return { ok: false };
  }
}

async function apiPut(path, body) {
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    return await resp.json();
  } catch (err) {
    console.warn('[FlowHub] API PUT failed:', path, err.message);
    return { ok: false };
  }
}

async function apiForm(path, formData) {
  try {
    const resp = await fetch(API_BASE + path, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });
    return await resp.json();
  } catch (err) {
    console.warn('[FlowHub] API FORM failed:', path, err.message);
    return { ok: false, error: { message: '网络错误,请确认后端服务已启动' } };
  }
}

function resetAll() {
  if (!confirm('确定重置所有数据?会回到初始示例状态')) return;
  _memoryData = JSON.parse(JSON.stringify(SEED_DATA));
  _sessionNotifs = null;
  state.currentDetailId = null;
  state.adminView = 'overview';
  state.searchQuery = '';
  state.searchCategory = '全部';
  state.searchType = 'all';
  state.searchLoading = false;
  state.searchError = '';
  state.activeCategory = '全部';
  switchView('market');
  showToast('数据已重置');
}

/* =============================================================
   状态管理
   ============================================================= */
const state = {
  view: 'market',
  currentDetailId: null,
  currentRunId: null,
  adminView: 'overview',
  searchQuery: '',
  searchCategory: '全部',
  searchType: 'all',
  searchLoading: false,
  searchError: '',
  activeCategory: '全部',
  detailTab: 'about'
};

const VIEW_TITLES = {
  market: 'FlowHub · AI 工作流市场',
  search: '搜索 · FlowHub',
  detail: 'FlowHub',
  me: '个人中心 · FlowHub',
  admin: '管理后台 · FlowHub',
  creator: '创作者后台 · FlowHub',
  advertiser: '广告主入驻 · FlowHub',
  wizard: '接入向导 · FlowHub',
  run: '运行工作流 · FlowHub'
};

function getViewPath(view) {
  const basePath = location.pathname.endsWith('.html') ? location.pathname : '/';
  if (view === 'run') {
    const runId = state.currentRunId || '';
    return basePath + (runId ? '#run=' + encodeURIComponent(runId) : '#run');
  }
  return basePath + (view === 'market' ? '' : '#' + view);
}

function switchView(view, skipPush) {
  state.view = view;
  document.querySelectorAll('.demo-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view !== 'detail' && view !== 'run') document.title = VIEW_TITLES[view] || 'FlowHub';

  if (!skipPush) {
    history.pushState({ view }, '', getViewPath(view));
  }
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) {
    switchView(e.state.view, true);
  } else {
    switchView('market', true);
  }
});

(function initRoute() {
  const validViews = ['market', 'search', 'me', 'admin', 'creator', 'advertiser', 'wizard', 'detail', 'run'];
  const hashView = location.hash.replace(/^#\/?/, '');
  const pathView = location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'market';
  let initialView = validViews.includes(hashView)
    ? hashView
    : (validViews.includes(pathView) ? pathView : 'market');
  if (hashView.startsWith('run=')) {
    const runId = decodeURIComponent(hashView.slice(4));
    state.currentRunId = runId;
    state.currentDetailId = runId;
    initialView = 'run';
  }
  history.replaceState({ view: initialView }, '', getViewPath(initialView));
  if (initialView !== 'market') {
    setTimeout(() => switchView(initialView, true), 0);
  }
})();

document.querySelectorAll('.demo-pill').forEach(p => {
  p.addEventListener('click', () => switchView(p.dataset.view));
});

/* =============================================================
   工具函数
   ============================================================= */
function getClickCount(wfId) {
  if (_clickStats && _clickStats.by_workflow && _clickStats.by_workflow[wfId] !== undefined) {
    return _clickStats.by_workflow[wfId];
  }
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  return wf ? (wf.seed_clicks || 0) : 0;
}

function getClickCountInDays(wfId, days) {
  if (_clickStats && _clickStats.by_workflow_7d && _clickStats.by_workflow_7d[wfId] !== undefined) {
    return _clickStats.by_workflow_7d[wfId];
  }
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  return wf ? (wf.seed_clicks_7d || 0) : 0;
}

function formatPrice(wf, isAdmin) {
  if (isAdmin) {
    if (wf.price_model === 'free') return '免费';
    if (wf.price_model === 'pro') return 'Pro 会员';
    if (wf.price_model === 'cpc') return `CPC ¥${wf.price_amount}`;
    if (wf.price_model === 'cps') return `CPS ${wf.price_amount}%`;
    return '-';
  }
  if (wf.type === 'recommend') return '免费';
  if (wf.price_model === 'free') return '免费';
  if (wf.price_model === 'pro') return '会员专享';
  return '免费';
}

function priceClass(wf) {
  if (wf.price_model === 'free') return 'free';
  if (wf.price_model === 'pro') return 'pro';
  return '';
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.slice(0, 32);
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function jsString(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, '\\n');
}

function jsAttr(s) {
  return escapeHtml(jsString(s));
}

function getWorkflowLogo(wf) {
  return wf && (wf.logo_url || wf.cover_image_url || '');
}

function getPrimaryWorkflowImage(wf) {
  if (!wf) return '';
  if (Array.isArray(wf.gallery) && wf.gallery.length && wf.gallery[0]?.url) return wf.gallery[0].url;
  return wf.cover_image_url || wf.logo_url || '';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readImageInput(inputId, limit) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files.length) return [];
  const files = Array.from(input.files)
    .filter(file => file.type.startsWith('image/'))
    .slice(0, limit || 1);
  const items = [];
  for (const file of files) {
    const url = await fileToDataUrl(file);
    items.push({ label: file.name, url });
  }
  return items;
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
  if (half) html += '<i class="fas fa-star-half-stroke"></i>';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) html += '<i class="far fa-star"></i>';
  return html;
}

function showToast(msg, err) {
  const toast = document.getElementById('toast');
  const icon = toast.querySelector('i');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.toggle('err', !!err);
  icon.className = err ? 'fas fa-circle-exclamation' : 'fas fa-circle-check';
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function openModal(html) {
  const modalContent = document.getElementById('modal-content');
  modalContent.className = 'modal';
  modalContent.innerHTML = html;
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function updateUserStatus() {
  const data = getData();
  const status = document.getElementById('user-status');
  if (data.user) {
    status.textContent = `${data.user.name} · ${data.user.tier === 'pro' ? 'Pro' : '免费用户'}`;
  } else {
    status.textContent = '游客模式';
  }
}

/* =============================================================
   点击逻辑(用户端核心)
   ============================================================= */
function handleCardClick(e, wfId) {
  e.preventDefault();
  e.stopPropagation();
  goToDetail(wfId);
}

function goToDetail(wfId) {
  state.currentDetailId = wfId;
  state.detailTab = 'about';
  switchView('detail');
}

function goToRun(wfId) {
  state.currentRunId = wfId;
  state.currentDetailId = wfId;
  switchView('run');
}

function isPromotedWorkflow(wf) {
  return wf && wf.type === 'recommend' && ['cpc', 'cps', 'package'].includes(wf.price_model);
}

function getWorkflowTypeLabel(wf) {
  return wf.type === 'self' ? '站内工作流' : '外部工具';
}

function isInlineRunnerWorkflow(wf) {
  return !!wf && (VERIFIED_SELF_WORKFLOW_IDS.has(wf.id) || KEEP_IN_PROGRESS_SELF_WORKFLOW_IDS.has(wf.id));
}

function scrollToInlineRunner(wfId) {
  goToRun(wfId);
}

function scrollToInlineRunnerLegacy(wfId) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf || !isInlineRunnerWorkflow(wf)) return;
  if (state.view !== 'detail' || state.currentDetailId !== wfId) {
    state.currentDetailId = wfId;
    state.detailTab = 'about';
    switchView('detail');
    setTimeout(() => scrollToInlineRunner(wfId), 120);
    return;
  }
  if (state.detailTab !== 'about') {
    state.detailTab = 'about';
    renderDetail();
    setTimeout(() => scrollToInlineRunner(wfId), 80);
    return;
  }
  const runner = document.getElementById('inline-runner-' + wfId);
  if (!runner) return;
  runner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const input = runner.querySelector('input, textarea, select');
  if (input) setTimeout(() => input.focus({ preventScroll: true }), 360);
}

function openExternalWorkflow(wfId) {
  runWorkflow(wfId, { external: true, source: 'external_visit' });
}

function recordWorkflowClick(data, wfId, options = {}) {
  const searchQuery = options.search_query !== undefined
    ? options.search_query
    : (state.view === 'search' ? state.searchQuery : '');
  const clickObj = {
    id: 'clk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    workflow_id: wfId,
    user_id: data.user ? data.user.id : null,
    source: options.source || (state.view === 'search' ? 'search' : 'market'),
    search_query: searchQuery ? searchQuery.trim() : null,
    clicked_at: new Date().toISOString()
  };
  data.clicks.push(clickObj);
  saveData(data);
  if (_apiLoaded) {
    apiPost('/workflows/' + wfId + '/click', {
      source: clickObj.source,
      search_query: clickObj.search_query,
      user_id: data.user ? data.user.id : null
    });
  }
  return clickObj;
}

function openSearchResult(wfId) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf) return;
  recordWorkflowClick(data, wfId, {
    source: 'search_result',
    search_query: state.searchQuery
  });
  goToDetail(wfId);
}

function runWorkflow(wfId, options = {}) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf) return;
  const isInlineRunner = isInlineRunnerWorkflow(wf) && !options.external;

  // 权限校验:自营 + Pro 工作流需要 Pro 会员
  if (wf.type === 'self' && wf.price_model === 'pro') {
    if (!data.user) {
      showToast('请先登录', true);
      openLogin();
      return;
    }
    if (data.user.tier !== 'pro') {
      showToast('需要 Pro 会员才能使用', true);
      openPricing();
      return;
    }
  }

  // 防刷:同一 wf 5 秒内只算 1 次点击
  const recentClicks = data.clicks.filter(c =>
    c.workflow_id === wfId &&
    c.source !== 'search_result' &&
    (Date.now() - new Date(c.clicked_at).getTime()) < 5000
  );
  if (recentClicks.length > 0) {
    showToast('请稍后再点击', true);
    return;
  }

  // 记录点击
  recordWorkflowClick(data, wfId, {
    source: options.source || (state.view === 'search' ? 'search' : 'market'),
    search_query: options.search_query !== undefined ? options.search_query : state.searchQuery
  });

  if (isInlineRunner) {
    scrollToInlineRunner(wfId);
    showToast('已打开自营工作流执行面板');
    return;
  }

  // 找到立即使用按钮,显示加载状态
  const ctaButtons = document.querySelectorAll('.side-cta:not(.outline)');
  ctaButtons.forEach(btn => {
    if (btn.textContent.includes('立即使用') || btn.textContent.includes('解锁')) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;准备启动…';
    }
  });

  // 跳转(归因参数)
  const url = new URL(wf.target_url);
  url.searchParams.set('from', 'flowhub');
  url.searchParams.set('wf_id', wfId);
  if (data.user) url.searchParams.set('uid', data.user.id);

  if (wf.type === 'recommend') {
    showRedirectTransition(wf, url.toString());
    ctaButtons.forEach(btn => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-external-link-alt"></i>&nbsp;访问官网'; });
  } else {
    showToast(`正在启动 ${wf.name}…`);
    setTimeout(() => {
      ctaButtons.forEach(btn => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i>&nbsp;立即使用'; });
      render();
    }, 800);
  }
}

function showRedirectTransition(wf, targetUrl) {
  let countdown = 3;
  let host = '';
  try { host = new URL(targetUrl).hostname; } catch(e) { host = targetUrl; }
  const overlay = document.createElement('div');
  overlay.className = 'redirect-overlay';
  overlay.innerHTML = `
    <div class="redirect-card">
      <div class="redirect-icon" style="background:${wf.cover_color}22;color:${wf.cover_color}">
        <i class="fas fa-external-link-alt"></i>
      </div>
      <h3>即将离开 FlowHub</h3>
      <p class="redirect-target">${escapeHtml(wf.name)}</p>
      <p class="redirect-host">${escapeHtml(host)}</p>
      <div class="redirect-countdown">
        <div class="redirect-ring">
          <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="var(--line)" stroke-width="2.5"/><circle class="redirect-ring-fill" cx="20" cy="20" r="18" fill="none" stroke="${wf.cover_color}" stroke-width="2.5" stroke-dasharray="113" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 20 20)"/></svg>
          <span class="redirect-num">${countdown}</span>
        </div>
      </div>
      <p class="redirect-hint">秒后自动跳转</p>
      <div class="redirect-actions">
        <button class="redirect-go" onclick="window.open('${targetUrl.replace(/'/g, "\\'")}', '_blank'); this.closest('.redirect-overlay').remove()">
          <i class="fas fa-arrow-right"></i> 立即前往
        </button>
        <button class="redirect-cancel" onclick="this.closest('.redirect-overlay').remove()">取消</button>
      </div>
      <p class="redirect-disclaimer">你即将访问第三方网站,FlowHub 不对其内容负责</p>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const ring = overlay.querySelector('.redirect-ring-fill');
  const numEl = overlay.querySelector('.redirect-num');
  const step = 113 / countdown;
  const timer = setInterval(() => {
    countdown--;
    if (numEl) numEl.textContent = countdown;
    if (ring) ring.style.strokeDashoffset = (3 - countdown) * step;
    if (countdown <= 0) {
      clearInterval(timer);
      window.open(targetUrl, '_blank');
      overlay.remove();
    }
  }, 1000);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { clearInterval(timer); overlay.remove(); } });
}

/* =============================================================
   渲染 · 市场首页
   ============================================================= */
function renderMarket() {
  const data = getData();
  let workflows = data.workflows.filter(w => w.status === 'active');

  // 分类过滤
  if (state.activeCategory !== '全部') {
    workflows = workflows.filter(w => w.category === state.activeCategory);
  }

  const selfWfs = workflows.filter(w => w.type === 'self');
  const recWfs = workflows.filter(w => w.type === 'recommend');

  // 选一个 hero workflow(调用最多的自营工作流)
  const allSelf = data.workflows.filter(w => w.type === 'self' && w.status === 'active');
  const heroWf = allSelf
    .map(w => ({ ...w, _clicks: getClickCount(w.id) }))
    .sort((a, b) => b._clicks - a._clicks)[0] || allSelf[0];

  const showHero = state.activeCategory === '全部' && heroWf;

  document.getElementById('view-market').innerHTML = `
    ${renderNav()}
    <div class="container">
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content">
            <div class="hero-eyebrow">A WORKFLOW MARKETPLACE</div>
            <h1>先逛工作流,<span class="accent">需要时再登录</span></h1>
            <p class="hero-sub">不用登录也可以浏览、搜索和查看详情。当前自营区只保留已接真实处理链路的工具。</p>
            <div class="home-search-panel">
              <i class="fas fa-search"></i>
              <input id="home-search-input" type="text" placeholder="搜索 AI 工作流、外部工具或任务场景…" value="${escapeHtml(state.searchQuery)}" />
              <button onclick="startSearchFromInput('home-search-input')">
                <span>搜索</span>
                <i class="fas fa-arrow-right" style="margin:0;color:inherit"></i>
              </button>
            </div>
            <div class="hero-task-row">
              <span class="hero-task-label">热门任务</span>
              ${[
                ['Markdown', '文档转 Markdown'],
                ['OCR', '图片 OCR'],
                ['PDF', 'PDF 转文本'],
                ['截图', '截图转文字'],
                ['健身餐', '健身餐菜谱'],
                ['商品图', '商品图工具']
              ].map(([q, label]) => `<span class="hero-task-chip" onclick="quickSearch('${q}')">${label}</span>`).join('')}
            </div>
            <div class="hero-cta-row">
              ${data.user && data.user.tier === 'pro' ? `
                <button class="hero-cta-primary" onclick="switchView('me')">
                  <i class="fas fa-arrow-right" style="font-size:11px"></i>
                  开始你的工作流
                </button>
              ` : data.user ? `
                <button class="hero-cta-primary" onclick="openPricing()">
                  <i class="fas fa-crown" style="font-size:11px"></i>
                  升级 Pro · ¥39/月
                </button>
              ` : `
                <button class="hero-cta-primary" onclick="document.querySelector('.section').scrollIntoView({behavior:'smooth'})">
                  <i class="fas fa-compass" style="font-size:11px"></i>
                  先逛逛工作流
                </button>
              `}
              ${data.user ? `
                <button class="hero-cta-secondary" onclick="document.querySelector('.section').scrollIntoView({behavior:'smooth'})">
                  浏览全部工作流 →
                </button>
              ` : `
                <button class="hero-cta-secondary" onclick="openLogin()">
                  登录保存记录 →
                </button>
              `}
            </div>
            <div class="hero-trust-row">
              <span><i class="fas fa-circle-check"></i> 游客可浏览</span>
              <span><i class="fas fa-circle-check"></i> 自营工具已实测</span>
              <span><i class="fas fa-circle-check"></i> 第三方工具直达</span>
            </div>
          </div>
          <div class="hero-visual">
            ${renderHeroVisual(data)}
          </div>
        </div>
        <div class="hero-meta-bar">
          <div class="hero-meta-stats">
            <div class="hero-meta-stat">
              <span class="num">${data.workflows.length}</span>
              <span class="lbl">工作流</span>
            </div>
            <div class="hero-meta-divider"></div>
            <div class="hero-meta-stat">
              <span class="num">${(data.clicks.length + data.workflows.reduce((s,w) => s + (w.seed_clicks||0), 0) + 2148732).toLocaleString()}</span>
              <span class="lbl">累计调用</span>
            </div>
            <div class="hero-meta-divider"></div>
            <div class="hero-meta-stat">
              <span class="num">${selfWfs.length}</span>
              <span class="lbl">可用自营</span>
            </div>
            <div class="hero-meta-divider"></div>
            <div class="hero-meta-stat">
              <span class="num">4.8 <i class="fas fa-star" style="color:#F4B400;font-size:11px"></i></span>
              <span class="lbl">平均评分</span>
            </div>
          </div>
          <div class="hero-live">
            <span class="live-feed-label"><span class="ld"></span>LIVE</span>
            <div class="live-feed-scroll">
              <div class="live-feed-items" id="live-feed-items">
                ${renderLiveFeedItems()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="market-controls">
        <div class="market-control-main">
          <div class="hot-bar">
            <span class="hot-label">热门</span>
            <span class="hot-tag" onclick="quickSearch('Markdown')">文档转 Markdown<span class="trend">已验证</span></span>
            <span class="hot-tag" onclick="quickSearch('OCR')">图片 OCR</span>
            <span class="hot-tag" onclick="quickSearch('PDF')">PDF 解析</span>
            <span class="hot-tag" onclick="quickSearch('截图')">截图转文字</span>
            <span class="hot-tag" onclick="quickSearch('健身餐')">健身餐菜谱<span class="trend">NEW</span></span>
            <span class="hot-tag" onclick="quickSearch('商品图')">商品图工具</span>
          </div>
          <div class="filter-row">
            ${CATEGORIES.map(c => `
              <span class="cat-pill ${state.activeCategory === c ? 'active' : ''}" onclick="setCategory('${c}')">${c}</span>
            `).join('')}
          </div>
        </div>
        <span class="sort-trigger"><i class="fas fa-arrow-down-wide-short"></i> 最受欢迎</span>
      </div>

      <section class="section">
        <div class="section-head">
          <span class="sec-tag self">自营</span>
          <h2>${showHero ? `平台精选 · 本周首推 ${escapeHtml(heroWf.name)}` : '平台精选 · 已验证可用'}</h2>
          <span class="count">${selfWfs.length} 个</span>
        </div>
        <div class="market-grid-with-side">
          <div class="wf-grid">
            ${selfWfs.length === 0 && !_apiLoaded ? renderSkeletonCards(4) : selfWfs.length === 0 ? `<div class="empty">没有匹配的自营工作流</div>` : selfWfs.map(renderWfCard).join('')}
          </div>
          <aside class="market-side">
            ${renderTopRanking()}
            ${renderRecentActivity()}
          </aside>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <span class="sec-tag ad">推荐</span>
          <h2>合作伙伴 · 精选推荐</h2>
          <span class="count">${recWfs.length} 个</span>
        </div>
        <div class="wf-grid wf-grid-full">
          ${recWfs.length === 0 && !_apiLoaded ? renderSkeletonCards(3) : recWfs.length === 0 ? `<div class="empty">没有匹配的推荐工作流</div>` : recWfs.map(renderWfCard).join('')}
        </div>
      </section>

      <section class="creator-cta-section" style="margin:48px 0 32px;padding:40px 32px;background:linear-gradient(135deg, #1A1244 0%, #2A1C5C 50%, #3A2470 100%);border-radius:18px;text-align:center;position:relative;overflow:hidden">
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 50%, rgba(93,202,165,0.12) 0%, transparent 50%);pointer-events:none"></div>
        <div style="position:relative;z-index:1">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.5);margin-bottom:8px">Creator Program</div>
          <h2 style="font-family:'Noto Serif SC',serif;font-size:26px;font-weight:700;color:#fff;margin-bottom:8px">成为 FlowHub 创作者</h2>
          <p style="font-size:14px;color:rgba(255,255,255,0.65);margin-bottom:24px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7">
            上架你的 AI 工作流或推荐优质工具,获得流量曝光和收益分成。<br>创作者分成比例 70%,推荐位 CPC 低至 ¥0.4。
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="hero-cta-primary" onclick="openCreatorApply()" style="background:#5DCAA5;color:#0E0E0D;border:none">
              <i class="fas fa-rocket" style="font-size:12px"></i> 申请入驻
            </button>
            <button class="hero-cta-secondary" onclick="switchView('advertiser')" style="color:#fff;border-color:rgba(255,255,255,0.3)">
              了解推广位 →
            </button>
          </div>
          <div style="display:flex;justify-content:center;gap:32px;margin-top:24px;font-size:12px;color:rgba(255,255,255,0.45)">
            <span><i class="fas fa-check" style="color:#5DCAA5;margin-right:4px"></i>1-2 天审核</span>
            <span><i class="fas fa-check" style="color:#5DCAA5;margin-right:4px"></i>70% 分成</span>
            <span><i class="fas fa-check" style="color:#5DCAA5;margin-right:4px"></i>数据看板</span>
          </div>
        </div>
      </section>

      ${renderFooter()}
    </div>
  `;

}

function quickSearch(q) {
  state.activeCategory = '全部';
  addSearchHistory(q);
  hideSearchDropdown();
  startSearch(q);
}

function startSearchFromInput(inputId) {
  const input = document.getElementById(inputId);
  startSearch(input ? input.value : state.searchQuery);
}

function startSearch(q, options = {}) {
  const query = String(q || '').trim();
  state.searchQuery = query;
  state.searchError = '';
  state.searchLoading = true;
  if (!options.keepFilters) {
    state.searchCategory = '全部';
    state.searchType = 'all';
  }
  if (query.length >= 2) addSearchHistory(query);
  hideSearchDropdown();
  if (state.view !== 'search') {
    switchView('search');
  } else {
    render();
  }
  clearTimeout(window._flowhubSearchTimer);
  window._flowhubSearchTimer = setTimeout(() => {
    state.searchLoading = false;
    if (state.view === 'search') render();
  }, options.immediate ? 80 : 260);
}

function getSearchableText(wf) {
  return [
    wf.name,
    wf.tagline,
    wf.description,
    wf.category,
    ...(wf.tags || [])
  ].join(' ').toLowerCase();
}

function filterWorkflowsForSearch(workflows) {
  const query = state.searchQuery.trim().toLowerCase();
  return workflows.filter(wf => {
    if (query && !getSearchableText(wf).includes(query)) return false;
    if (state.searchCategory !== '全部' && wf.category !== state.searchCategory) return false;
    if (state.searchType === 'self' && wf.type !== 'self') return false;
    if (state.searchType === 'external' && wf.type !== 'recommend') return false;
    if (state.searchType === 'promo' && !isPromotedWorkflow(wf)) return false;
    return true;
  });
}

function getSearchTypeOptions(workflows) {
  return [
    { id: 'all', label: '全部类型', count: workflows.length },
    { id: 'self', label: '站内工作流', count: workflows.filter(w => w.type === 'self').length },
    { id: 'external', label: '外部工具', count: workflows.filter(w => w.type === 'recommend').length },
    { id: 'promo', label: '广告推广', count: workflows.filter(isPromotedWorkflow).length }
  ];
}

function setSearchCategory(c) {
  state.searchCategory = c;
  state.searchLoading = true;
  render();
  clearTimeout(window._flowhubSearchTimer);
  window._flowhubSearchTimer = setTimeout(() => {
    state.searchLoading = false;
    render();
  }, 160);
}

function setSearchType(t) {
  state.searchType = t;
  state.searchLoading = true;
  render();
  clearTimeout(window._flowhubSearchTimer);
  window._flowhubSearchTimer = setTimeout(() => {
    state.searchLoading = false;
    render();
  }, 160);
}

function clearSearchFilters() {
  state.searchQuery = '';
  state.searchCategory = '全部';
  state.searchType = 'all';
  state.searchLoading = false;
  state.searchError = '';
  render();
}

function getSearchHistory() {
  return _searchHistory;
}
function addSearchHistory(q) {
  if (!q || q.length < 2) return;
  let h = getSearchHistory().filter(x => x !== q);
  h.unshift(q);
  if (h.length > 8) h = h.slice(0, 8);
  _searchHistory = h;
}
function clearSearchHistory() {
  _searchHistory = [];
  showSearchDropdown();
}

function showSearchDropdown() {
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;
  const history = getSearchHistory();
  const hotTags = ['小红书', '商品图', '翻译', 'SQL', '海报', '会议纪要', '代码审查', '简历'];
  dd.innerHTML = `
    ${history.length > 0 ? `
      <div class="search-dropdown-section" style="display:flex;justify-content:space-between;align-items:center">
        <span>搜索历史</span>
        <span class="search-dropdown-clear" onclick="event.stopPropagation(); clearSearchHistory()">清除</span>
      </div>
      ${history.map(h => `
        <div class="search-dropdown-item" onclick="quickSearch('${escapeHtml(h)}')">
          <i class="fas fa-clock"></i><span>${escapeHtml(h)}</span>
        </div>
      `).join('')}
    ` : ''}
    <div class="search-dropdown-section">热门搜索</div>
    ${hotTags.map(t => `
      <div class="search-dropdown-item" onclick="quickSearch('${escapeHtml(t)}')">
        <i class="fas fa-fire" style="color:var(--ad)"></i><span>${escapeHtml(t)}</span>
      </div>
    `).join('')}
  `;
  dd.classList.add('show');
}
function hideSearchDropdown() {
  const dd = document.getElementById('search-dropdown');
  if (dd) dd.classList.remove('show');
}

function bindSearchBox(input, options = {}) {
  if (!input) return;
  input.value = state.searchQuery;
  let timer = null;
  input.addEventListener('input', (e) => {
    const query = e.target.value;
    state.searchQuery = query;
    state.searchError = '';
    if (options.dropdown) hideSearchDropdown();
    clearTimeout(timer);
    timer = setTimeout(() => {
      startSearch(query, { keepFilters: true });
    }, query.trim() ? 280 : 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startSearch(input.value, { keepFilters: true, immediate: true });
    }
  });
}

function bindGlobalSearch() {
  const activeView = document.getElementById('view-' + state.view);
  if (!activeView) return;
  bindSearchBox(activeView.querySelector('.cnav-search input'), { dropdown: true });
  bindSearchBox(activeView.querySelector('#home-search-input'));
  bindSearchBox(activeView.querySelector('#search-page-input'), { searchPage: true });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#cnav-search-wrap')) hideSearchDropdown();
});

// Hero 右侧动态视觉
function renderHeroVisual(data) {
  const featured = data.workflows
    .filter(w => w.status === 'active')
    .map(w => ({ ...w, _score: getClickCount(w.id) + (w.review_count || 0) * 8 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
  const hero = featured[0];
  if (!hero) return '';
  const secondary = featured.slice(1, 5);
  return `
    <div class="hero-product-panel">
      <div class="hero-product-top">
        <div>
          <span class="hero-product-kicker">Trending now</span>
          <h3>今天先从这些开始</h3>
        </div>
        <button class="hero-product-action" onclick="document.querySelector('.section').scrollIntoView({behavior:'smooth'})">
          <i class="fas fa-arrow-trend-up"></i> 看热门
        </button>
      </div>
      <div class="hero-feature-workflow" onclick="goToDetail('${hero.id}')">
        <div class="hero-feature-thumb">
          ${getThumbSvg(hero, 'card')}
        </div>
        <div class="hero-feature-body">
          <div class="hero-feature-meta">
            <span class="wf-badge ${hero.type === 'self' ? 'self' : 'ad'}">${hero.type === 'self' ? '自营' : '推荐'}</span>
            <span class="wf-price ${priceClass(hero)}">${formatPrice(hero)}</span>
          </div>
          <h4>${escapeHtml(hero.name)}</h4>
          <p>${escapeHtml(hero.tagline || hero.description.slice(0, 72))}</p>
          <div class="hero-feature-foot">
            <span><i class="fas fa-star" style="color:#F4B400"></i> ${hero.rating}</span>
            <span>${getClickCount(hero.id).toLocaleString()} 次调用</span>
            <span>${escapeHtml(hero.category)}</span>
          </div>
        </div>
      </div>
      <div class="hero-mini-grid">
        ${secondary.map(w => `
          <div class="hero-mini-workflow" onclick="goToDetail('${w.id}')">
            <div class="hvc-icon" style="background:${w.cover_color}22; color:${w.cover_color}">${escapeHtml(w.name.charAt(0))}</div>
            <div class="hvc-info">
              <div class="hvc-name">${escapeHtml(w.name)}</div>
              <div class="hvc-meta">
                <span>${w.type === 'self' ? '站内' : '外部'}</span>
                <span>${w.rating} ★</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="hero-path-row">
        <span><i class="fas fa-search"></i> 搜索任务</span>
        <span><i class="fas fa-arrow-right"></i></span>
        <span><i class="fas fa-play"></i> 试用工作流</span>
        <span><i class="fas fa-arrow-right"></i></span>
        <span><i class="fas fa-bookmark"></i> 登录后保存记录</span>
      </div>
    </div>
  `;
}

/* ============== 排行榜 / 动态 / Footer ============== */
function renderTopRanking() {
  const data = getData();
  const rankings = data.workflows
    .filter(w => w.status === 'active')
    .map(w => ({ ...w, _score: getClickCount(w.id) + (w.review_count || 0) * 5 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);

  return `
    <div class="side-card">
      <div class="side-card-head">
        <div class="side-card-title">
          <i class="fas fa-trophy" style="color:#F4B400;font-size:12px"></i>
          本周排行
        </div>
        <span class="side-card-sub">TOP 5</span>
      </div>
      <div class="side-card-body">
        ${rankings.map((w, i) => `
          <div class="rank-item" onclick="goToDetail('${w.id}')">
            <div class="rank-num ${i < 3 ? 'top' : ''}">${i + 1}</div>
            <div class="rank-icon" style="background:${w.cover_color}22;color:${w.cover_color}">${w.name.charAt(0)}</div>
            <div class="rank-info">
              <div class="rank-name">${escapeHtml(w.name)}</div>
              <div class="rank-meta">
                <i class="fas fa-star" style="font-size:9px;color:#F4B400"></i> ${w.rating} · ${escapeHtml(w.category)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRecentActivity() {
  const items = [
    { icon: 'fa-user-plus', color: '#1A5D3A', text: '<strong>3 人</strong> 刚刚升级 Pro' },
    { icon: 'fa-fire', color: '#FF4D4D', text: '<strong>PicSpark</strong> 本周热度 +42%' },
    { icon: 'fa-star', color: '#F4B400', text: '<strong>5 条</strong> 新 5 星评价' },
    { icon: 'fa-bullhorn', color: '#B85C00', text: '<strong>2 个</strong> 推广位招商中' }
  ];

  return `
    <div class="side-card">
      <div class="side-card-head">
        <div class="side-card-title">
          <i class="fas fa-bolt" style="color:#5DCAA5;font-size:12px"></i>
          平台动态
        </div>
        <span class="side-card-sub">实时</span>
      </div>
      <div class="side-card-body">
        ${items.map(it => `
          <div class="activity-item">
            <div class="activity-icon" style="background:${it.color}22;color:${it.color}">
              <i class="fas ${it.icon}"></i>
            </div>
            <div class="activity-text">${it.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="footer-cols">
        <div class="footer-col">
          <div class="footer-brand">
            ${renderBrandMark('footer-logo brand-mark')}
            <span class="footer-name">FlowHub</span>
          </div>
          <p class="footer-tagline">让 AI 工作流触手可及 · 当前只展示可验证的自营工具和外部推荐。</p>
          <div class="footer-social">
            <button class="footer-social-btn" title="微信"><i class="fab fa-weixin"></i></button>
            <button class="footer-social-btn" title="微博"><i class="fab fa-weibo"></i></button>
            <button class="footer-social-btn" title="X"><i class="fab fa-twitter"></i></button>
            <button class="footer-social-btn" title="GitHub"><i class="fab fa-github"></i></button>
            <button class="footer-social-btn" title="邮箱"><i class="fas fa-envelope"></i></button>
          </div>
        </div>
        <div class="footer-col">
          <h5>产品</h5>
          <a onclick="switchView('market')">工作流市场</a>
          <a onclick="switchView('advertiser')">广告主入驻</a>
          <a onclick="switchView('creator')">创作者中心</a>
        </div>
        <div class="footer-col">
          <h5>资源</h5>
          <a onclick="switchView('wizard')">接入文档</a>
          <a onclick="toggleChatbot()">联系客服</a>
          <a onclick="openFooterPage('tutorial')">使用教程</a>
          <a onclick="openFooterPage('blog')">开发者博客</a>
        </div>
        <div class="footer-col">
          <h5>公司</h5>
          <a onclick="openFooterPage('about')">关于我们</a>
          <a onclick="openFooterPage('jobs')">加入我们</a>
          <a onclick="openFooterPage('media')">媒体合作</a>
          <a onclick="toggleChatbot()">意见反馈</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 FlowHub · 工作流市场平台</span>
        <div class="footer-bottom-links">
          <a onclick="openFooterPage('terms')">服务条款</a>
          <a onclick="openFooterPage('privacy')">隐私协议</a>
          <a onclick="openFooterPage('cookie')">Cookie 设置</a>
          <a>ICP 备 2026XXXX 号</a>
        </div>
      </div>
    </footer>
  `;
}

/* ============== 实时调用瀑布流 ============== */
const LIVE_USERS = ['用户***18', '小红书运营***', '电商小赵***', '某 MCN***', '跨境老王***', '设计师***', '咖啡店主***', '宝妈***', '某独立站***', '内容创业者***'];
const LIVE_ACTIONS = ['正在使用', '调用了', '订阅了', '收藏了', '完成了', '推荐了'];

function renderLiveFeedItems() {
  const data = getData();
  const wfs = data.workflows.filter(w => w.status === 'active');
  const items = [];
  for (let i = 0; i < 8; i++) {
    const user = LIVE_USERS[Math.floor(Math.random() * LIVE_USERS.length)];
    const wf = wfs[Math.floor(Math.random() * wfs.length)];
    const action = LIVE_ACTIONS[Math.floor(Math.random() * LIVE_ACTIONS.length)];
    if (!wf) continue;
    const seconds = Math.floor(Math.random() * 60);
    items.push(`<div class="live-feed-item"><strong>${user}</strong> ${action} <span class="wf-name">${escapeHtml(wf.name)}</span> · ${seconds} 秒前</div>`);
  }
  return items.join('');
}

let liveFeedTimer = null;
function startLiveFeed() {
  if (liveFeedTimer) clearInterval(liveFeedTimer);
  liveFeedTimer = setInterval(() => {
    const container = document.getElementById('live-feed-items');
    if (!container) return;
    // 添加新的一行到顶部
    const data = getData();
    const wfs = data.workflows.filter(w => w.status === 'active');
    if (wfs.length === 0) return;
    const user = LIVE_USERS[Math.floor(Math.random() * LIVE_USERS.length)];
    const wf = wfs[Math.floor(Math.random() * wfs.length)];
    const action = LIVE_ACTIONS[Math.floor(Math.random() * LIVE_ACTIONS.length)];
    const newItem = document.createElement('div');
    newItem.className = 'live-feed-item';
    newItem.innerHTML = `<strong>${user}</strong> ${action} <span class="wf-name">${escapeHtml(wf.name)}</span> · 刚刚`;
    newItem.style.cssText = 'opacity: 0; transition: opacity 0.5s';
    container.insertBefore(newItem, container.firstChild);
    setTimeout(() => newItem.style.opacity = '1', 50);
    // 移除底部多余项
    while (container.children.length > 12) {
      container.removeChild(container.lastChild);
    }
    // 平移动画
    container.style.transform = 'translateY(-18px)';
    setTimeout(() => {
      container.style.transition = 'none';
      container.style.transform = 'translateY(0)';
      container.removeChild(container.firstChild);
      setTimeout(() => {
        container.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
      }, 50);
    }, 500);
  }, 3000);
}

function getThumbSvg(wf, type) {
  const realImage = getPrimaryWorkflowImage(wf);
  if (realImage) {
    return `<img src="${escapeHtml(realImage)}" alt="${escapeHtml(wf.name)}">`;
  }
  const color = wf.cover_color;
  const cat = wf.category;
  const uid = wf.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);

  // PicSpark / 商品图 - 模拟电商前后对比
  if (wf.name.includes('PicSpark') || wf.name.includes('商品图')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bg-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FAFAF7"/>
          <stop offset="100%" stop-color="#F2F1ED"/>
        </linearGradient>
        <linearGradient id="bg2-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFE9D6"/>
          <stop offset="100%" stop-color="#FFCB94"/>
        </linearGradient>
        <radialGradient id="prod-${uid}" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="60%" stop-color="${color}44"/>
          <stop offset="100%" stop-color="${color}"/>
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#bg-${uid})"/>
      <!-- 左侧:白底原图 -->
      <rect x="20" y="20" width="130" height="160" rx="6" fill="white" stroke="${color}22" stroke-width="1"/>
      <text x="32" y="38" font-family="monospace" font-size="9" fill="${color}99" font-weight="600">BEFORE</text>
      <ellipse cx="85" cy="100" rx="38" ry="50" fill="url(#prod-${uid})" opacity="0.95"/>
      <ellipse cx="85" cy="150" rx="32" ry="6" fill="${color}22"/>
      <rect x="32" y="160" width="60" height="2" rx="1" fill="${color}66"/>
      <rect x="32" y="166" width="40" height="2" rx="1" fill="${color}44"/>
      <!-- 中间箭头 -->
      <circle cx="160" cy="100" r="14" fill="${color}"/>
      <path d="M 156 96 L 162 100 L 156 104 Z" fill="white"/>
      <text x="160" y="125" font-family="monospace" font-size="7" fill="${color}" text-anchor="middle" font-weight="700">AI</text>
      <!-- 右侧:场景图 -->
      <rect x="170" y="20" width="130" height="160" rx="6" fill="url(#bg2-${uid})"/>
      <text x="182" y="38" font-family="monospace" font-size="9" fill="#8C4A00" font-weight="600">AFTER</text>
      <!-- 模拟场景元素 -->
      <rect x="180" y="50" width="110" height="80" rx="3" fill="#FFFFFF" opacity="0.25"/>
      <ellipse cx="235" cy="105" rx="36" ry="48" fill="url(#prod-${uid})" opacity="0.95"/>
      <circle cx="200" cy="60" r="6" fill="#FFFFFF" opacity="0.5"/>
      <circle cx="285" cy="70" r="4" fill="#FFFFFF" opacity="0.4"/>
      <rect x="180" y="148" width="40" height="3" rx="1" fill="#8C4A00" opacity="0.6"/>
      <rect x="180" y="156" width="60" height="2" rx="1" fill="#8C4A00" opacity="0.4"/>
      <rect x="180" y="166" width="32" height="8" rx="2" fill="${color}"/>
      <text x="196" y="172" font-family="serif" font-size="7" fill="white" text-anchor="middle" font-weight="700">立即购买</text>
    </svg>`;
  }

  // 品牌色板
  if (wf.name.includes('色板') || wf.name.includes('品牌')) {
    const palette = ['#1A5D3A', '#B83A6B', '#5B3FA8', '#FFD6A5', '#1E3A8A', '#B85C00'];
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FFFFFF"/>
      ${palette.map((c, i) => `<rect x="${20 + i * 47}" y="40" width="40" height="100" rx="6" fill="${c}"/>`).join('')}
      ${palette.map((c, i) => `<text x="${40 + i * 47}" y="155" font-family="monospace" font-size="7" fill="${c}" text-anchor="middle" font-weight="600">${c.slice(1)}</text>`).join('')}
      <text x="20" y="28" font-family="serif" font-size="11" fill="#0F0F0E" font-weight="700">品牌主色板</text>
      <text x="20" y="180" font-family="monospace" font-size="9" fill="#6B6963">6 种主色 · 自动生成应用规范</text>
    </svg>`;
  }

  // 小红书 / 文案类 - 模拟手机笔记
  if (cat.includes('写作') || cat.includes('文案') || wf.name.includes('小红书')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg3-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFE4EC"/>
          <stop offset="100%" stop-color="#FFD0E0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#bg3-${uid})"/>
      <!-- 手机外壳 -->
      <rect x="110" y="14" width="100" height="172" rx="14" fill="#0F0F0E"/>
      <rect x="114" y="20" width="92" height="160" rx="10" fill="white"/>
      <!-- 顶部状态栏 -->
      <rect x="120" y="26" width="80" height="3" rx="1" fill="#F0F0EC"/>
      <!-- 用户信息 -->
      <circle cx="128" cy="42" r="6" fill="${color}"/>
      <rect x="138" y="38" width="32" height="3" rx="1" fill="#0F0F0E"/>
      <rect x="138" y="44" width="22" height="2" rx="1" fill="#A5A39C"/>
      <rect x="180" y="38" width="22" height="10" rx="5" fill="#FF2442"/>
      <text x="191" y="45" font-family="serif" font-size="6" fill="white" text-anchor="middle" font-weight="700">+关注</text>
      <!-- 封面 -->
      <rect x="120" y="54" width="80" height="58" rx="4" fill="${color}33"/>
      <circle cx="160" cy="78" r="14" fill="${color}88"/>
      <text x="160" y="83" font-family="serif" font-size="14" fill="white" text-anchor="middle" font-weight="700">✨</text>
      <text x="160" y="102" font-family="serif" font-size="6" fill="${color}" text-anchor="middle" font-weight="600">封面图</text>
      <!-- 标题 -->
      <text x="120" y="124" font-family="serif" font-size="8" fill="#0F0F0E" font-weight="700">敏感肌姐妹冲!</text>
      <text x="120" y="135" font-family="serif" font-size="8" fill="#0F0F0E" font-weight="700">平价精华水好用爆</text>
      <rect x="120" y="142" width="80" height="2" rx="1" fill="#A5A39C"/>
      <rect x="120" y="148" width="60" height="2" rx="1" fill="#A5A39C"/>
      <!-- 标签 -->
      <rect x="120" y="156" width="22" height="9" rx="4.5" fill="${color}22"/>
      <text x="131" y="162" font-family="serif" font-size="6" fill="${color}" text-anchor="middle">#护肤</text>
      <rect x="146" y="156" width="22" height="9" rx="4.5" fill="${color}22"/>
      <text x="157" y="162" font-family="serif" font-size="6" fill="${color}" text-anchor="middle">#平价</text>
      <!-- 互动 -->
      <text x="120" y="174" font-family="monospace" font-size="6" fill="#A5A39C">♥ 12.3k · 💬 892 · ⭐ 4.8k</text>
    </svg>`;
  }

  // 翻译 / 多语言
  if (wf.name.includes('翻译') || cat.includes('翻译')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#F2F1ED"/>
      <!-- 中文卡 -->
      <rect x="20" y="30" width="120" height="140" rx="8" fill="white" stroke="${color}33" stroke-width="1"/>
      <text x="32" y="50" font-family="monospace" font-size="9" fill="${color}" font-weight="600">中文</text>
      <text x="32" y="74" font-family="serif" font-size="22" fill="#0F0F0E" font-weight="700">你好</text>
      <text x="32" y="92" font-family="serif" font-size="14" fill="#3A3935">世界</text>
      <rect x="32" y="105" width="92" height="2" rx="1" fill="${color}33"/>
      <text x="32" y="125" font-family="monospace" font-size="8" fill="#6B6963">原文 · 中文</text>
      <text x="32" y="155" font-family="monospace" font-size="7" fill="${color}">[准确率 99.2%]</text>
      <!-- 箭头 -->
      <g transform="translate(160 100)">
        <circle cx="0" cy="0" r="16" fill="${color}"/>
        <path d="M -5 -3 L 3 0 L -5 3 Z" fill="white"/>
        <path d="M -1 -3 L 7 0 L -1 3 Z" fill="white" opacity="0.6"/>
      </g>
      <!-- 多语言卡 -->
      <rect x="180" y="30" width="120" height="140" rx="8" fill="${color}"/>
      <text x="192" y="50" font-family="monospace" font-size="9" fill="white" font-weight="600" opacity="0.9">已翻译 5 种</text>
      <text x="192" y="72" font-family="serif" font-size="14" fill="white" font-weight="700">Hello World</text>
      <text x="192" y="92" font-family="serif" font-size="12" fill="white" opacity="0.85">こんにちは</text>
      <text x="192" y="110" font-family="serif" font-size="12" fill="white" opacity="0.7">안녕하세요</text>
      <text x="192" y="128" font-family="serif" font-size="11" fill="white" opacity="0.55">Hola Mundo</text>
      <text x="192" y="144" font-family="serif" font-size="11" fill="white" opacity="0.4">Bonjour</text>
      <text x="192" y="160" font-family="monospace" font-size="7" fill="white" opacity="0.6">+ 中文 / 阿语 / 德语</text>
    </svg>`;
  }

  // 数据分析
  if (cat.includes('数据') || wf.name.includes('监控') || wf.name.includes('竞品')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <rect x="20" y="20" width="280" height="160" rx="8" fill="white" stroke="${color}22" stroke-width="1"/>
      <!-- 标题栏 -->
      <text x="34" y="42" font-family="serif" font-size="11" fill="#0F0F0E" font-weight="700">竞品监控周报</text>
      <rect x="34" y="48" width="60" height="2" rx="1" fill="${color}"/>
      <text x="240" y="42" font-family="monospace" font-size="9" fill="${color}" font-weight="600">↑42.3%</text>
      <text x="240" y="54" font-family="monospace" font-size="7" fill="#A5A39C" text-anchor="start">vs 上周</text>
      <!-- 柱状图 -->
      <rect x="36" y="120" width="22" height="38" fill="${color}22"/>
      <rect x="62" y="110" width="22" height="48" fill="${color}44"/>
      <rect x="88" y="98" width="22" height="60" fill="${color}66"/>
      <rect x="114" y="86" width="22" height="72" fill="${color}88"/>
      <rect x="140" y="74" width="22" height="84" fill="${color}aa"/>
      <rect x="166" y="62" width="22" height="96" fill="${color}cc"/>
      <rect x="192" y="50" width="22" height="108" fill="${color}"/>
      <!-- 折线 -->
      <polyline points="47,118 73,108 99,96 125,84 151,72 177,60 203,48" fill="none" stroke="#F4B400" stroke-width="2" stroke-linecap="round"/>
      <circle cx="203" cy="48" r="3" fill="#F4B400"/>
      <!-- 右侧 KPI -->
      <rect x="224" y="74" width="64" height="46" rx="4" fill="${color}11"/>
      <text x="256" y="88" font-family="monospace" font-size="7" fill="${color}" text-anchor="middle">本周 PV</text>
      <text x="256" y="106" font-family="serif" font-size="14" fill="${color}" text-anchor="middle" font-weight="700">8,432</text>
      <rect x="224" y="124" width="64" height="34" rx="4" fill="#F4B40022"/>
      <text x="256" y="138" font-family="monospace" font-size="7" fill="#8A6500" text-anchor="middle">舆情指数</text>
      <text x="256" y="152" font-family="serif" font-size="12" fill="#8A6500" text-anchor="middle" font-weight="700">+18 pts</text>
      <!-- 底部时间轴 -->
      <text x="47" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周一</text>
      <text x="73" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周二</text>
      <text x="99" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周三</text>
      <text x="125" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周四</text>
      <text x="151" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周五</text>
      <text x="177" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周六</text>
      <text x="203" y="172" font-family="monospace" font-size="6" fill="#A5A39C">周日</text>
    </svg>`;
  }

  // 代码 / IDE
  if (cat.includes('代码') || cat.includes('开发')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#1A1A18"/>
      <!-- 窗口控制 -->
      <circle cx="18" cy="16" r="4" fill="#FF5F56"/>
      <circle cx="32" cy="16" r="4" fill="#FFBD2E"/>
      <circle cx="46" cy="16" r="4" fill="#27C93F"/>
      <text x="160" y="20" font-family="monospace" font-size="8" fill="#6B6963" text-anchor="middle">workflow.ts — FlowHub</text>
      <line x1="0" y1="30" x2="320" y2="30" stroke="rgba(255,255,255,0.05)"/>
      <!-- 代码内容 -->
      <text x="20" y="50" font-family="monospace" font-size="9" fill="#6B6963">1</text>
      <text x="38" y="50" font-family="monospace" font-size="9" fill="#C5A3FF">import</text>
      <text x="74" y="50" font-family="monospace" font-size="9" fill="white">{ ai }</text>
      <text x="106" y="50" font-family="monospace" font-size="9" fill="#C5A3FF">from</text>
      <text x="132" y="50" font-family="monospace" font-size="9" fill="#FFD6A5">'flowhub'</text>
      <text x="20" y="68" font-family="monospace" font-size="9" fill="#6B6963">2</text>
      <text x="20" y="86" font-family="monospace" font-size="9" fill="#6B6963">3</text>
      <text x="38" y="86" font-family="monospace" font-size="9" fill="#C5A3FF">export async function</text>
      <text x="160" y="86" font-family="monospace" font-size="9" fill="#5DCAA5">workflow</text>
      <text x="200" y="86" font-family="monospace" font-size="9" fill="white">(input) {</text>
      <text x="20" y="104" font-family="monospace" font-size="9" fill="#6B6963">4</text>
      <text x="50" y="104" font-family="monospace" font-size="9" fill="#C5A3FF">const</text>
      <text x="82" y="104" font-family="monospace" font-size="9" fill="white">result =</text>
      <text x="128" y="104" font-family="monospace" font-size="9" fill="#C5A3FF">await</text>
      <text x="156" y="104" font-family="monospace" font-size="9" fill="#5DCAA5">ai.run</text>
      <text x="186" y="104" font-family="monospace" font-size="9" fill="white">(input)</text>
      <text x="20" y="122" font-family="monospace" font-size="9" fill="#6B6963">5</text>
      <text x="50" y="122" font-family="monospace" font-size="9" fill="#C5A3FF">return</text>
      <text x="86" y="122" font-family="monospace" font-size="9" fill="white">result.</text>
      <text x="116" y="122" font-family="monospace" font-size="9" fill="#FFD6A5">format</text>
      <text x="146" y="122" font-family="monospace" font-size="9" fill="white">()</text>
      <text x="20" y="140" font-family="monospace" font-size="9" fill="#6B6963">6</text>
      <text x="38" y="140" font-family="monospace" font-size="9" fill="white">}</text>
      <!-- 底部状态栏 -->
      <line x1="0" y1="158" x2="320" y2="158" stroke="rgba(255,255,255,0.05)"/>
      <circle cx="22" cy="174" r="3" fill="#5DCAA5"/>
      <text x="32" y="178" font-family="monospace" font-size="8" fill="#5DCAA5">AI Review · 通过 12 / 12 检查</text>
      <text x="270" y="178" font-family="monospace" font-size="8" fill="${color}" text-anchor="start">${wf.rating}★</text>
    </svg>`;
  }

  // 简历
  if (wf.name.includes('简历')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <!-- 左侧简历 -->
      <rect x="20" y="14" width="130" height="172" rx="4" fill="white" stroke="#E0DFD9" stroke-width="1"/>
      <circle cx="40" cy="34" r="10" fill="${color}44"/>
      <rect x="56" y="28" width="50" height="4" rx="1" fill="#0F0F0E"/>
      <rect x="56" y="37" width="40" height="3" rx="1" fill="#A5A39C"/>
      <line x1="28" y1="52" x2="142" y2="52" stroke="#E0DFD9"/>
      <text x="28" y="68" font-family="monospace" font-size="7" fill="${color}" font-weight="600">EXPERIENCE</text>
      <rect x="28" y="76" width="35" height="3" rx="1" fill="#0F0F0E"/>
      <rect x="28" y="84" width="100" height="2" rx="1" fill="#A5A39C"/>
      <rect x="28" y="91" width="90" height="2" rx="1" fill="#A5A39C"/>
      <rect x="28" y="98" width="80" height="2" rx="1" fill="#A5A39C"/>
      <text x="28" y="118" font-family="monospace" font-size="7" fill="${color}" font-weight="600">SKILLS</text>
      <rect x="28" y="126" width="100" height="2" rx="1" fill="#A5A39C"/>
      <rect x="28" y="133" width="90" height="2" rx="1" fill="#A5A39C"/>
      <text x="28" y="155" font-family="monospace" font-size="7" fill="${color}" font-weight="600">EDUCATION</text>
      <rect x="28" y="163" width="80" height="2" rx="1" fill="#A5A39C"/>
      <rect x="28" y="170" width="60" height="2" rx="1" fill="#A5A39C"/>
      <!-- 右侧分析面板 -->
      <rect x="160" y="14" width="140" height="172" rx="4" fill="${color}" opacity="0.92"/>
      <text x="172" y="36" font-family="serif" font-size="11" fill="white" font-weight="700">AI 分析报告</text>
      <text x="172" y="48" font-family="monospace" font-size="8" fill="white" opacity="0.7">针对目标岗位</text>
      <!-- 评分 -->
      <text x="172" y="74" font-family="monospace" font-size="8" fill="white" opacity="0.7">综合评分</text>
      <text x="172" y="98" font-family="serif" font-size="28" fill="white" font-weight="700">87</text>
      <text x="208" y="92" font-family="monospace" font-size="9" fill="white" opacity="0.6">/100</text>
      <text x="218" y="98" font-family="monospace" font-size="9" fill="#FFD6A5" font-weight="700">+12 分</text>
      <line x1="172" y1="108" x2="290" y2="108" stroke="white" stroke-opacity="0.15"/>
      <!-- 建议项 -->
      <text x="172" y="126" font-family="monospace" font-size="8" fill="white" opacity="0.9">✓ 关键词匹配 92%</text>
      <text x="172" y="142" font-family="monospace" font-size="8" fill="white" opacity="0.9">✓ 量化数据丰富</text>
      <text x="172" y="158" font-family="monospace" font-size="8" fill="#FFD6A5" opacity="1">⚠ 建议增加领导力</text>
      <text x="172" y="174" font-family="monospace" font-size="8" fill="#FFD6A5" opacity="1">⚠ 项目周期标注</text>
    </svg>`;
  }

  // 海报 / 设计类
  if (wf.name.includes('海报') || (cat.includes('设计') && !wf.name.includes('PicSpark') && !wf.name.includes('商品图') && !wf.name.includes('色板') && !wf.name.includes('品牌'))) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="poster-${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${color}CC"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="#F2F1ED"/>
      <!-- 画布 -->
      <rect x="80" y="12" width="160" height="176" rx="4" fill="url(#poster-${uid})" stroke="${color}" stroke-width="1"/>
      <!-- 装饰圆环 -->
      <circle cx="160" cy="72" r="30" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
      <circle cx="160" cy="72" r="20" fill="none" stroke="white" stroke-width="1" opacity="0.6"/>
      <circle cx="160" cy="72" r="10" fill="white" opacity="0.15"/>
      <!-- 标题区 -->
      <rect x="110" y="112" width="100" height="5" rx="2" fill="white" opacity="0.95"/>
      <rect x="120" y="122" width="80" height="3" rx="1" fill="white" opacity="0.6"/>
      <rect x="130" y="130" width="60" height="3" rx="1" fill="white" opacity="0.4"/>
      <!-- CTA 按钮 -->
      <rect x="130" y="144" width="60" height="16" rx="8" fill="white" opacity="0.9"/>
      <text x="160" y="155" font-family="serif" font-size="7" fill="${color}" text-anchor="middle" font-weight="700">立即参与</text>
      <!-- 日期角标 -->
      <rect x="88" y="20" width="36" height="16" rx="3" fill="white" opacity="0.9"/>
      <text x="106" y="31" font-family="monospace" font-size="7" fill="${color}" text-anchor="middle" font-weight="600">618</text>
      <!-- 左侧图层面板 -->
      <rect x="12" y="20" width="56" height="140" rx="4" fill="white" stroke="#E0DFD9"/>
      <text x="18" y="34" font-family="monospace" font-size="7" fill="#6B6963" font-weight="600">图层</text>
      <rect x="18" y="42" width="44" height="10" rx="2" fill="${color}15"/>
      <circle cx="26" cy="47" r="2" fill="${color}"/>
      <text x="32" y="49" font-family="monospace" font-size="5" fill="#3A3935">背景</text>
      <rect x="18" y="56" width="44" height="10" rx="2" fill="${color}22"/>
      <circle cx="26" cy="61" r="2" fill="${color}66"/>
      <text x="32" y="63" font-family="monospace" font-size="5" fill="#3A3935">标题</text>
      <rect x="18" y="70" width="44" height="10" rx="2" fill="${color}15"/>
      <circle cx="26" cy="75" r="2" fill="${color}44"/>
      <text x="32" y="77" font-family="monospace" font-size="5" fill="#3A3935">装饰</text>
      <rect x="18" y="84" width="44" height="10" rx="2" fill="${color}15"/>
      <circle cx="26" cy="89" r="2" fill="${color}33"/>
      <text x="32" y="91" font-family="monospace" font-size="5" fill="#3A3935">CTA</text>
      <rect x="18" y="108" width="44" height="16" rx="3" fill="${color}"/>
      <text x="40" y="119" font-family="monospace" font-size="6" fill="white" text-anchor="middle" font-weight="600">AI 生成</text>
      <!-- 右侧标注 -->
      <rect x="252" y="50" width="56" height="100" rx="4" fill="white" stroke="#E0DFD9"/>
      <text x="258" y="64" font-family="monospace" font-size="7" fill="#6B6963" font-weight="600">模板</text>
      <rect x="258" y="72" width="44" height="22" rx="3" fill="${color}22"/>
      <rect x="258" y="98" width="44" height="22" rx="3" fill="${color}11"/>
      <rect x="258" y="124" width="44" height="22" rx="3" fill="${color}11"/>
    </svg>`;
  }

  // 会议纪要
  if (wf.name.includes('会议') || wf.name.includes('纪要')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <!-- 左侧录音面板 -->
      <rect x="16" y="16" width="140" height="168" rx="8" fill="white" stroke="#E0DFD9"/>
      <text x="28" y="36" font-family="serif" font-size="10" fill="#0F0F0E" font-weight="700">会议录音</text>
      <circle cx="136" cy="30" r="5" fill="#EF4444"/>
      <circle cx="136" cy="30" r="2.5" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <!-- 波形 -->
      ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(i => {
        const h = [12,20,8,28,16,32,10,24,18,30,14,26,8,22,16,28,12,20,10,6][i];
        return `<rect x="${28 + i * 6}" y="${62 - h/2}" width="3" rx="1.5" height="${h}" fill="${color}${i < 14 ? '' : '44'}"/>`;
      }).join('')}
      <!-- 发言人 -->
      <circle cx="32" cy="86" r="5" fill="${color}"/>
      <text x="32" y="89" font-family="serif" font-size="5" fill="white" text-anchor="middle">张</text>
      <rect x="42" y="82" width="100" height="3" rx="1" fill="#0F0F0E"/>
      <rect x="42" y="89" width="80" height="2" rx="1" fill="#A5A39C"/>
      <circle cx="32" cy="108" r="5" fill="#5B3FA8"/>
      <text x="32" y="111" font-family="serif" font-size="5" fill="white" text-anchor="middle">李</text>
      <rect x="42" y="104" width="90" height="3" rx="1" fill="#0F0F0E"/>
      <rect x="42" y="111" width="70" height="2" rx="1" fill="#A5A39C"/>
      <circle cx="32" cy="130" r="5" fill="#B85C00"/>
      <text x="32" y="133" font-family="serif" font-size="5" fill="white" text-anchor="middle">王</text>
      <rect x="42" y="126" width="95" height="3" rx="1" fill="#0F0F0E"/>
      <rect x="42" y="133" width="60" height="2" rx="1" fill="#A5A39C"/>
      <text x="28" y="160" font-family="monospace" font-size="8" fill="${color}">00:42:18</text>
      <text x="92" y="160" font-family="monospace" font-size="7" fill="#A5A39C">3 位参会</text>
      <!-- 右侧纪要面板 -->
      <rect x="164" y="16" width="140" height="168" rx="8" fill="${color}"/>
      <text x="176" y="36" font-family="serif" font-size="10" fill="white" font-weight="700">AI 纪要</text>
      <rect x="268" y="22" width="28" height="14" rx="7" fill="white" opacity="0.2"/>
      <text x="282" y="32" font-family="monospace" font-size="7" fill="white" text-anchor="middle" opacity="0.9">导出</text>
      <text x="176" y="56" font-family="monospace" font-size="7" fill="white" opacity="0.6">关键决策</text>
      <rect x="176" y="62" width="116" height="3" rx="1" fill="white" opacity="0.9"/>
      <rect x="176" y="69" width="100" height="2" rx="1" fill="white" opacity="0.5"/>
      <text x="176" y="88" font-family="monospace" font-size="7" fill="white" opacity="0.6">待办事项</text>
      <text x="176" y="100" font-family="monospace" font-size="7" fill="#5DCAA5">✓</text>
      <rect x="186" y="96" width="90" height="3" rx="1" fill="white" opacity="0.8"/>
      <text x="176" y="114" font-family="monospace" font-size="7" fill="#FFD6A5">○</text>
      <rect x="186" y="110" width="80" height="3" rx="1" fill="white" opacity="0.8"/>
      <text x="176" y="128" font-family="monospace" font-size="7" fill="#FFD6A5">○</text>
      <rect x="186" y="124" width="95" height="3" rx="1" fill="white" opacity="0.8"/>
      <text x="176" y="148" font-family="monospace" font-size="7" fill="white" opacity="0.6">时间节点</text>
      <rect x="176" y="154" width="110" height="3" rx="1" fill="white" opacity="0.7"/>
      <rect x="176" y="161" width="80" height="2" rx="1" fill="white" opacity="0.4"/>
    </svg>`;
  }

  // SEO / 营销分析
  if (wf.name.includes('SEO') || wf.name.includes('搜索')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <rect x="16" y="16" width="288" height="168" rx="8" fill="white" stroke="#E0DFD9"/>
      <!-- 搜索框 -->
      <rect x="28" y="28" width="264" height="28" rx="14" fill="#F2F1ED" stroke="${color}44"/>
      <circle cx="44" cy="42" r="6" fill="none" stroke="${color}" stroke-width="1.5"/>
      <line x1="48" y1="46" x2="52" y2="50" stroke="${color}" stroke-width="1.5"/>
      <text x="60" y="46" font-family="serif" font-size="10" fill="#0F0F0E">AI 工作流平台推荐</text>
      <rect x="248" y="32" width="36" height="20" rx="10" fill="${color}"/>
      <text x="266" y="45" font-family="monospace" font-size="7" fill="white" text-anchor="middle" font-weight="600">搜索</text>
      <!-- 搜索结果 1 -->
      <text x="28" y="76" font-family="serif" font-size="10" fill="#1A0DAB" font-weight="600">FlowHub · 最佳 AI 工作流市场</text>
      <text x="28" y="88" font-family="monospace" font-size="7" fill="#006621">flowhub.cn › marketplace</text>
      <rect x="28" y="94" width="200" height="2" rx="1" fill="#A5A39C"/>
      <rect x="28" y="100" width="180" height="2" rx="1" fill="#A5A39C"/>
      <!-- 排名标注 -->
      <rect x="242" y="68" width="48" height="20" rx="4" fill="#5DCAA522"/>
      <text x="252" y="82" font-family="monospace" font-size="8" fill="#059669" font-weight="700">#1</text>
      <text x="268" y="82" font-family="monospace" font-size="6" fill="#059669">↑3</text>
      <!-- 搜索结果 2 -->
      <rect x="28" y="112" width="180" height="3" rx="1" fill="#1A0DAB66"/>
      <rect x="28" y="120" width="130" height="2" rx="1" fill="#00662166"/>
      <rect x="28" y="128" width="200" height="2" rx="1" fill="#A5A39C66"/>
      <!-- 右侧评分面板 -->
      <rect x="220" y="110" width="72" height="60" rx="4" fill="${color}11"/>
      <text x="256" y="126" font-family="monospace" font-size="7" fill="${color}" text-anchor="middle" font-weight="600">SEO 评分</text>
      <text x="256" y="146" font-family="serif" font-size="18" fill="${color}" text-anchor="middle" font-weight="700">92</text>
      <rect x="232" y="154" width="48" height="4" rx="2" fill="${color}22"/>
      <rect x="232" y="154" width="44" height="4" rx="2" fill="${color}"/>
      <text x="256" y="168" font-family="monospace" font-size="6" fill="#059669" text-anchor="middle">↑8 分</text>
    </svg>`;
  }

  // 合同 / 法律
  if (wf.name.includes('合同') || wf.name.includes('法律') || wf.name.includes('审查')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <!-- 合同文档 -->
      <rect x="40" y="10" width="160" height="180" rx="4" fill="white" stroke="#E0DFD9"/>
      <text x="120" y="30" font-family="serif" font-size="10" fill="#0F0F0E" text-anchor="middle" font-weight="700">合作服务协议</text>
      <line x1="56" y1="36" x2="184" y2="36" stroke="#E0DFD9"/>
      <!-- 正文行 -->
      <rect x="56" y="46" width="128" height="2" rx="1" fill="#A5A39C"/>
      <rect x="56" y="54" width="120" height="2" rx="1" fill="#A5A39C"/>
      <rect x="56" y="62" width="128" height="2" rx="1" fill="#A5A39C"/>
      <!-- 风险高亮行 -->
      <rect x="54" y="72" width="132" height="12" rx="2" fill="#FEF2F2"/>
      <rect x="56" y="76" width="128" height="2" rx="1" fill="#EF4444" opacity="0.7"/>
      <text x="188" y="80" font-family="monospace" font-size="5" fill="#EF4444">⚠ 高风险</text>
      <!-- 更多正文 -->
      <rect x="56" y="90" width="120" height="2" rx="1" fill="#A5A39C"/>
      <rect x="56" y="98" width="128" height="2" rx="1" fill="#A5A39C"/>
      <!-- 警告高亮行 -->
      <rect x="54" y="106" width="132" height="12" rx="2" fill="#FFFBEB"/>
      <rect x="56" y="110" width="110" height="2" rx="1" fill="#F59E0B" opacity="0.7"/>
      <text x="188" y="114" font-family="monospace" font-size="5" fill="#F59E0B">⚠ 需关注</text>
      <!-- 安全行 -->
      <rect x="56" y="124" width="128" height="2" rx="1" fill="#A5A39C"/>
      <rect x="54" y="132" width="132" height="12" rx="2" fill="#F0FDF4"/>
      <rect x="56" y="136" width="100" height="2" rx="1" fill="#22C55E" opacity="0.7"/>
      <text x="188" y="140" font-family="monospace" font-size="5" fill="#22C55E">✓ 安全</text>
      <rect x="56" y="150" width="118" height="2" rx="1" fill="#A5A39C"/>
      <rect x="56" y="158" width="128" height="2" rx="1" fill="#A5A39C"/>
      <rect x="80" y="168" width="80" height="3" rx="1" fill="#0F0F0E66"/>
      <!-- 右侧风险面板 -->
      <rect x="212" y="20" width="92" height="160" rx="6" fill="${color}"/>
      <text x="258" y="40" font-family="serif" font-size="9" fill="white" text-anchor="middle" font-weight="700">风险评估</text>
      <text x="258" y="68" font-family="serif" font-size="24" fill="white" text-anchor="middle" font-weight="700">3</text>
      <text x="258" y="82" font-family="monospace" font-size="7" fill="white" text-anchor="middle" opacity="0.7">处风险条款</text>
      <line x1="224" y1="92" x2="292" y2="92" stroke="white" stroke-opacity="0.15"/>
      <circle cx="234" cy="108" r="4" fill="#EF4444"/>
      <text x="244" y="111" font-family="monospace" font-size="7" fill="white" opacity="0.9">高风险 1</text>
      <circle cx="234" cy="126" r="4" fill="#F59E0B"/>
      <text x="244" y="129" font-family="monospace" font-size="7" fill="white" opacity="0.9">中风险 1</text>
      <circle cx="234" cy="144" r="4" fill="#22C55E"/>
      <text x="244" y="147" font-family="monospace" font-size="7" fill="white" opacity="0.9">安全 1</text>
      <rect x="224" y="160" width="68" height="12" rx="6" fill="white" opacity="0.15"/>
      <text x="258" y="169" font-family="monospace" font-size="7" fill="white" text-anchor="middle" opacity="0.9">查看详情</text>
    </svg>`;
  }

  // 社媒排期 / 日历
  if (wf.name.includes('排期') || wf.name.includes('日历') || wf.name.includes('社媒')) {
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#FAFAF7"/>
      <rect x="16" y="16" width="288" height="168" rx="8" fill="white" stroke="#E0DFD9"/>
      <!-- 标题 -->
      <text x="28" y="36" font-family="serif" font-size="11" fill="#0F0F0E" font-weight="700">内容日历 · 5 月第 2 周</text>
      <rect x="240" y="24" width="52" height="18" rx="9" fill="${color}"/>
      <text x="266" y="36" font-family="monospace" font-size="7" fill="white" text-anchor="middle" font-weight="600">AI 排期</text>
      <!-- 星期头 -->
      ${days.map((d, i) => `<text x="${38 + i * 38}" y="56" font-family="monospace" font-size="7" fill="#A5A39C" text-anchor="middle">周${d}</text>`).join('')}
      <line x1="20" y1="62" x2="300" y2="62" stroke="#E0DFD9"/>
      <!-- 日历格子 -->
      ${days.map((d, i) => {
        const x = 20 + i * 38;
        const hasPost = [0,1,2,3,5].includes(i);
        const platform = ['小红书', '微博', '抖音', '公众号', '', '小红书', ''][i];
        const pColor = ['#FF2442', '#E6162D', '#0F0F0E', '#07C160', '', '#FF2442', ''][i];
        return `
          <rect x="${x}" y="66" width="36" height="50" rx="3" fill="${hasPost ? color + '11' : '#F8F8F5'}" stroke="${hasPost ? color + '33' : '#E0DFD9'}" stroke-width="0.5"/>
          ${hasPost ? `
            <circle cx="${x + 8}" cy="74" r="3" fill="${pColor}"/>
            <text x="${x + 14}" y="77" font-family="monospace" font-size="5" fill="#3A3935">${platform}</text>
            <rect x="${x + 4}" y="82" width="28" height="2" rx="1" fill="${color}66"/>
            <rect x="${x + 4}" y="88" width="20" height="2" rx="1" fill="${color}33"/>
            <rect x="${x + 4}" y="96" width="22" height="8" rx="2" fill="${hasPost ? color + '22' : '#E0DFD9'}"/>
            <text x="${x + 15}" y="102" font-family="monospace" font-size="5" fill="${color}" text-anchor="middle">已排</text>
          ` : `
            <text x="${x + 18}" y="92" font-family="monospace" font-size="14" fill="#E0DFD9" text-anchor="middle">+</text>
          `}
        `;
      }).join('')}
      <!-- 底部统计 -->
      <line x1="20" y1="122" x2="300" y2="122" stroke="#E0DFD9"/>
      <text x="28" y="140" font-family="monospace" font-size="8" fill="#6B6963">本周计划</text>
      <text x="28" y="156" font-family="serif" font-size="16" fill="${color}" font-weight="700">5 篇</text>
      <text x="28" y="168" font-family="monospace" font-size="7" fill="#A5A39C">覆盖 4 个平台</text>
      <text x="140" y="140" font-family="monospace" font-size="8" fill="#6B6963">预期曝光</text>
      <text x="140" y="156" font-family="serif" font-size="16" fill="${color}" font-weight="700">12.4k</text>
      <text x="140" y="168" font-family="monospace" font-size="7" fill="#059669">↑ 22% vs 上周</text>
      <!-- 平台图标 -->
      <rect x="230" y="132" width="62" height="42" rx="4" fill="${color}08"/>
      ${['小红书', '微博', '抖音', '公众号'].map((p, i) => `
        <circle cx="${240 + (i % 2) * 22}" cy="${144 + Math.floor(i / 2) * 18}" r="5" fill="${['#FF2442', '#E6162D', '#0F0F0E', '#07C160'][i]}22"/>
        <text x="${252 + (i % 2) * 22}" y="${147 + Math.floor(i / 2) * 18}" font-family="monospace" font-size="5" fill="#3A3935">${p}</text>
      `).join('')}
    </svg>`;
  }

  // 邮件模板
  if (wf.name.includes('邮件') || wf.name.includes('Email')) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="200" fill="#F2F1ED"/>
      <!-- 邮件窗口 -->
      <rect x="30" y="14" width="260" height="172" rx="8" fill="white" stroke="#E0DFD9"/>
      <!-- 工具栏 -->
      <circle cx="44" cy="28" r="4" fill="#FF5F56"/>
      <circle cx="56" cy="28" r="4" fill="#FFBD2E"/>
      <circle cx="68" cy="28" r="4" fill="#27C93F"/>
      <text x="160" y="32" font-family="monospace" font-size="8" fill="#6B6963" text-anchor="middle">新邮件 — FlowHub</text>
      <line x1="30" y1="40" x2="290" y2="40" stroke="#E0DFD9"/>
      <!-- 收件人 -->
      <text x="44" y="56" font-family="monospace" font-size="8" fill="#A5A39C">收件人</text>
      <rect x="84" y="48" width="100" height="14" rx="3" fill="#F2F1ED"/>
      <text x="90" y="58" font-family="monospace" font-size="7" fill="#3A3935">client@company.com</text>
      <!-- 主题 -->
      <text x="44" y="76" font-family="monospace" font-size="8" fill="#A5A39C">主题</text>
      <text x="84" y="76" font-family="serif" font-size="9" fill="#0F0F0E" font-weight="600">Q3 季度合作方案 — FlowHub</text>
      <line x1="44" y1="84" x2="280" y2="84" stroke="#E0DFD9"/>
      <!-- 正文 -->
      <text x="44" y="100" font-family="serif" font-size="8" fill="#0F0F0E">尊敬的王总,</text>
      <rect x="44" y="108" width="220" height="2" rx="1" fill="#A5A39C"/>
      <rect x="44" y="116" width="200" height="2" rx="1" fill="#A5A39C"/>
      <rect x="44" y="124" width="180" height="2" rx="1" fill="#A5A39C"/>
      <rect x="44" y="132" width="210" height="2" rx="1" fill="#A5A39C"/>
      <!-- AI 提示气泡 -->
      <rect x="170" y="140" width="110" height="36" rx="6" fill="${color}"/>
      <text x="182" y="154" font-family="monospace" font-size="7" fill="white" font-weight="600">✨ AI 建议</text>
      <text x="182" y="166" font-family="monospace" font-size="6" fill="white" opacity="0.8">语气更正式 +3 个优化</text>
      <!-- 底部按钮 -->
      <rect x="44" y="144" width="50" height="18" rx="4" fill="${color}"/>
      <text x="69" y="156" font-family="monospace" font-size="8" fill="white" text-anchor="middle" font-weight="600">发送</text>
      <rect x="100" y="144" width="56" height="18" rx="4" fill="#F2F1ED"/>
      <text x="128" y="156" font-family="monospace" font-size="7" fill="#6B6963" text-anchor="middle">AI 重写</text>
    </svg>`;
  }

  // 默认 - 通用聊天风格
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="${color}11"/>
    <!-- 对话气泡 1 -->
    <rect x="20" y="36" width="160" height="36" rx="18" fill="white" stroke="${color}22"/>
    <circle cx="42" cy="54" r="10" fill="${color}66"/>
    <rect x="60" y="46" width="80" height="3" rx="1" fill="#0F0F0E"/>
    <rect x="60" y="55" width="100" height="2" rx="1" fill="#A5A39C"/>
    <rect x="60" y="62" width="60" height="2" rx="1" fill="#A5A39C"/>
    <!-- AI 思考气泡 -->
    <rect x="140" y="92" width="160" height="36" rx="18" fill="${color}"/>
    <circle cx="276" cy="110" r="10" fill="white" opacity="0.2"/>
    <text x="276" y="115" font-family="monospace" font-size="9" fill="white" text-anchor="middle" font-weight="700">AI</text>
    <rect x="156" y="102" width="100" height="3" rx="1" fill="white" opacity="0.95"/>
    <rect x="156" y="111" width="80" height="2" rx="1" fill="white" opacity="0.7"/>
    <rect x="156" y="118" width="60" height="2" rx="1" fill="white" opacity="0.7"/>
    <!-- 对话气泡 2 -->
    <rect x="20" y="148" width="180" height="36" rx="18" fill="white" stroke="${color}22"/>
    <circle cx="42" cy="166" r="10" fill="${color}66"/>
    <rect x="60" y="158" width="100" height="3" rx="1" fill="#0F0F0E"/>
    <rect x="60" y="167" width="120" height="2" rx="1" fill="#A5A39C"/>
    <rect x="60" y="174" width="80" height="2" rx="1" fill="#A5A39C"/>
  </svg>`;
}

function renderGallerySlides(wf) {
  const slides = getGallerySlides(wf);
  return slides.map((s, i) => `
    <div class="gallery-slide ${i === 0 ? 'active' : ''}" data-slide="${i}">
      <div class="gallery-image">${s.html || s.svg}</div>
      <div class="gallery-caption">
        <div class="gallery-caption-label">${s.label}</div>
        <div class="gallery-caption-title">${s.title}</div>
      </div>
    </div>
  `).join('');
}

function renderGalleryDots(wf) {
  const slides = getGallerySlides(wf);
  return slides.map((_, i) => `
    <span class="gallery-dot ${i === 0 ? 'active' : ''}" data-dot="${i}" onclick="galleryGoTo('${wf.id}', ${i})"></span>
  `).join('');
}

function renderGalleryThumbs(wf) {
  const slides = getGallerySlides(wf);
  return slides.map((s, i) => `
    <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-thumb="${i}" onclick="galleryGoTo('${wf.id}', ${i})">
      <div class="gallery-thumb-img">${s.html || s.svg}</div>
      <div class="gallery-thumb-label">${s.shortLabel || s.label.split(' · ')[0]}</div>
    </div>
  `).join('');
}

function getGallerySlides(wf) {
  // 根据工作流类型,生成 3-5 张大图
  const customSlides = getCustomGallerySlides(wf);
  if (customSlides.length) return customSlides;
  const color = wf.cover_color;

  if (wf.name.includes('PicSpark') || wf.name.includes('商品图')) {
    return [
      { label: '场景 1 · 主图换背景', shortLabel: '换背景', title: '从白底到温馨厨房场景', svg: galleryProductSwap(color, 'kitchen') },
      { label: '场景 2 · 节日营销', shortLabel: '节日图', title: '春节红金主题 · 福字嵌入', svg: galleryProductSwap(color, 'festival') },
      { label: '场景 3 · 模特上身', shortLabel: '模特图', title: '产品自动匹配模特展示', svg: galleryProductSwap(color, 'model') },
      { label: '场景 4 · 多尺寸适配', shortLabel: '多尺寸', title: '一键生成主图 / 详情 / Banner', svg: galleryProductSwap(color, 'sizes') }
    ];
  }
  if (wf.name.includes('小红书') || wf.category.includes('写作')) {
    return [
      { label: '场景 1 · 干货风', shortLabel: '干货向', title: '专业知识科普,信息量大', svg: gallerySocialPost(color, 'expert') },
      { label: '场景 2 · 故事风', shortLabel: '故事向', title: '亲身体验,情感共鸣', svg: gallerySocialPost(color, 'story') },
      { label: '场景 3 · 对比风', shortLabel: '对比向', title: '产品对比,种草神器', svg: gallerySocialPost(color, 'compare') }
    ];
  }
  if (wf.name.includes('色板') || wf.name.includes('品牌')) {
    return [
      { label: '场景 1 · 主色提取', shortLabel: '主色', title: '6 种主色 + 应用规范', svg: galleryPalette(color, 'main') },
      { label: '场景 2 · 应用示意', shortLabel: '应用', title: '主辅色按钮 / 文字 / 背景', svg: galleryPalette(color, 'apply') },
      { label: '场景 3 · 配色禁忌', shortLabel: '禁忌', title: '常见错误搭配提醒', svg: galleryPalette(color, 'avoid') }
    ];
  }
  if (wf.name.includes('简历')) {
    return [
      { label: '场景 1 · 优化前后对比', shortLabel: '对比', title: '关键词 + 量化建议', svg: galleryResume(color, 'compare') },
      { label: '场景 2 · 评分细节', shortLabel: '评分', title: '6 维度详细打分', svg: galleryResume(color, 'score') }
    ];
  }
  if (wf.name.includes('竞品') || wf.name.includes('监控')) {
    return [
      { label: '场景 1 · 数据周报', shortLabel: '周报', title: '7 天竞品变化趋势', svg: galleryDataReport(color, 'trend') },
      { label: '场景 2 · 舆情监控', shortLabel: '舆情', title: '社媒情感分析', svg: galleryDataReport(color, 'sentiment') },
      { label: '场景 3 · 邮件推送', shortLabel: '推送', title: '每周一自动到邮箱', svg: galleryDataReport(color, 'email') }
    ];
  }
  // 默认 - 用工作流主缩略图重复
  return [
    { label: '场景示例', shortLabel: '示例', title: wf.tagline || wf.name, svg: getThumbSvg(wf) }
  ];
}

function getCustomGallerySlides(wf) {
  const gallery = Array.isArray(wf.gallery) ? wf.gallery.filter(item => item && item.url) : [];
  const media = gallery.length
    ? gallery
    : (wf.cover_image_url ? [{ label: '产品主图', url: wf.cover_image_url }] : []);
  return media.slice(0, 6).map((item, index) => ({
    label: item.label || `产品图 ${index + 1}`,
    shortLabel: item.shortLabel || `图 ${index + 1}`,
    title: item.title || wf.name,
    html: `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.label || wf.name)}">`
  }));
}

function galleryProductSwap(color, scene) {
  const scenes = {
    kitchen: { bgGrad: ['#FFE9D6', '#FFCB94'], items: ['🍎', '🥐', '☕'], caption: '温馨厨房' },
    festival: { bgGrad: ['#FFE0E0', '#FF8C8C'], items: ['🧧', '🏮', '✨'], caption: '春节红金' },
    model: { bgGrad: ['#E0E8FF', '#A0B8FF'], items: ['👗', '👜', '🌸'], caption: '模特展示' },
    sizes: { bgGrad: ['#E0F2E8', '#9EE2BC'], items: ['📐', '📱', '💻'], caption: '多尺寸' }
  };
  const s = scenes[scene] || scenes.kitchen;
  return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="gp-${scene}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${s.bgGrad[0]}"/>
        <stop offset="100%" stop-color="${s.bgGrad[1]}"/>
      </linearGradient>
      <radialGradient id="prod-${scene}" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="60%" stop-color="${color}66"/>
        <stop offset="100%" stop-color="${color}"/>
      </radialGradient>
    </defs>
    <rect width="600" height="360" fill="url(#gp-${scene})"/>
    <!-- 装饰元素 -->
    <circle cx="80" cy="80" r="40" fill="white" opacity="0.25"/>
    <circle cx="520" cy="280" r="60" fill="white" opacity="0.15"/>
    <text x="80" y="92" font-family="serif" font-size="28" text-anchor="middle">${s.items[0]}</text>
    <text x="520" y="290" font-family="serif" font-size="32" text-anchor="middle">${s.items[2]}</text>
    <text x="490" y="100" font-family="serif" font-size="24" text-anchor="middle">${s.items[1]}</text>
    <!-- 产品 -->
    <ellipse cx="300" cy="190" rx="80" ry="120" fill="url(#prod-${scene})"/>
    <ellipse cx="300" cy="310" rx="70" ry="14" fill="black" opacity="0.15"/>
    <!-- 高光 -->
    <ellipse cx="280" cy="140" rx="20" ry="40" fill="white" opacity="0.5"/>
    <!-- 角标 -->
    <rect x="440" y="20" width="140" height="32" rx="16" fill="white" opacity="0.95"/>
    <text x="510" y="40" font-family="serif" font-size="12" fill="${color}" text-anchor="middle" font-weight="700">AI 生成 · ${s.caption}</text>
  </svg>`;
}

function gallerySocialPost(color, style) {
  const styles = {
    expert: { title: '敏感肌姐妹注意 ⚠️', sub: '这 3 种成分千万避开!附测评清单', tag: '#护肤干货 #成分党' },
    story: { title: '婆婆送我 ¥9.9 精华水 😭', sub: '本来想丢掉,试用 7 天直接真香了…', tag: '#意外好物 #宝藏' },
    compare: { title: '¥39 vs ¥390 精华水实测', sub: '盲测 30 天,结果颠覆我认知', tag: '#测评 #平替' }
  };
  const s = styles[style] || styles.expert;
  return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="gs-${style}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFE4EC"/>
        <stop offset="100%" stop-color="#FFB8D1"/>
      </linearGradient>
    </defs>
    <rect width="600" height="360" fill="url(#gs-${style})"/>
    <!-- 手机框 -->
    <rect x="180" y="20" width="240" height="320" rx="24" fill="#0F0F0E"/>
    <rect x="188" y="32" width="224" height="296" rx="18" fill="white"/>
    <!-- 顶部 -->
    <rect x="200" y="44" width="200" height="6" rx="3" fill="#F0F0EC"/>
    <!-- 用户 -->
    <circle cx="218" cy="74" r="10" fill="${color}"/>
    <rect x="234" y="68" width="60" height="5" rx="2" fill="#0F0F0E"/>
    <rect x="234" y="78" width="40" height="3" rx="1" fill="#A5A39C"/>
    <rect x="356" y="64" width="44" height="20" rx="10" fill="#FF2442"/>
    <text x="378" y="78" font-family="serif" font-size="10" fill="white" text-anchor="middle" font-weight="700">+ 关注</text>
    <!-- 封面 -->
    <rect x="200" y="96" width="200" height="140" rx="6" fill="${color}33"/>
    <circle cx="300" cy="156" r="32" fill="${color}88"/>
    <text x="300" y="166" font-family="serif" font-size="28" fill="white" text-anchor="middle" font-weight="700">✨</text>
    <text x="300" y="200" font-family="serif" font-size="11" fill="${color}" text-anchor="middle" font-weight="600">AI 生成封面</text>
    <text x="300" y="218" font-family="serif" font-size="9" fill="${color}" text-anchor="middle">点击查看</text>
    <!-- 标题 -->
    <text x="208" y="254" font-family="serif" font-size="14" fill="#0F0F0E" font-weight="700">${s.title}</text>
    <text x="208" y="272" font-family="serif" font-size="10" fill="#3A3935">${s.sub}</text>
    <!-- 标签 -->
    <text x="208" y="292" font-family="serif" font-size="9" fill="${color}">${s.tag}</text>
    <!-- 互动 -->
    <text x="208" y="312" font-family="monospace" font-size="10" fill="#A5A39C">♥ 12.3k</text>
    <text x="270" y="312" font-family="monospace" font-size="10" fill="#A5A39C">💬 892</text>
    <text x="320" y="312" font-family="monospace" font-size="10" fill="#A5A39C">⭐ 4.8k</text>
  </svg>`;
}

function galleryPalette(color, type) {
  const palette = ['#1A5D3A', '#B83A6B', '#5B3FA8', '#FFD6A5', '#1E3A8A', '#B85C00'];
  if (type === 'main') {
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="360" fill="#FAFAF7"/>
      <text x="60" y="68" font-family="serif" font-size="24" fill="#0F0F0E" font-weight="700">「东方茶馆」品牌色板</text>
      <text x="60" y="92" font-family="monospace" font-size="11" fill="#6B6963">6 种主色 · 中式雅致风格</text>
      ${palette.map((c, i) => `
        <rect x="${60 + i * 84}" y="124" width="68" height="160" rx="6" fill="${c}"/>
        <text x="${94 + i * 84}" y="304" font-family="monospace" font-size="10" fill="${c}" text-anchor="middle" font-weight="700">${c}</text>
      `).join('')}
      <text x="60" y="330" font-family="monospace" font-size="10" fill="#A5A39C">主色 · 辅助色 · 强调色 · 背景色 · 文字色 · 警示色</text>
    </svg>`;
  }
  if (type === 'apply') {
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="360" fill="#FAFAF7"/>
      <text x="60" y="50" font-family="serif" font-size="18" fill="#0F0F0E" font-weight="700">应用示例</text>
      <!-- 卡片 1 -->
      <rect x="60" y="80" width="240" height="240" rx="10" fill="${palette[0]}"/>
      <text x="80" y="120" font-family="serif" font-size="22" fill="white" font-weight="700">东方茶馆</text>
      <text x="80" y="142" font-family="serif" font-size="11" fill="white" opacity="0.8">品味中国茶文化</text>
      <rect x="80" y="170" width="60" height="34" rx="6" fill="${palette[3]}"/>
      <text x="110" y="192" font-family="serif" font-size="12" fill="${palette[0]}" text-anchor="middle" font-weight="700">立即体验</text>
      <text x="80" y="240" font-family="serif" font-size="10" fill="white" opacity="0.6">精选 · 优质 · 传承</text>
      <text x="80" y="296" font-family="monospace" font-size="9" fill="white" opacity="0.5">primary + accent</text>
      <!-- 卡片 2 -->
      <rect x="320" y="80" width="220" height="100" rx="10" fill="${palette[3]}"/>
      <text x="340" y="120" font-family="serif" font-size="16" fill="${palette[0]}" font-weight="700">辅助色 · 背景</text>
      <text x="340" y="140" font-family="serif" font-size="10" fill="${palette[0]}" opacity="0.7">用于卡片 / 横幅 / 高亮区</text>
      <text x="340" y="166" font-family="monospace" font-size="9" fill="${palette[0]}" opacity="0.5">${palette[3]}</text>
      <!-- 文字层级 -->
      <rect x="320" y="200" width="220" height="120" rx="10" fill="white" stroke="#E0DFD9"/>
      <text x="340" y="226" font-family="serif" font-size="14" fill="${palette[0]}" font-weight="700">主标题色</text>
      <text x="340" y="248" font-family="serif" font-size="11" fill="${palette[5]}">辅助说明文字</text>
      <text x="340" y="270" font-family="serif" font-size="10" fill="#A5A39C">次要内容色</text>
      <text x="340" y="288" font-family="serif" font-size="10" fill="${palette[1]}">警示提示色</text>
      <text x="340" y="306" font-family="monospace" font-size="9" fill="#A5A39C">text hierarchy</text>
    </svg>`;
  }
  // avoid
  return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="600" height="360" fill="#FAFAF7"/>
    <text x="60" y="50" font-family="serif" font-size="18" fill="#0F0F0E" font-weight="700">配色禁忌</text>
    <!-- 错误示范 1 -->
    <rect x="60" y="80" width="240" height="120" rx="10" fill="${palette[2]}"/>
    <text x="180" y="148" font-family="serif" font-size="18" fill="${palette[5]}" text-anchor="middle" font-weight="700">紫底橙字</text>
    <text x="180" y="172" font-family="serif" font-size="10" fill="${palette[5]}" text-anchor="middle" opacity="0.7">对比度严重不足</text>
    <text x="60" y="218" font-family="monospace" font-size="10" fill="#B83838">✗ 阅读疲劳</text>
    <!-- 错误示范 2 -->
    <rect x="320" y="80" width="220" height="120" rx="10" fill="${palette[3]}"/>
    <text x="430" y="148" font-family="serif" font-size="18" fill="white" text-anchor="middle" font-weight="700">浅黄底白字</text>
    <text x="430" y="172" font-family="serif" font-size="10" fill="white" text-anchor="middle" opacity="0.7">几乎看不见</text>
    <text x="320" y="218" font-family="monospace" font-size="10" fill="#B83838">✗ 对比度不足</text>
    <!-- 错误示范 3 -->
    <rect x="60" y="240" width="240" height="100" rx="10" fill="${palette[0]}"/>
    <rect x="80" y="262" width="60" height="60" rx="30" fill="${palette[1]}"/>
    <rect x="160" y="262" width="60" height="60" rx="30" fill="${palette[2]}"/>
    <text x="60" y="358" font-family="monospace" font-size="10" fill="#B83838">✗ 配色过多</text>
    <!-- 正确示范 -->
    <rect x="320" y="240" width="220" height="100" rx="10" fill="${palette[0]}"/>
    <rect x="340" y="262" width="60" height="60" rx="30" fill="${palette[3]}"/>
    <text x="420" y="294" font-family="serif" font-size="13" fill="white" font-weight="700">正确</text>
    <text x="420" y="312" font-family="serif" font-size="10" fill="white" opacity="0.8">主辅协调</text>
    <text x="320" y="358" font-family="monospace" font-size="10" fill="${palette[0]}">✓ 1+1 简洁</text>
  </svg>`;
}

function galleryResume(color, type) {
  if (type === 'compare') {
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="360" fill="#F2F1ED"/>
      <text x="160" y="44" font-family="serif" font-size="14" fill="#A5A39C" text-anchor="middle" font-weight="600">优化前</text>
      <text x="440" y="44" font-family="serif" font-size="14" fill="${color}" text-anchor="middle" font-weight="700">优化后 ✨</text>
      <!-- 左 -->
      <rect x="40" y="60" width="240" height="280" rx="4" fill="white" stroke="#E0DFD9"/>
      <rect x="60" y="84" width="100" height="6" rx="2" fill="#0F0F0E"/>
      <rect x="60" y="98" width="60" height="4" rx="1" fill="#A5A39C"/>
      <line x1="60" y1="116" x2="260" y2="116" stroke="#E0DFD9"/>
      <rect x="60" y="130" width="30" height="4" rx="1" fill="#0F0F0E"/>
      <rect x="60" y="142" width="180" height="3" rx="1" fill="#A5A39C"/>
      <rect x="60" y="150" width="160" height="3" rx="1" fill="#A5A39C"/>
      <rect x="60" y="158" width="170" height="3" rx="1" fill="#A5A39C"/>
      <rect x="60" y="180" width="30" height="4" rx="1" fill="#0F0F0E"/>
      <rect x="60" y="192" width="160" height="3" rx="1" fill="#A5A39C"/>
      <rect x="60" y="200" width="180" height="3" rx="1" fill="#A5A39C"/>
      <text x="60" y="320" font-family="monospace" font-size="11" fill="#B83838" font-weight="600">评分: 72 / 100</text>
      <!-- 右 -->
      <rect x="320" y="60" width="240" height="280" rx="4" fill="white" stroke="${color}66" stroke-width="2"/>
      <rect x="340" y="84" width="100" height="6" rx="2" fill="${color}"/>
      <rect x="340" y="98" width="60" height="4" rx="1" fill="#3A3935"/>
      <line x1="340" y1="116" x2="540" y2="116" stroke="${color}33"/>
      <rect x="340" y="130" width="36" height="4" rx="1" fill="${color}" font-weight="700"/>
      <rect x="340" y="142" width="200" height="3" rx="1" fill="#3A3935"/>
      <rect x="340" y="150" width="190" height="3" rx="1" fill="#3A3935"/>
      <rect x="340" y="158" width="195" height="3" rx="1" fill="#3A3935"/>
      <!-- 高亮关键词 -->
      <rect x="340" y="166" width="40" height="10" rx="2" fill="${color}33"/>
      <rect x="386" y="166" width="50" height="10" rx="2" fill="${color}33"/>
      <rect x="442" y="166" width="40" height="10" rx="2" fill="${color}33"/>
      <!-- 量化 -->
      <rect x="340" y="186" width="36" height="4" rx="1" fill="${color}"/>
      <rect x="340" y="198" width="180" height="3" rx="1" fill="#3A3935"/>
      <text x="340" y="220" font-family="serif" font-size="10" fill="${color}" font-weight="700">• 提升转化率 35%</text>
      <text x="340" y="234" font-family="serif" font-size="10" fill="${color}" font-weight="700">• 带领 8 人团队</text>
      <text x="340" y="248" font-family="serif" font-size="10" fill="${color}" font-weight="700">• 年节省 ¥120 万</text>
      <text x="340" y="320" font-family="monospace" font-size="11" fill="${color}" font-weight="700">评分: 87 / 100 (+15)</text>
    </svg>`;
  }
  // score
  return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="600" height="360" fill="${color}"/>
    <text x="60" y="60" font-family="serif" font-size="22" fill="white" font-weight="700">AI 综合评分</text>
    <text x="60" y="82" font-family="monospace" font-size="11" fill="white" opacity="0.7">针对「产品经理」岗位</text>
    <text x="60" y="160" font-family="serif" font-size="80" fill="white" font-weight="700">87</text>
    <text x="180" y="148" font-family="monospace" font-size="12" fill="white" opacity="0.5">/ 100</text>
    <text x="180" y="170" font-family="monospace" font-size="14" fill="#FFD6A5" font-weight="700">+12 分</text>
    <line x1="60" y1="200" x2="540" y2="200" stroke="white" stroke-opacity="0.15"/>
    ${[
      { lbl: '关键词覆盖', v: 92 },
      { lbl: '量化表达', v: 85 },
      { lbl: '简历结构', v: 90 },
      { lbl: '行业匹配', v: 84 },
      { lbl: '亮点突出', v: 78 },
      { lbl: '排版美观', v: 95 }
    ].map((s, i) => `
      <text x="60" y="${236 + i * 18}" font-family="monospace" font-size="11" fill="white" opacity="0.9">${s.lbl}</text>
      <rect x="200" y="${228 + i * 18}" width="200" height="6" rx="3" fill="white" opacity="0.15"/>
      <rect x="200" y="${228 + i * 18}" width="${s.v * 2}" height="6" rx="3" fill="#FFD6A5"/>
      <text x="420" y="${236 + i * 18}" font-family="monospace" font-size="11" fill="#FFD6A5" font-weight="700">${s.v}</text>
    `).join('')}
  </svg>`;
}

function galleryDataReport(color, type) {
  if (type === 'trend') {
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="360" fill="#FAFAF7"/>
      <rect x="40" y="40" width="520" height="280" rx="10" fill="white" stroke="${color}22"/>
      <text x="60" y="74" font-family="serif" font-size="18" fill="#0F0F0E" font-weight="700">竞品 · 本周数据周报</text>
      <text x="60" y="94" font-family="monospace" font-size="10" fill="#6B6963">监控 5 个对手 · 数据来源: 官网 + 社媒 + App Store</text>
      <text x="520" y="74" font-family="monospace" font-size="14" fill="${color}" text-anchor="end" font-weight="700">↑ 42.3%</text>
      <!-- 柱状 -->
      ${[40, 65, 50, 80, 70, 95, 110].map((h, i) => `
        <rect x="${80 + i * 60}" y="${290 - h}" width="36" height="${h}" rx="3" fill="${color}${[33,44,55,66,88,aa,'cc'][i] || ''}"/>
        <text x="${98 + i * 60}" y="${285 - h}" font-family="monospace" font-size="9" fill="${color}" text-anchor="middle" font-weight="700">${[120, 145, 130, 165, 152, 188, 215][i]}</text>
        <text x="${98 + i * 60}" y="304" font-family="monospace" font-size="9" fill="#A5A39C" text-anchor="middle">${['周一','周二','周三','周四','周五','周六','周日'][i]}</text>
      `).join('')}
      <!-- 折线 -->
      <polyline points="98,250 158,225 218,240 278,210 338,220 398,195 458,180" fill="none" stroke="#F4B400" stroke-width="2.5" stroke-linecap="round"/>
      ${[250,225,240,210,220,195,180].map((y, i) => `<circle cx="${98 + i * 60}" cy="${y}" r="4" fill="#F4B400"/>`).join('')}
    </svg>`;
  }
  if (type === 'sentiment') {
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="360" fill="#FAFAF7"/>
      <text x="40" y="50" font-family="serif" font-size="18" fill="#0F0F0E" font-weight="700">舆情监控 · 本周</text>
      <!-- 饼图 -->
      <circle cx="160" cy="200" r="100" fill="${color}"/>
      <path d="M 160 200 L 160 100 A 100 100 0 0 1 246 240 Z" fill="#F4B400"/>
      <path d="M 160 200 L 246 240 A 100 100 0 0 1 130 295 Z" fill="#B83838"/>
      <circle cx="160" cy="200" r="50" fill="white"/>
      <text x="160" y="194" font-family="monospace" font-size="10" fill="#6B6963" text-anchor="middle">总声量</text>
      <text x="160" y="216" font-family="serif" font-size="22" fill="#0F0F0E" text-anchor="middle" font-weight="700">3,842</text>
      <!-- 图例 -->
      <rect x="320" y="100" width="14" height="14" fill="${color}"/>
      <text x="344" y="112" font-family="monospace" font-size="11" fill="#0F0F0E" font-weight="700">正面 (68%)</text>
      <text x="344" y="128" font-family="monospace" font-size="9" fill="#6B6963">"产品体验提升明显"</text>
      <rect x="320" y="150" width="14" height="14" fill="#F4B400"/>
      <text x="344" y="162" font-family="monospace" font-size="11" fill="#0F0F0E" font-weight="700">中性 (22%)</text>
      <text x="344" y="178" font-family="monospace" font-size="9" fill="#6B6963">"功能介绍 / 教程"</text>
      <rect x="320" y="200" width="14" height="14" fill="#B83838"/>
      <text x="344" y="212" font-family="monospace" font-size="11" fill="#0F0F0E" font-weight="700">负面 (10%)</text>
      <text x="344" y="228" font-family="monospace" font-size="9" fill="#6B6963">"价格太贵 / 体验差"</text>
      <!-- 热搜 -->
      <rect x="320" y="252" width="240" height="80" rx="6" fill="#FFF6E0"/>
      <text x="334" y="272" font-family="monospace" font-size="10" fill="#8A6500" font-weight="700">⚠ 热搜词 (近 30 分钟)</text>
      <text x="334" y="290" font-family="serif" font-size="12" fill="#8A6500" font-weight="700">"#X 公司涨价"</text>
      <text x="334" y="308" font-family="monospace" font-size="9" fill="#8A6500">声量 ↑ 230% · 已推送至邮箱</text>
    </svg>`;
  }
  // email
  return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="600" height="360" fill="#F2F1ED"/>
    <!-- 邮件框 -->
    <rect x="80" y="40" width="440" height="280" rx="8" fill="white" stroke="#E0DFD9"/>
    <rect x="80" y="40" width="440" height="40" rx="8 8 0 0" fill="${color}"/>
    <text x="100" y="64" font-family="serif" font-size="12" fill="white" font-weight="700">📧 FlowHub 竞品监控周报</text>
    <text x="500" y="64" font-family="monospace" font-size="9" fill="white" opacity="0.7" text-anchor="end">每周一 09:00</text>
    <!-- 邮件正文 -->
    <text x="100" y="106" font-family="serif" font-size="13" fill="#0F0F0E" font-weight="700">本周关键变化:</text>
    <rect x="100" y="118" width="400" height="2" rx="1" fill="${color}"/>
    <circle cx="110" cy="142" r="3" fill="${color}"/>
    <text x="122" y="146" font-family="serif" font-size="11" fill="#3A3935">竞品 A · 上线新功能「批量导出」</text>
    <text x="380" y="146" font-family="monospace" font-size="10" fill="${color}" font-weight="700" text-anchor="end">⚠ 重要</text>
    <circle cx="110" cy="166" r="3" fill="${color}"/>
    <text x="122" y="170" font-family="serif" font-size="11" fill="#3A3935">竞品 B · 价格上调 20%</text>
    <text x="380" y="170" font-family="monospace" font-size="10" fill="${color}" font-weight="700" text-anchor="end">⚠ 重要</text>
    <circle cx="110" cy="190" r="3" fill="${color}"/>
    <text x="122" y="194" font-family="serif" font-size="11" fill="#3A3935">竞品 C · 创始人离职</text>
    <text x="380" y="194" font-family="monospace" font-size="10" fill="#F4B400" font-weight="700" text-anchor="end">注意</text>
    <circle cx="110" cy="214" r="3" fill="${color}"/>
    <text x="122" y="218" font-family="serif" font-size="11" fill="#3A3935">行业新政策 · 数据合规要求加强</text>
    <text x="380" y="218" font-family="monospace" font-size="10" fill="#F4B400" font-weight="700" text-anchor="end">注意</text>
    <!-- 行动建议 -->
    <rect x="100" y="240" width="400" height="64" rx="6" fill="${color}11"/>
    <text x="120" y="262" font-family="serif" font-size="12" fill="${color}" font-weight="700">📌 AI 建议</text>
    <text x="120" y="282" font-family="serif" font-size="11" fill="#3A3935">建议关注竞品 A 的批量导出功能,考虑是否跟进</text>
    <text x="120" y="298" font-family="serif" font-size="11" fill="#3A3935">竞品 B 涨价是好机会,可针对性投放</text>
  </svg>`;
}

function galleryNav(wfId, dir) {
  const gallery = document.getElementById('gallery-' + wfId);
  if (!gallery) return;
  const slides = gallery.querySelectorAll('.gallery-slide');
  let current = 0;
  slides.forEach((s, i) => { if (s.classList.contains('active')) current = i; });
  const next = (current + dir + slides.length) % slides.length;
  galleryGoTo(wfId, next);
}

function galleryGoTo(wfId, idx) {
  const gallery = document.getElementById('gallery-' + wfId);
  if (!gallery) return;
  gallery.querySelectorAll('.gallery-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  gallery.querySelectorAll('.gallery-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  gallery.querySelectorAll('.gallery-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function renderSkeletonCards(count) {
  return Array.from({ length: count }, () => `
    <div class="wf-card skeleton-card">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton skeleton-badge"></div>
      <div class="skeleton skeleton-title skeleton-line"></div>
      <div class="skeleton skeleton-desc skeleton-line" style="width:85%"></div>
      <div class="skeleton-tags"><div class="skeleton skeleton-tag"></div><div class="skeleton skeleton-tag"></div></div>
      <div class="skeleton-foot"><div class="skeleton skeleton-foot-l"></div><div class="skeleton skeleton-foot-r"></div></div>
    </div>
  `).join('');
}

function renderWfCard(wf) {
  const clicks = getClickCount(wf.id);
  const ctaLabel = wf.type === 'recommend'
    ? '访问官网'
    : (wf.price_model === 'free' ? '免费试用' : '立即使用');
  const ctaIcon = wf.type === 'recommend'
    ? 'fa-external-link-alt'
    : (wf.price_model === 'free' ? 'fa-play' : 'fa-wand-magic-sparkles');
  const ctaClass = wf.type === 'recommend' ? 'recommend' : (wf.price_model === 'pro' ? 'pro' : '');
  return `
    <div class="wf-card" onclick="goToDetail('${wf.id}')">
      <div class="wf-thumb">
        ${getThumbSvg(wf, 'card')}
        <div class="wf-thumb-overlay"></div>
      </div>
      <div class="wf-card-head">
        ${renderWorkflowIcon(wf, 'wf-icon')}
        <span class="wf-badge ${wf.type === 'self' ? 'self' : 'ad'}">${wf.type === 'self' ? '自营' : '推荐'}</span>
      </div>
      <h3>${escapeHtml(wf.name)}</h3>
      <p class="desc">${escapeHtml(wf.tagline || wf.description.slice(0, 50))}</p>
      ${wf.tags && wf.tags.length ? `<div class="wf-tags">${wf.tags.slice(0, 3).map(t => `<span class="wf-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="wf-foot">
        <span class="wf-rating"><i class="fas fa-star"></i> ${wf.rating} · ${wf.review_count}</span>
        <span class="wf-price ${priceClass(wf)}">${formatPrice(wf)}</span>
      </div>
      <button class="wf-card-cta ${ctaClass}" onclick="event.stopPropagation(); runWorkflow('${wf.id}')">
        <i class="fas ${ctaIcon}" style="font-size:11px"></i>
        ${ctaLabel}
      </button>
    </div>
  `;
}

function renderSearchState(type) {
  if (type === 'loading') {
    return `
      <div class="search-state loading">
        <i class="fas fa-spinner fa-spin"></i>
        <h3>正在搜索</h3>
        <p>正在匹配工作流、外部工具和推广资源。</p>
      </div>
    `;
  }
  if (type === 'error') {
    return `
      <div class="search-state">
        <i class="fas fa-circle-exclamation"></i>
        <h3>搜索暂时不可用</h3>
        <p>${escapeHtml(state.searchError || '请稍后重试,或回到市场浏览推荐工作流。')}</p>
        <button class="search-clear-btn" onclick="clearSearchFilters()">重置搜索</button>
      </div>
    `;
  }
  return `
    <div class="search-state">
      <i class="fas fa-magnifying-glass"></i>
      <h3>没有找到匹配结果</h3>
      <p>换一个关键词,或放宽分类和类型筛选。</p>
      <div class="search-empty-suggest">
        ${['AI 生图', '小红书', '翻译', 'SQL', '海报', '简历'].map(t => `<span onclick="quickSearch('${t}')">${t}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderSearchResultCard(wf) {
  const typeLabel = getWorkflowTypeLabel(wf);
  const isExternal = wf.type === 'recommend';
  const isPromo = isPromotedWorkflow(wf);
  const actionLabel = isExternal ? '访问官网' : '立即使用';
  const actionIcon = isExternal ? 'fa-external-link-alt' : 'fa-play';
  const q = jsAttr(state.searchQuery);
  return `
    <article class="search-result-card" onclick="openSearchResult('${wf.id}')">
      <div class="wf-thumb">
        ${getThumbSvg(wf, 'card')}
        <div class="wf-thumb-overlay"></div>
      </div>
      <div>
        <div class="result-meta-row">
          <span class="result-type-badge ${isExternal ? 'external' : 'self'}">
            <i class="fas ${isExternal ? 'fa-arrow-up-right-from-square' : 'fa-cube'}"></i>
            ${typeLabel}
          </span>
          ${isPromo ? `<span class="result-type-badge promo"><i class="fas fa-bullhorn"></i>推广</span>` : ''}
          <span class="result-type-badge external">${escapeHtml(wf.category)}</span>
        </div>
        <h3>${escapeHtml(wf.name)}</h3>
        <p>${escapeHtml(wf.tagline || wf.description.slice(0, 88))}</p>
        <div class="result-tags">
          ${(wf.tags || []).slice(0, 5).map(t => `<span>${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <button class="result-action ${isExternal ? 'external' : ''}" onclick="event.stopPropagation(); runWorkflow('${wf.id}', { source: 'search', search_query: '${q}' })">
        <i class="fas ${actionIcon}"></i>
        ${actionLabel}
      </button>
    </article>
  `;
}

function renderSearch() {
  const data = getData();
  const active = Array.isArray(data.workflows)
    ? data.workflows.filter(w => w.status === 'active')
    : null;

  if (!active) {
    state.searchError = '数据结构异常: workflows 不是可搜索列表。';
  }

  const base = active || [];
  const results = state.searchError ? [] : filterWorkflowsForSearch(base)
    .map(w => ({ ...w, _clicks: getClickCount(w.id) }))
    .sort((a, b) => {
      if (isPromotedWorkflow(a) !== isPromotedWorkflow(b)) return isPromotedWorkflow(b) - isPromotedWorkflow(a);
      return (b._clicks || 0) - (a._clicks || 0);
    });
  const typeOptions = getSearchTypeOptions(base);
  const queryText = state.searchQuery ? `「${escapeHtml(state.searchQuery)}」` : '全部工具';

  document.getElementById('view-search').innerHTML = `
    ${renderNav()}
    <div class="container search-page">
      <section class="search-hero">
        <div>
          <div class="hero-eyebrow">SEARCH WORKFLOWS</div>
          <h1>搜索 AI 工作流与外部工具</h1>
          <p>输入任务、平台或工具名称,快速找到站内可用工作流、合作伙伴工具和广告推广资源。</p>
        </div>
        <div class="search-hero-count">
          <strong>${base.length}</strong>
          <span>可搜索资源</span>
        </div>
      </section>

      <div class="search-shell">
        <aside class="search-panel">
          <div class="search-panel-title">Search</div>
          <div class="search-page-box">
            <i class="fas fa-search"></i>
            <input id="search-page-input" type="text" placeholder="例如: 小红书、商品图、代码 Review" value="${escapeHtml(state.searchQuery)}" />
          </div>

          <div class="search-filter-block">
            <div class="search-filter-title">分类</div>
            <div class="search-filter-list">
              ${CATEGORIES.map(c => {
                const count = c === '全部' ? base.length : base.filter(w => w.category === c).length;
                return `
                  <button class="search-filter-item ${state.searchCategory === c ? 'active' : ''}" onclick="setSearchCategory('${c}')">
                    <span>${c}</span>
                    <span class="filter-count">${count}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="search-filter-block">
            <div class="search-filter-title">类型</div>
            <div class="search-filter-list">
              ${typeOptions.map(t => `
                <button class="search-filter-item ${state.searchType === t.id ? 'active' : ''}" onclick="setSearchType('${t.id}')">
                  <span>${t.label}</span>
                  <span class="filter-count">${t.count}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <button class="search-clear-btn" onclick="clearSearchFilters()">清空筛选</button>
        </aside>

        <main>
          <div class="search-results-head">
            <h2>${queryText} 的搜索结果</h2>
            <span>${state.searchCategory} · ${typeOptions.find(t => t.id === state.searchType)?.label || '全部类型'} · ${results.length} 个结果</span>
          </div>
          ${state.searchLoading
            ? renderSearchState('loading')
            : state.searchError
              ? renderSearchState('error')
              : results.length === 0
                ? renderSearchState('empty')
                : `<div class="search-result-grid">${results.map(renderSearchResultCard).join('')}</div>`}
        </main>
      </div>
      ${renderFooter()}
    </div>
  `;
}

function renderNav() {
  const data = getData();
  const notifs = getNotifications();
  const unreadCount = notifs.filter(n => !n.read).length;

  return `
    <nav class="cnav">
      <div class="logo" onclick="switchView('market')">
        ${renderBrandMark('mark brand-mark')}
        <span class="name">FlowHub</span>
      </div>
      <div class="cnav-search" id="cnav-search-wrap">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="搜索工作流,或描述你想完成的任务…" onfocus="showSearchDropdown()" />
        <span class="kbd">⌘ K</span>
        <div class="search-dropdown" id="search-dropdown"></div>
      </div>
      <div class="cnav-right">
        <button class="mobile-menu-trigger" onclick="openMobileDrawer()"><i class="fas fa-bars"></i></button>
        <span class="cnav-link" onclick="switchView('market')">市场</span>
        <span class="cnav-link" onclick="switchView('creator')">创作者</span>
        <span class="cnav-link" onclick="switchView('advertiser')">广告投放</span>
        <span class="cnav-link" onclick="switchView('wizard')">接入文档</span>
        <span class="cnav-link" onclick="switchView('me')">我的</span>
        ${data.user && data.user.role === 'admin' ? `<span class="cnav-link" onclick="switchView('admin')">管理后台</span>` : ''}
        ${data.user ? `
          <div class="notif-wrap">
            <button class="notif-bell" onclick="toggleNotifPanel(event)">
              <i class="fas fa-bell"></i>
              ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
            </button>
            <div class="notif-panel" id="notif-panel">
              <div class="notif-head">
                <h4>通知</h4>
                <button class="mark-read" onclick="markAllRead(event)">全部标为已读</button>
              </div>
              <div class="notif-list">
                ${notifs.length === 0 ? `<div style="padding:32px;text-align:center;color:var(--ink-3);font-size:13px">暂无通知</div>` : notifs.map(n => `
                  <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotif('${n.id}')">
                    <div class="notif-icon" style="background:${n.color}22;color:${n.color}"><i class="fas ${n.icon}"></i></div>
                    <div class="notif-content">
                      <div class="title">${escapeHtml(n.title)}</div>
                      <div class="desc">${escapeHtml(n.desc)}</div>
                      <div class="time">${escapeHtml(n.time)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="avatar" onclick="switchView('me')">${data.user.name.charAt(0)}<div class="dot"></div></div>
        ` : `
          <button class="login-btn" onclick="openLogin()">登录</button>
        `}
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题" style="background:none;border:1px solid var(--line);width:32px;height:32px;border-radius:8px;cursor:pointer;color:var(--ink-2);display:flex;align-items:center;justify-content:center;font-size:13px;margin-left:4px"><i class="fas fa-moon" id="theme-icon-nav"></i></button>
      </div>
    </nav>
  `;
}

function getNotifications() {
  const data = getData();
  if (!data.user) return [];
  if (!data._notifs) {
    data._notifs = [
      { id: 'n1', icon: 'fa-crown', color: '#5B3FA8', title: '欢迎加入 FlowHub', desc: '解锁你的第一个 Pro 工作流体验', time: '刚刚', read: false },
      { id: 'n2', icon: 'fa-gift', color: '#B85C00', title: '新人福利', desc: '邀请 1 位好友即可获赠 1 个月 Pro', time: '1 分钟前', read: false },
      { id: 'n3', icon: 'fa-star', color: '#F4B400', title: '本周精选已更新', desc: 'PicSpark 商品图 AI 等 5 个新工作流上线', time: '3 小时前', read: false },
      { id: 'n4', icon: 'fa-fire', color: '#FF4D4D', title: '小红书爆款笔记爆红', desc: '本周调用量 +280%,你也来试试', time: '1 天前', read: true },
      { id: 'n5', icon: 'fa-handshake', color: '#1A5D3A', title: '订阅成功', desc: '感谢升级 Pro · 下次续费 2026-06-11', time: '2 天前', read: true }
    ];
    saveData(data);
  }
  return data._notifs;
}

function toggleNotifPanel(e) {
  e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.toggle('show');
}

function readNotif(id) {
  const data = getData();
  if (data._notifs) {
    const n = data._notifs.find(x => x.id === id);
    if (n) n.read = true;
    saveData(data);
    render();
  }
}

function markAllRead(e) {
  e.stopPropagation();
  const data = getData();
  if (data._notifs) {
    data._notifs.forEach(n => n.read = true);
    saveData(data);
    showToast('全部标为已读');
    render();
  }
}

// 移动端抽屉
function renderMobileDrawer() {
  const data = getData();
  const isAdmin = data.user && data.user.role === 'admin';
  const isCreator = data.user && (data.user.role === 'admin' || data.user.role === 'creator');
  const drawer = document.getElementById('mobile-drawer');
  drawer.innerHTML = `
    <div class="mobile-drawer-head">
      <div class="logo" style="cursor:default">
        ${renderBrandMark('mark brand-mark')}
        <span class="name">FlowHub</span>
      </div>
    </div>
    ${data.user ? `
      <div style="padding:0 18px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);margin-bottom:8px">
        <div style="width:36px;height:36px;border-radius:10px;background:var(--self);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px">${data.user.name.charAt(0)}</div>
        <div>
          <div style="font-weight:600;font-size:14px">${escapeHtml(data.user.name)}</div>
          <div style="font-size:11px;color:var(--ink-3)">${data.user.tier === 'pro' ? 'Pro 会员' : '免费用户'}</div>
        </div>
      </div>
    ` : `
      <div style="padding:0 18px 14px;border-bottom:1px solid var(--line);margin-bottom:8px">
        <button onclick="closeMobileDrawer(); openLogin()" style="width:100%;padding:10px;background:var(--ink);color:var(--bg);border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">登录 / 注册</button>
      </div>
    `}
    <div class="mobile-drawer-item" onclick="closeMobileDrawer(); switchView('market')"><i class="fas fa-house"></i>工作流市场</div>
    <div class="mobile-drawer-item" onclick="closeMobileDrawer(); switchView('me')"><i class="fas fa-user"></i>个人中心</div>
    <div class="mobile-drawer-item" onclick="closeMobileDrawer(); openCreatorApply()"><i class="fas fa-rocket"></i>创作者入驻</div>
    ${isCreator ? `
      <div class="mobile-drawer-section">创作者</div>
      <div class="mobile-drawer-item" onclick="closeMobileDrawer(); switchView('creator')"><i class="fas fa-pen-fancy"></i>创作者后台</div>
      <div class="mobile-drawer-item" onclick="closeMobileDrawer(); switchView('advertiser')"><i class="fas fa-bullhorn"></i>广告主入驻</div>
    ` : ''}
    ${isAdmin ? `
      <div class="mobile-drawer-section">管理</div>
      <div class="mobile-drawer-item" onclick="closeMobileDrawer(); switchView('admin')"><i class="fas fa-chart-pie"></i>管理后台</div>
    ` : ''}
    <div style="margin-top:auto;padding-top:18px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
      <button onclick="toggleTheme()" style="background:none;border:1px solid var(--line-strong);padding:8px 14px;border-radius:8px;font-size:12px;color:var(--ink-2);cursor:pointer">
        <i class="fas fa-moon"></i> 主题
      </button>
    </div>
  `;
}

function openMobileDrawer() {
  renderMobileDrawer();
  document.getElementById('mobile-drawer-bg').classList.add('show');
  document.getElementById('mobile-drawer').classList.add('show');
}
function closeMobileDrawer() {
  document.getElementById('mobile-drawer-bg').classList.remove('show');
  document.getElementById('mobile-drawer').classList.remove('show');
}
function openMobileNotif() {
  // 在移动端点通知:打开通知面板
  const data = getData();
  if (!data.user) { openLogin(); return; }
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.add('show');
}
function quickSearchFocus() {
  switchView('search');
  setTimeout(() => {
    const input = document.querySelector('#view-search #search-page-input, #view-search .cnav-search input');
    if (input) input.focus();
  }, 200);
}

// 移动端 Tab 高亮跟随 view
function updateMobileTab() {
  const view = state.view;
  document.querySelectorAll('.mobile-tab[data-mobile-view]').forEach(t => {
    const v = t.dataset.mobileView;
    t.classList.toggle('active',
      (v === 'market' && view === 'market') ||
      (v === 'search' && view === 'search') ||
      (v === 'me' && view === 'me')
    );
  });
}

// 点击外部关闭通知面板
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  if (panel && panel.classList.contains('show') && !e.target.closest('.notif-wrap') && !e.target.closest('[onclick*="openMobileNotif"]')) {
    panel.classList.remove('show');
  }
});

// 滚动到顶按钮控制
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  btn.classList.toggle('show', window.scrollY > 600);
});

function setCategory(c) {
  state.activeCategory = c;
  renderMarket();
}

function clearSearch() {
  state.searchQuery = '';
  state.searchCategory = '全部';
  state.searchType = 'all';
  state.searchLoading = false;
  state.searchError = '';
  render();
}

function renderDocumentMarkdownRunner(wf) {
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · 文档转 Markdown</h3>
      <p>真实后端转换:PDF 用 pdf-parse,Word 用 mammoth,HTML 用 Readability/Turndown。适合把文件整理成 AI 可读素材。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Open-source Workflow</div>
            <h4>上传文档,生成 Markdown</h4>
            <p>支持 PDF、DOCX、HTML、TXT、MD、CSV、JSON。最大 20MB,结果不会上传到第三方 API。</p>
          </div>
          <span class="inline-runner-badge">真实可用 · 本地处理</span>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="runner-field">
              <label for="doc-file-${wf.id}">选择文件</label>
              <input class="tool-file-input" id="doc-file-${wf.id}" type="file" accept=".pdf,.docx,.html,.htm,.txt,.md,.markdown,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*">
            </div>
            <div class="runner-field">
              <label>可用场景</label>
              <div class="runner-presets">
                <span class="runner-preset">合同整理</span>
                <span class="runner-preset">论文入库</span>
                <span class="runner-preset">知识库素材</span>
              </div>
            </div>
            <div class="runner-actions">
              <button class="runner-primary" id="doc-run-${wf.id}" onclick="runDocumentMarkdownWorkflow('${wf.id}')">
                <i class="fas fa-file-arrow-up"></i> 转换 Markdown
              </button>
            </div>
          </div>
          <div class="runner-output" id="doc-output-${wf.id}">
            <div class="runner-empty">
              <div><i class="fas fa-file-lines"></i>上传文件后会输出 Markdown、字数和解析信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWebpageMarkdownRunner(wf) {
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · 网页转 Markdown</h3>
      <p>真实后端抓取公开网页,用 Readability 提取正文,再转成 Markdown。适合做竞品分析、知识库采集和文章归档。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Open-source Workflow</div>
            <h4>输入 URL,提取正文</h4>
            <p>为安全起见只支持公开 http/https 页面,会拦截 localhost 和内网地址。</p>
          </div>
          <span class="inline-runner-badge">真实抓取 · SSRF 防护</span>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="runner-field">
              <label for="web-url-${wf.id}">网页 URL</label>
              <input class="runner-input" id="web-url-${wf.id}" value="https://example.com" placeholder="https://example.com/article">
            </div>
            <div class="runner-field">
              <label>适合内容</label>
              <div class="runner-presets">
                <button class="runner-preset" onclick="setRunnerInput('web-url-${wf.id}', 'https://example.com')">示例页面</button>
                <span class="runner-preset">竞品官网</span>
                <span class="runner-preset">博客文章</span>
              </div>
            </div>
            <div class="runner-actions">
              <button class="runner-primary" id="web-run-${wf.id}" onclick="runWebpageMarkdownWorkflow('${wf.id}')">
                <i class="fas fa-globe"></i> 抓取并转换
              </button>
            </div>
          </div>
          <div class="runner-output" id="web-output-${wf.id}">
            <div class="runner-empty">
              <div><i class="fas fa-file-code"></i>输入公开网页地址后会输出标题、摘要和 Markdown 正文</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderImageOcrRunner(wf) {
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · 图片 OCR 识别</h3>
      <p>真实后端 OCR:上传图片后由 Tesseract.js 识别中英文文字。首次识别会加载语言模型,需要多等几秒。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Open-source Workflow</div>
            <h4>截图 / 图片转文字</h4>
            <p>支持 PNG、JPG、WEBP、BMP、TIFF。适合网页截图、图片资料和简单票据转写。</p>
          </div>
          <span class="inline-runner-badge">OCR · 本地引擎</span>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="runner-field">
              <label for="ocr-file-${wf.id}">选择图片</label>
              <input class="tool-file-input" id="ocr-file-${wf.id}" type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff" onchange="previewOcrImage('${wf.id}')">
              <div class="ocr-preview-card" id="ocr-preview-${wf.id}">
                <div class="ocr-preview-empty">
                  <i class="fas fa-image"></i>
                  选择图片后会在这里显示预览
                </div>
              </div>
            </div>
            <div class="runner-field">
              <label for="ocr-lang-${wf.id}">识别语言</label>
              <select class="runner-select" id="ocr-lang-${wf.id}">
                <option value="chi_sim+eng">中文 + 英文</option>
                <option value="eng">英文</option>
                <option value="chi_sim">简体中文</option>
              </select>
            </div>
            <div class="runner-actions">
              <button class="runner-primary" id="ocr-run-${wf.id}" onclick="runImageOcrWorkflow('${wf.id}')">
                <i class="fas fa-eye"></i> 开始识别
              </button>
            </div>
          </div>
          <div class="runner-output" id="ocr-output-${wf.id}">
            <div class="runner-empty">
              <div><i class="fas fa-image"></i>上传图片后会输出识别文本、置信度和 Markdown</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFitnessMealRunner(wf) {
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · 健身餐菜谱生成器</h3>
      <p>快速接入版:参考开源 AI fitness planner 的思路,用本地常见食材营养表计算热量和 P/C/F,再生成一份可执行健身餐。</p>
      <div class="inline-runner fitness-meal-runner">
        <div class="inline-runner-head">
          <div class="meal-runner-title">
            <span class="meal-title-icon"><i class="fas fa-utensils"></i></span>
            <div>
              <div class="inline-runner-kicker">Open-source Inspired Workflow</div>
              <h4>食材 → 菜谱 → 热量营养</h4>
              <p>输入已有食材和重量,适合减脂餐、增肌餐、备餐便当。第一版覆盖常见健身餐食材。</p>
            </div>
          </div>
          <div class="meal-head-stats">
            <div class="meal-head-stat"><span>Engine</span><strong>本地计算</strong></div>
            <div class="meal-head-stat"><span>Output</span><strong>菜谱 + P/C/F</strong></div>
            <div class="meal-head-stat"><span>Source</span><strong>MIT 参考</strong></div>
          </div>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="meal-form-card">
              <span class="meal-form-icon"><i class="fas fa-list-check"></i></span>
              <div>
                <h5>输入你现在有的食材</h5>
                <p>每行写一个食材和重量,例如「鸡胸肉 200g」。系统会先算营养,再生成适合目标的做法。</p>
              </div>
            </div>
            <div class="meal-quick-stats">
              <div class="meal-quick-stat"><span>Step 01</span><strong>录入食材</strong></div>
              <div class="meal-quick-stat"><span>Step 02</span><strong>计算营养</strong></div>
              <div class="meal-quick-stat"><span>Step 03</span><strong>生成做法</strong></div>
            </div>
            <div class="runner-field">
              <div class="meal-field-head">
                <label for="meal-ingredients-${wf.id}">现有食材</label>
                <span class="meal-field-hint">支持 g / kg / 斤 / 个 / ml</span>
              </div>
              <textarea class="runner-textarea meal-ingredients-input" id="meal-ingredients-${wf.id}" placeholder="每行一个食材,尽量写重量。例如: 鸡胸肉 200g">鸡胸肉 200g
米饭 150g
西兰花 100g
鸡蛋 2个</textarea>
            </div>
            <div class="meal-control-panel">
              <div class="meal-control-title">目标设置 <span>按目标调整主食和油脂建议</span></div>
              <div class="runner-two">
                <div class="runner-field">
                  <label for="meal-goal-${wf.id}">目标</label>
                  <select class="runner-select" id="meal-goal-${wf.id}">
                    <option value="fat_loss">减脂</option>
                    <option value="muscle_gain">增肌</option>
                    <option value="balanced">均衡</option>
                  </select>
                </div>
                <div class="runner-field">
                  <label for="meal-type-${wf.id}">餐次</label>
                  <select class="runner-select" id="meal-type-${wf.id}">
                    <option value="dinner">晚餐</option>
                    <option value="lunch">午餐</option>
                    <option value="breakfast">早餐</option>
                    <option value="snack">加餐</option>
                  </select>
                </div>
              </div>
              <div class="runner-field">
                <label for="meal-servings-${wf.id}">份数</label>
                <input class="runner-input" id="meal-servings-${wf.id}" type="number" min="1" max="8" value="1">
              </div>
            </div>
            <div class="runner-field">
              <label>快速样例</label>
              <div class="runner-presets">
                <button class="runner-preset" onclick="applyFitnessMealPreset('${wf.id}','cut')">减脂晚餐</button>
                <button class="runner-preset" onclick="applyFitnessMealPreset('${wf.id}','bulk')">增肌午餐</button>
                <button class="runner-preset" onclick="applyFitnessMealPreset('${wf.id}','breakfast')">高蛋白早餐</button>
              </div>
            </div>
            <div class="runner-field">
              <label>常见食材</label>
              <div class="meal-chip-row">
                ${['鸡胸肉 200g', '米饭 150g', '西兰花 100g', '鸡蛋 2个', '燕麦 60g', '牛肉 200g', '香蕉 1根', '希腊酸奶 150g'].map(item => `
                  <button class="meal-chip" onclick="appendFitnessIngredient('${wf.id}', '${item}')">${item}</button>
                `).join('')}
              </div>
            </div>
            <div class="runner-actions meal-submit-row">
              <button class="runner-primary" id="meal-run-${wf.id}" onclick="runFitnessMealWorkflow('${wf.id}')">
                <i class="fas fa-utensils"></i> 生成菜谱
              </button>
            </div>
          </div>
          <div class="runner-output" id="meal-output-${wf.id}">
            <div class="runner-empty">
              <div class="meal-empty-layout">
                <div>
                  <div class="meal-empty-icon"><i class="fas fa-bowl-food"></i></div>
                  <div class="meal-empty-title">等待生成菜谱</div>
                  <div class="meal-empty-copy">输入食材后会生成健身餐做法、总热量和三大营养素</div>
                </div>
                <div class="meal-empty-macros">
                  <span>kcal</span>
                  <span>protein</span>
                  <span>carbs</span>
                  <span>fat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInlineRunner(wf) {
  if (!isInlineRunnerWorkflow(wf)) return '';
  if (wf.id === 'wf_seed_image_video') return renderImageVideoRunner(wf);
  if (wf.id === 'wf_seed_sql') return renderSqlRunner(wf);
  if (wf.id === 'wf_seed_doc_markdown') return renderDocumentMarkdownRunner(wf);
  if (wf.id === 'wf_seed_web_markdown') return renderWebpageMarkdownRunner(wf);
  if (wf.id === 'wf_seed_image_ocr') return renderImageOcrRunner(wf);
  if (wf.id === 'wf_seed_fitness_meal') return renderFitnessMealRunner(wf);
  return '';
}

function renderRun() {
  const data = getData();
  const runId = state.currentRunId;
  const wf = data.workflows.find(w => w.id === runId);
  if (wf) {
    state.currentRunId = wf.id;
    state.currentDetailId = wf.id;
  }
  const view = document.getElementById('view-run');
  if (!wf || !isInlineRunnerWorkflow(wf)) {
    view.innerHTML = `
      <div class="run-page">
        <div class="run-topbar">
          <div class="run-left">
            <button class="run-back" onclick="switchView('market')" title="返回市场">←</button>
            <div class="run-title">
              <h1>工作流不存在</h1>
              <p>请返回市场重新选择一个自营工作流</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.title = '运行工作流 · FlowHub';
    return;
  }

  document.title = wf.name + ' · 运行中';
  const isImageVideoRun = wf.id === 'wf_seed_image_video';
  const topbarActions = isImageVideoRun ? `
          <button class="run-action-btn icon-only" onclick="undoIvCanvas('${wf.id}')" title="撤销">↶</button>
          <button class="run-action-btn icon-only" onclick="redoIvCanvas('${wf.id}')" title="重做">↷</button>
          <button class="run-action-btn" onclick="runIvWorkflow('${wf.id}')">▶ 运行</button>
          <button class="run-action-btn" onclick="saveIvProject('${wf.id}')"><i class="fas fa-cloud-arrow-up"></i> 保存</button>
          <button class="run-action-btn" onclick="exportIvProject('${wf.id}')"><i class="fas fa-download"></i> 导出</button>
          <button class="run-action-btn" onclick="openIvProjectImport('${wf.id}')"><i class="fas fa-file-import"></i> 导入</button>
          <button class="run-action-btn" id="iv-guide-top-${wf.id}" onclick="toggleIvGuide('${wf.id}')"><i class="fas fa-circle-info"></i> 功能说明</button>
          <button class="run-action-btn" onclick="shareIvWorkflow('${wf.id}')">⇧ 分享</button>
          <button class="run-action-btn" onclick="favoriteIvWorkflow('${wf.id}')">☆ 收藏</button>
  ` : `
          <button class="run-action-btn" onclick="shareIvWorkflow('${wf.id}')">⇧ 分享</button>
          <button class="run-action-btn" onclick="favoriteIvWorkflow('${wf.id}')">☆ 收藏</button>
  `;
  view.innerHTML = `
    <div class="run-page ${isImageVideoRun ? 'is-canvas-run' : 'is-form-run'}">
      <div class="run-topbar">
        <div class="run-left">
          <button class="run-back" onclick="goToDetail('${wf.id}')" title="返回详情">←</button>
          <div class="run-title">
            <h1>${escapeHtml(wf.name)}</h1>
            <p>${escapeHtml(wf.tagline || '沉浸式自营工作流')}</p>
          </div>
        </div>
        <div class="run-topbar-center">
          ${topbarActions}
        </div>
        <div class="run-right">
          <span class="run-status"><span class="dot"></span>${wf.price_model === 'free' ? '免费试用' : 'Pro 工作流'}</span>
          ${isImageVideoRun ? `<span class="run-status" id="iv-save-status-${wf.id}"><i class="fas fa-check-circle"></i> 已保存</span>` : ''}
          <span class="run-status"><i class="fas fa-bolt"></i>${getClickCount(wf.id).toLocaleString()} 次运行</span>
          ${isImageVideoRun ? `<button class="run-publish-btn" onclick="publishIvWorkflow('${wf.id}')">发布工作流</button>` : ''}
        </div>
      </div>
      <div class="run-workspace">
        ${renderInlineRunner(wf)}
      </div>
    </div>
  `;
  if (wf.id === 'wf_seed_image_video') {
    setTimeout(() => {
      renderImageVideoCanvas(wf.id);
      renderImageVideoAssets(wf.id);
      syncIvCanvasControls(wf.id);
    }, 0);
  }
}

function getImageVideoGuideItems() {
  return [
    { id: 'canvas', title: '左侧无限画布', copy: '像 Figma 一样自由拖拽、排布和缩放工作流节点。' },
    { id: 'image', title: 'Image2Image 生图节点', copy: '输入提示词、模型、尺寸和风格,快速生成关键帧图片。' },
    { id: 'drag', title: '拖拽上画布', copy: '聊天区生成的图片或视频方案可以一键加入画布,也可以拖拽到节点中使用。' },
    { id: 'link', title: '节点连接工作流', copy: '把生图输出连接到 Grok Video-3 节点,形成完整流程。' },
    { id: 'video', title: '视频生成节点', copy: '支持上传输入图、填写动态提示词、设置时长与分辨率。' },
    { id: 'output', title: '视频输出预览', copy: '生成后可预览、下载、重新生成或继续优化。' },
    { id: 'assistant', title: '右侧 AI 聊天助手', copy: '像 GPT 一样通过自然语言提出需求,直接生成图片、视频方案或节点建议。' },
    { id: 'advice', title: '工作流建议', copy: 'AI 可自动推荐下一步节点和流程结构。' },
    { id: 'assets', title: '资源区与参考素材', copy: '场景图、标题图、多参照图可重复拖入画布复用。' },
    { id: 'topbar', title: '顶部工具栏', copy: '支持运行、分享、收藏、发布工作流和自动保存。' },
    { id: 'tools', title: '画布操作', copy: '支持选择、对齐、布局、锁定、网格、缩放、迷你地图导航。' },
    { id: 'scenes', title: '适合的使用场景', copy: '图生视频、内容创作、短视频工作流搭建和可视化 AI 编排。' }
  ];
}

function renderImageVideoGuideCallouts() {
  const callouts = [
    ['canvas', '1', '左侧无限画布', '自由拖拽、排布、缩放工作流节点。'],
    ['node', '2', '生图节点', '输入提示词、模型和尺寸生成图片。'],
    ['link', '4', '连接工作流', '把生图输出连接到视频生成节点。'],
    ['video', '5', '视频生成节点', '设置时长、比例和动态提示词。'],
    ['materials', '9', '资源与素材', '参考素材可重复拖入画布复用。'],
    ['topbar', '10', '顶部工具栏', '运行、分享、收藏和发布工作流。'],
    ['tools', '11', '画布操作', '选择、对齐、布局、锁定、网格和缩放。']
  ];
  return callouts.map(([cls, step, title, copy]) => `
    <div class="iv-guide-note ${cls}" data-step="${step}">
      <strong>${escapeHtml(title)}</strong>${escapeHtml(copy)}
    </div>
  `).join('');
}

function renderImageVideoGuidePanel() {
  return `
    <div class="iv-guide-hero">
      <h4>核心功能说明</h4>
      <p>这个工作流的核心是:右侧用自然语言生成素材,左侧把素材串成可视化流程,最后由 Grok Video-3 生成视频输出。</p>
    </div>
    ${getImageVideoGuideItems().map((item, index) => `
      <div class="iv-guide-item">
        <span class="iv-guide-num">${index + 1}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.copy)}</p>
      </div>
    `).join('')}
  `;
}

function switchIvAssistantTab(wfId, tab) {
  const chat = document.getElementById('iv-chat-' + wfId);
  const guide = document.getElementById('iv-guide-panel-' + wfId);
  const chatTab = document.getElementById('iv-tab-chat-' + wfId);
  const guideTab = document.getElementById('iv-tab-guide-' + wfId);
  if (!chat || !guide) return;
  const showGuide = tab === 'guide';
  chat.style.display = showGuide ? 'none' : 'flex';
  guide.classList.toggle('show', showGuide);
  if (chatTab) chatTab.classList.toggle('active', !showGuide);
  if (guideTab) guideTab.classList.toggle('active', showGuide);
}

function toggleIvGuide(wfId) {
  const studio = document.getElementById('iv-studio-' + wfId);
  if (!studio) return;
  const show = !studio.classList.contains('guide-on');
  studio.classList.toggle('guide-on', show);
  const topBtn = document.getElementById('iv-guide-top-' + wfId);
  if (topBtn) topBtn.classList.toggle('active', show);
  switchIvAssistantTab(wfId, show ? 'guide' : 'chat');
  showToast(show ? '已打开功能说明' : '已关闭功能说明');
}

function closeIvGuide(wfId) {
  const studio = document.getElementById('iv-studio-' + wfId);
  if (studio) studio.classList.remove('guide-on');
  const topBtn = document.getElementById('iv-guide-top-' + wfId);
  if (topBtn) topBtn.classList.remove('active');
  switchIvAssistantTab(wfId, 'chat');
  showToast('已关闭功能说明');
}

function renderImageVideoRunner(wf) {
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · Image2Video 画布导演</h3>
      <p>优化后的结构是左侧画布、右侧对话:先用 Image2 生成关键帧,再把图片拖进画布排成镜头链路,最后生成视频预览。这里先做完整交互 demo,后续把生成按钮接真实 Image2 和视频 API。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Self-run Workflow</div>
            <h4>图生视频创作台</h4>
            <p>画布负责结构,聊天负责生成。用户不用理解复杂参数,但能清楚看到每张图如何连接成视频。</p>
          </div>
          <span class="inline-runner-badge">自营 · Beta</span>
        </div>
        <div class="iv-studio" id="iv-studio-${wf.id}">
          <div class="iv-canvas-panel">
            <div class="iv-canvas-shell">
              <div class="iv-left-rail">
                <button class="iv-tool-btn active" id="iv-rail-select-${wf.id}" onclick="setIvCanvasTool('${wf.id}','select')" title="选择"><i class="fas fa-arrow-pointer"></i></button>
                <button class="iv-tool-btn" id="iv-rail-pan-${wf.id}" onclick="setIvCanvasTool('${wf.id}','pan')" title="拖动画布"><i class="fas fa-hand"></i></button>
                <button class="iv-tool-btn" onclick="openIvImageUpload('${wf.id}')" title="上传素材"><i class="fas fa-image"></i></button>
                <button class="iv-tool-btn" onclick="addIvTextNote('${wf.id}')" title="文字"><i class="fas fa-font"></i></button>
                <button class="iv-tool-btn" onclick="showToast('评论已记录在工作流建议中')" title="评论"><i class="far fa-comment-dots"></i></button>
                <div class="iv-rail-divider"></div>
                <button class="iv-tool-btn" onclick="showIvLayerList('${wf.id}')" title="图层"><i class="fas fa-layer-group"></i></button>
                <button class="iv-tool-btn" onclick="fitIvCanvas('${wf.id}')" title="适配视图"><i class="fas fa-expand"></i></button>
              </div>
              <input class="iv-upload-input" id="iv-file-${wf.id}" type="file" accept="image/*" multiple onchange="handleIvFileInput(event,'${wf.id}')">
              <div class="iv-canvas-toolbar">
                <button class="iv-tool-btn active" id="iv-toolbar-select-${wf.id}" onclick="setIvCanvasTool('${wf.id}','select')"><i class="fas fa-arrow-pointer"></i> 选择</button>
                <button class="iv-tool-btn" onclick="alignIvCanvasNodes('${wf.id}')"><i class="fas fa-align-center"></i> 对齐</button>
                <button class="iv-tool-btn" onclick="autoLayoutIvCanvas('${wf.id}')"><i class="fas fa-diagram-project"></i> 布局</button>
                <button class="iv-tool-btn" onclick="fitIvCanvas('${wf.id}')"><i class="fas fa-magnifying-glass"></i> 适配</button>
                <button class="iv-tool-btn" onclick="showIvWorkflowInspector('${wf.id}')"><i class="fas fa-list-check"></i> 检查</button>
                <button class="iv-tool-btn" onclick="clearIvCanvas('${wf.id}')"><i class="fas fa-trash-can"></i> 清空</button>
                <button class="iv-tool-btn" id="iv-lock-${wf.id}" onclick="toggleIvLock('${wf.id}')"><i class="fas fa-lock-open"></i> 锁定</button>
                <button class="iv-tool-btn active" id="iv-grid-${wf.id}" onclick="toggleIvGrid('${wf.id}')"><i class="fas fa-border-all"></i> 网格</button>
              </div>
              <div class="iv-canvas-stage" id="iv-canvas-${wf.id}" onpointerdown="startIvCanvasPan(event,'${wf.id}')" ondragover="handleIvDragOver(event)" ondragleave="handleIvDragLeave(event)" ondrop="handleIvDrop(event,'${wf.id}')">
                <div class="iv-canvas-empty">
                  <i class="fas fa-object-group" style="font-size:22px;color:var(--self);margin-bottom:8px"></i><br>
                  从右侧生成图片后拖到这里<br>
                  或点击图片上的「加入画布」
                </div>
              </div>
              <input class="iv-upload-input" id="iv-project-file-${wf.id}" type="file" accept=".json,application/json" onchange="handleIvProjectImport(event,'${wf.id}')">
              <div class="iv-minimap">
                <div class="iv-minimap-track">
                  <span class="iv-mini-node"></span>
                  <span class="iv-mini-node"></span>
                  <span class="iv-mini-node"></span>
                </div>
              </div>
              <div class="iv-zoom">
                <button onclick="zoomIvCanvas('${wf.id}',-0.1)">-</button>
                <span id="iv-zoom-label-${wf.id}">100%</span>
                <button onclick="zoomIvCanvas('${wf.id}',0.1)">+</button>
              </div>
              <div class="iv-video-box" id="iv-video-${wf.id}">
                <div class="iv-video-empty">画布里至少 2 个镜头后,可以生成视频预览</div>
              </div>
              <div class="iv-guide-callouts" id="iv-guide-callouts-${wf.id}">
                ${renderImageVideoGuideCallouts()}
              </div>
            </div>
          </div>
          <div class="iv-chat-panel">
            <div class="iv-assistant-head">
              <div class="iv-assistant-tabs">
                <span class="iv-assistant-title">✦ AI 助手</span>
                <span class="iv-assistant-tab active" id="iv-tab-chat-${wf.id}" onclick="switchIvAssistantTab('${wf.id}','chat')">对话</span>
                <span class="iv-assistant-tab" id="iv-tab-guide-${wf.id}" onclick="switchIvAssistantTab('${wf.id}','guide')">功能说明</span>
              </div>
              <div class="iv-assistant-tools">
                <button class="iv-tool-btn" title="打开功能说明" onclick="toggleIvGuide('${wf.id}')">?</button>
                <button class="iv-tool-btn" title="工作流建议" onclick="switchIvAssistantTab('${wf.id}','guide')">≛</button>
                <button class="iv-tool-btn" title="关闭说明" onclick="closeIvGuide('${wf.id}')">×</button>
              </div>
            </div>
            <div class="iv-chat-log" id="iv-chat-${wf.id}">
              <div class="iv-msg bot">描述你要的画面,我会生成一张关键帧。生成后可以拖到左侧画布,再让视频引擎按镜头顺序生成短视频。</div>
              <div class="iv-msg bot">建议先做 3 个镜头:开场建立场景、中段产品/人物动作、结尾品牌或转化画面。</div>
              <div class="iv-assets" id="iv-assets-${wf.id}"></div>
            </div>
            <div class="iv-guide-panel" id="iv-guide-panel-${wf.id}">
              ${renderImageVideoGuidePanel()}
            </div>
            <div class="iv-compose">
              <textarea class="runner-textarea" id="iv-prompt-${wf.id}" placeholder="例如: 赛博城市夜景中,一个穿银色夹克的人走过霓虹街道,电影感,雨夜反光">赛博城市夜景中,一个穿银色夹克的人走过霓虹街道,电影感,雨夜反光</textarea>
              <div class="iv-compose-row">
                <select class="runner-select" id="iv-style-${wf.id}">
                  <option value="cinematic">电影感</option>
                  <option value="product">商品广告</option>
                  <option value="anime">动画分镜</option>
                  <option value="realistic">真实摄影</option>
                </select>
                <select class="runner-select" id="iv-ratio-${wf.id}">
                  <option value="9:16">9:16 竖屏</option>
                  <option value="16:9">16:9 横屏</option>
                  <option value="1:1">1:1 方形</option>
                </select>
              </div>
              <div class="iv-workflow-actions">
                <button class="runner-primary" id="iv-image-btn-${wf.id}" onclick="generateImage2Asset('${wf.id}')">
                  <i class="fas fa-image"></i> 生成图片
                </button>
                <button class="runner-secondary" onclick="runIvWorkflow('${wf.id}')">
                  <i class="fas fa-video"></i> 生成视频
                </button>
              </div>
              <div class="runner-presets">
                <button class="runner-preset" onclick="applyImageVideoPreset('${wf.id}','product')">商品广告</button>
                <button class="runner-preset" onclick="applyImageVideoPreset('${wf.id}','short')">短剧分镜</button>
                <button class="runner-preset" onclick="applyImageVideoPreset('${wf.id}','poster')">动态海报</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSqlRunner(wf) {
  const presets = [
    { id: 'gmv', label: 'GMV 排行' },
    { id: 'retention', label: '用户留存' },
    { id: 'sku', label: 'SKU 动销' }
  ];
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · SQL 查询生成器</h3>
      <p>这是 FlowHub 自营工作流的第一版:输入业务问题和表结构,直接生成可复制 SQL、解释和检查建议。免费用户也能试用。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Self-run Workflow</div>
            <h4>自然语言转 SQL 工作台</h4>
            <p>适合运营、产品和数据同学把业务问题快速转成查询草稿,后续可接真实数据库权限和执行沙箱。</p>
          </div>
          <span class="inline-runner-badge">自营 · 免费</span>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="runner-field">
              <label for="sql-question-${wf.id}">业务问题</label>
              <textarea class="runner-textarea" id="sql-question-${wf.id}" style="min-height:98px" placeholder="例如: 查询近 30 天每个店铺 GMV、订单数和客单价,按 GMV 降序取前 20">查询近 30 天每个店铺 GMV、订单数和客单价,按 GMV 降序取前 20</textarea>
            </div>
            <div class="runner-two">
              <div class="runner-field">
                <label for="sql-dialect-${wf.id}">数据库</label>
                <select class="runner-select" id="sql-dialect-${wf.id}">
                  <option value="postgres">PostgreSQL</option>
                  <option value="mysql">MySQL 8</option>
                  <option value="bigquery">BigQuery</option>
                </select>
              </div>
              <div class="runner-field">
                <label for="sql-output-${wf.id}">输出目标</label>
                <select class="runner-select" id="sql-output-${wf.id}">
                  <option value="analysis">分析报表</option>
                  <option value="dashboard">BI 看板</option>
                  <option value="api">后端接口</option>
                </select>
              </div>
            </div>
            <div class="runner-field">
              <label for="sql-schema-${wf.id}">表结构 / 字段说明</label>
              <textarea class="runner-textarea" id="sql-schema-${wf.id}" style="min-height:118px" placeholder="粘贴表结构或字段说明">orders(order_id, shop_id, user_id, paid_amount, paid_at, status)
shops(shop_id, shop_name, category)</textarea>
            </div>
            <div class="runner-field">
              <label>快速样例</label>
              <div class="runner-presets">
                ${presets.map(p => `<button class="runner-preset" onclick="applySqlPreset('${wf.id}','${p.id}')">${escapeHtml(p.label)}</button>`).join('')}
              </div>
            </div>
            <label class="runner-check">
              <input id="sql-safe-${wf.id}" type="checkbox" checked>
              <span>只生成只读查询,自动排除 DELETE / UPDATE / DROP 等高风险语句</span>
            </label>
            <div class="runner-actions">
              <button class="runner-primary" id="sql-run-${wf.id}" onclick="runSqlWorkflow('${wf.id}')">
                <i class="fas fa-play"></i> 生成 SQL
              </button>
              <button class="runner-secondary" onclick="applySqlPreset('${wf.id}','gmv')">
                重置样例
              </button>
            </div>
          </div>
          <div class="runner-output" id="sql-output-box-${wf.id}">
            <div class="runner-empty">
              <div>
                <i class="fas fa-database"></i>
                输入业务问题后生成 SQL 草稿<br>
                输出包含查询、解释、风险检查和优化建议
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPicsparkRunner(wf) {
  const presets = [
    { id: 'skincare', label: '护肤精华', product: '玻尿酸精华瓶', selling: '补水修护,敏感肌可用,清爽不黏腻', scene: 'kitchen', style: 'tmall' },
    { id: 'coffee', label: '咖啡礼盒', product: '精品挂耳咖啡礼盒', selling: '深烘坚果香,办公室下午茶,送礼有质感', scene: 'desk', style: 'xhs' },
    { id: 'pet', label: '宠物零食', product: '冻干鸡肉宠物零食', selling: '高蛋白,无谷配方,适合猫狗训练奖励', scene: 'outdoor', style: 'real' }
  ];
  return `
    <div class="detail-section" id="inline-runner-${wf.id}">
      <h3>站内执行 · PicSpark 商品图试用</h3>
      <p>输入商品信息后,FlowHub 会生成一套商品图方向、画面预览和可复制的 PicSpark 提示词。演示版不上传真实图片,不消耗额度。</p>
      <div class="inline-runner">
        <div class="inline-runner-head">
          <div>
            <div class="inline-runner-kicker">Inline Workflow</div>
            <h4>商品图换背景工作台</h4>
            <p>先在站内验证任务配置,满意后再带归因参数访问 PicSpark 完成高清生成。</p>
          </div>
          <span class="inline-runner-badge">免费演示</span>
        </div>
        <div class="inline-runner-grid">
          <div class="runner-form">
            <div class="runner-field">
              <label for="picspark-product-${wf.id}">商品名称</label>
              <input class="runner-input" id="picspark-product-${wf.id}" value="玻尿酸精华瓶" placeholder="例如: 玻尿酸精华瓶">
            </div>
            <div class="runner-two">
              <div class="runner-field">
                <label for="picspark-scene-${wf.id}">生成场景</label>
                <select class="runner-select" id="picspark-scene-${wf.id}">
                  <option value="kitchen">温暖厨房 · 新鲜水果</option>
                  <option value="festival">红金节日 · 促销海报</option>
                  <option value="desk">木质桌面 · 生活方式</option>
                  <option value="studio">极简棚拍 · 高级灰</option>
                  <option value="outdoor">户外自然光 · 清新绿植</option>
                </select>
              </div>
              <div class="runner-field">
                <label for="picspark-ratio-${wf.id}">画幅比例</label>
                <select class="runner-select" id="picspark-ratio-${wf.id}">
                  <option value="1:1">1:1 主图</option>
                  <option value="4:5">4:5 信息流</option>
                  <option value="3:4">3:4 小红书</option>
                  <option value="16:9">16:9 横幅</option>
                </select>
              </div>
            </div>
            <div class="runner-field">
              <label for="picspark-style-${wf.id}">文案风格</label>
              <select class="runner-select" id="picspark-style-${wf.id}">
                <option value="tmall">天猫主图 · 清晰卖点</option>
                <option value="xhs">小红书种草 · 生活感</option>
                <option value="real">真实摄影 · 少文字</option>
                <option value="crossborder">跨境独立站 · 英文质感</option>
              </select>
            </div>
            <div class="runner-field">
              <label for="picspark-selling-${wf.id}">核心卖点</label>
              <textarea class="runner-textarea" id="picspark-selling-${wf.id}" placeholder="写 2-3 个卖点,系统会转成画面指令">补水修护,敏感肌可用,清爽不黏腻</textarea>
            </div>
            <div class="runner-field">
              <label>快速样例</label>
              <div class="runner-presets">
                ${presets.map(p => `<button class="runner-preset" onclick="applyPicsparkPreset('${wf.id}','${p.id}')">${escapeHtml(p.label)}</button>`).join('')}
              </div>
            </div>
            <label class="runner-check">
              <input id="picspark-lock-${wf.id}" type="checkbox" checked>
              <span>保持商品主体不变,只替换背景和营销氛围</span>
            </label>
            <div class="runner-actions">
              <button class="runner-primary" id="picspark-run-${wf.id}" onclick="runPicsparkWorkflow('${wf.id}')">
                <i class="fas fa-wand-magic-sparkles"></i> 生成演示结果
              </button>
              <button class="runner-secondary" onclick="openExternalWorkflow('${wf.id}')">
                访问官网
              </button>
            </div>
          </div>
          <div class="runner-output" id="picspark-output-${wf.id}">
            <div class="runner-empty">
              <div>
                <i class="fas fa-image"></i>
                填好商品信息后生成预览方案<br>
                输出包含画面方向、提示词和投放建议
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* =============================================================
   渲染 · 详情页
   ============================================================= */
function renderDetail() {
  const data = getData();
  const wf = data.workflows.find(w => w.id === state.currentDetailId);
  if (!wf) {
    document.getElementById('view-detail').innerHTML = renderNav() + '<div class="container"><p>工作流不存在</p></div>';
    return;
  }

  document.title = wf.name + ' · FlowHub';

  const clicks = getClickCount(wf.id);
  const needsPro = wf.type === 'self' && wf.price_model === 'pro';
  const userIsPro = data.user && data.user.tier === 'pro';
  const locked = needsPro && !userIsPro;

  document.getElementById('view-detail').innerHTML = `
    ${renderNav()}
    <div class="container detail-page">
      <div class="breadcrumb">
        <a onclick="switchView('market')">发现</a> <span>›</span>
        <a onclick="setCategory('${wf.category}'); switchView('market')">${escapeHtml(wf.category)}</a> <span>›</span>
        ${escapeHtml(wf.name)}
      </div>

      <div class="detail-layout">
        <div>
          <div class="detail-header">
            ${renderWorkflowIcon(wf, 'detail-icon-big')}
            <div>
              <h1>${escapeHtml(wf.name)}</h1>
              <div class="detail-tagline">${escapeHtml(wf.tagline)}</div>
              <div class="detail-meta-row">
                <span class="wf-badge ${wf.type === 'self' ? 'self' : 'ad'}">${wf.type === 'self' ? '自营工作流' : '合作伙伴'}</span>
                <span class="meta-divider"></span>
                <span><i class="fas fa-star" style="color:#F4B400"></i> ${wf.rating} · ${wf.review_count} 评价</span>
                <span class="meta-divider"></span>
                <span><i class="fas fa-bolt"></i> ${clicks} 次调用</span>
                <span class="meta-divider"></span>
                <span>${escapeHtml(wf.category)}</span>
              </div>
            </div>
          </div>

          <div class="gallery" id="gallery-${wf.id}">
            <div class="gallery-main">
              ${renderGallerySlides(wf)}
              <button class="gallery-nav prev" onclick="galleryNav('${wf.id}', -1)"><i class="fas fa-chevron-left"></i></button>
              <button class="gallery-nav next" onclick="galleryNav('${wf.id}', 1)"><i class="fas fa-chevron-right"></i></button>
              <div class="gallery-dots" id="gallery-dots-${wf.id}">
                ${renderGalleryDots(wf)}
              </div>
            </div>
            <div class="gallery-thumbs" id="gallery-thumbs-${wf.id}">
              ${renderGalleryThumbs(wf)}
            </div>
          </div>

          <div class="detail-tabs">
            <div class="detail-tab ${state.detailTab === 'about' ? 'active' : ''}" onclick="setDetailTab('about')">介绍</div>
            <div class="detail-tab ${state.detailTab === 'examples' ? 'active' : ''}" onclick="setDetailTab('examples')">示例输出</div>
            <div class="detail-tab ${state.detailTab === 'reviews' ? 'active' : ''}" onclick="setDetailTab('reviews')">评价 (${wf.review_count || 0})</div>
          </div>

          ${state.detailTab === 'about' ? `
            <div class="detail-section">
              <h3>关于这个工作流</h3>
              <p>${escapeHtml(wf.description)}</p>
            </div>
            ${isInlineRunnerWorkflow(wf) ? `
              <div class="detail-section">
                <h3>沉浸式工作台</h3>
                <p>点击右侧「立即使用」会进入全屏运行模式,隐藏市场详情、价格侧栏和标签信息,只保留当前工作流本身。</p>
              </div>
            ` : ''}
            ${!isInlineRunnerWorkflow(wf) && wf.examples && wf.examples.length > 0 ? `
              <div class="detail-section">
                <h3>在线试用</h3>
                <p style="font-size:12px;color:var(--ink-3);margin-bottom:14px">点「试一下」看看效果(演示版,不消耗调用额度)</p>
                <div class="try-panel">
                  <div class="try-panel-head">
                    <span><i class="fas fa-flask" style="font-size:11px;margin-right:5px"></i>试用模式</span>
                    <span class="pill">免费体验</span>
                  </div>
                  <div class="try-body">
                    <div class="try-side">
                      <h5>输入</h5>
                      <div class="try-input" id="try-input-${wf.id}">${escapeHtml(wf.examples[0].text.split('\\n')[0] || wf.examples[0].text.slice(0, 60))}</div>
                    </div>
                    <div class="try-side">
                      <h5>输出</h5>
                      <div class="try-output" id="try-output-${wf.id}">点击「试一下」查看示例输出</div>
                    </div>
                  </div>
                  <div style="padding:12px 16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
                    <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">${escapeHtml(wf.examples[0].label)}</div>
                    <div class="try-actions">
                      <button class="try-btn" onclick="tryClearOutput('${wf.id}')">清空</button>
                      <button class="try-btn primary" onclick="tryRunDemo('${wf.id}')"><i class="fas fa-play" style="font-size:10px"></i> 试一下</button>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}
            ${wf.tags && wf.tags.length ? `
              <div class="detail-section">
                <h3>标签</h3>
                <div class="wf-tags">${wf.tags.map(t => `<span class="wf-tag" style="font-size:11px;padding:4px 10px">${escapeHtml(t)}</span>`).join('')}</div>
              </div>
            ` : ''}
          ` : ''}

          ${state.detailTab === 'examples' ? `
            <div class="detail-section">
              <h3>典型用法</h3>
              ${wf.examples.length === 0 ? '<p style="color:var(--ink-3)">暂无示例</p>' :
                wf.examples.map(ex => `
                  <div class="example-box">
                    <div class="example-label">${escapeHtml(ex.label)}</div>
                    <div class="example-text">${escapeHtml(ex.text)}</div>
                  </div>
                `).join('')}
            </div>
          ` : ''}

          ${state.detailTab === 'reviews' ? `
            <div class="detail-section">
              <h3>用户评价</h3>
              <div id="reviews-container-${wf.id}">
                <div style="display:flex;flex-direction:column;gap:14px">
                  ${[1,2,3].map(() => `
                    <div style="padding:16px;background:var(--bg-2);border-radius:10px">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                        <div class="skeleton" style="width:28px;height:28px;border-radius:50%"></div>
                        <div class="skeleton skeleton-line" style="width:60px;height:12px"></div>
                        <div class="skeleton skeleton-line" style="width:60px;height:12px"></div>
                      </div>
                      <div class="skeleton skeleton-line" style="width:90%;height:10px;margin-bottom:4px"></div>
                      <div class="skeleton skeleton-line" style="width:60%;height:10px"></div>
                    </div>
                  `).join('')}
                </div>
              </div>
              ${data.user ? `
                <button class="btn-secondary" style="margin-top:14px" onclick="openReviewForm('${wf.id}')">
                  <i class="fas fa-pen"></i> 写一条评价
                </button>
              ` : `
                <p style="margin-top:14px;font-size:13px;color:var(--ink-3)">
                  <a onclick="openLogin()" style="cursor:pointer;text-decoration:underline">登录</a> 后即可评价
                </p>
              `}
            </div>
          ` : ''}
        </div>

        <aside class="side-panel">
          ${wf.type === 'recommend' ? `
          ${isInlineRunnerWorkflow(wf) ? `
            <div class="price-row">
              <span class="price-num" style="font-size:18px">站内试用</span>
            </div>
            <div class="price-hint">
              先在 FlowHub 生成演示方案,再带归因参数访问 PicSpark 官网
            </div>
            <button class="side-cta" onclick="runWorkflow('${wf.id}')" style="background:linear-gradient(135deg,#1A5D3A,#0F4D2A)">
              <i class="fas fa-wand-magic-sparkles"></i> 免费站内试用
            </button>
            <button class="side-cta outline" onclick="openExternalWorkflow('${wf.id}')">
              <i class="fas fa-external-link-alt"></i> 访问官网
            </button>
            <button class="side-cta outline" onclick="toggleFavorite('${wf.id}')">
              <i class="far fa-bookmark"></i> 收藏
            </button>
          ` : `
            <div class="price-row">
              <span class="price-num" style="font-size:18px">第三方工具</span>
            </div>
            <div class="price-hint">
              由合作伙伴提供 · 点击将跳转至第三方网站
            </div>
            <button class="side-cta" onclick="runWorkflow('${wf.id}')" style="background:linear-gradient(135deg,#B85C00,#9A4D00)">
              <i class="fas fa-external-link-alt"></i> 访问官网
            </button>
            <button class="side-cta outline" onclick="toggleFavorite('${wf.id}')">
              <i class="far fa-bookmark"></i> 收藏
            </button>
          `}
          ` : `
          ${locked ? `
            <div class="lock-banner">
              <i class="fas fa-lock"></i>
              <span>需要 Pro 会员才能使用</span>
            </div>
          ` : ''}
          <div class="price-row">
            <span class="price-num">${wf.price_model === 'free' ? '免费' : '¥39'}</span>
            <span class="price-unit">${wf.price_model === 'free' ? '永久' : '/月 Pro'}</span>
          </div>
          <div class="price-hint">
            ${wf.price_model === 'pro' ? '已包含在 Pro 订阅内 · 每月 1,000 次调用额度' :
              '所有用户免费使用'}
          </div>
          ${locked ?
            `<button class="side-cta" onclick="openPricing()">
              <i class="fas fa-crown"></i> 升级 Pro 解锁
            </button>` :
            `<button class="side-cta" onclick="runWorkflow('${wf.id}')">
              <i class="fas fa-play"></i> 立即使用
            </button>`
          }
          <button class="side-cta outline" onclick="toggleFavorite('${wf.id}')">
            <i class="far fa-bookmark"></i> 收藏
          </button>
          `}
          <div class="side-divider"></div>
          <div class="side-stats">
            <div><div class="side-stat-num">${clicks}</div><div class="side-stat-lbl">总调用</div></div>
            <div><div class="side-stat-num">${getClickCountInDays(wf.id, 7)}</div><div class="side-stat-lbl">近 7 天</div></div>
            <div><div class="side-stat-num">${wf.rating}</div><div class="side-stat-lbl">评分</div></div>
            <div><div class="side-stat-num">${wf.review_count}</div><div class="side-stat-lbl">评价数</div></div>
          </div>
        </aside>
      </div>

      ${renderRelatedWorkflows(wf)}
    </div>
  `;

  if (state.detailTab === 'reviews') {
    loadReviewsForWorkflow(wf.id).then(function(reviews) {
      var c = document.getElementById('reviews-container-' + wf.id);
      if (!c) return;
      if (!reviews.length) { c.innerHTML = '<p style="color:var(--ink-3)">还没有评价</p>'; return; }
      c.innerHTML = '<div class="reviews">' + reviews.map(function(r) {
        return '<div class="review-item"><div class="review-head"><div class="review-avatar">' + escapeHtml(r.avatar) + '</div><div class="review-name">' + escapeHtml(r.user_name) + '</div><div class="review-stars">' + stars(r.rating) + '</div></div><div class="review-text">' + escapeHtml(r.text) + '</div><div class="review-date">' + escapeHtml(r.date) + '</div></div>';
      }).join('') + '</div>';
    });
  }
}

function renderRelatedWorkflows(currentWf) {
  const data = getData();
  // 相关:同分类的 / 同标签的,排除自己
  const related = data.workflows
    .filter(w => w.id !== currentWf.id && w.status === 'active')
    .map(w => {
      let score = 0;
      if (w.category === currentWf.category) score += 10;
      if (w.type === currentWf.type) score += 3;
      // 标签匹配
      if (w.tags && currentWf.tags) {
        const overlap = w.tags.filter(t => currentWf.tags.includes(t)).length;
        score += overlap * 5;
      }
      // 评分加成
      score += w.rating;
      return { ...w, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);

  if (related.length === 0) return '';

  return `
    <section class="related-section">
      <div class="section-head">
        <span class="sec-tag" style="background:var(--bg-soft);color:var(--ink-2)"><i class="fas fa-link" style="font-size:9px"></i> 相关</span>
        <h2>看了这个工作流的人,也在用</h2>
      </div>
      <div class="wf-grid wf-grid-full">
        ${related.map(renderWfCard).join('')}
      </div>
    </section>
  `;
}

function setDetailTab(tab) {
  state.detailTab = tab;
  renderDetail();
}

function toggleFavorite(wfId) {
  const data = getData();
  if (!data.user) {
    showToast('请先登录', true);
    openLogin();
    return;
  }
  showToast('已收藏(模拟功能)');
}

function openReviewForm(wfId) {
  openModal(`
    <h2>写一条评价</h2>
    <p class="modal-sub">真实分享你的使用体验</p>
    <div class="field">
      <label>评分</label>
      <select id="rv-rating">
        <option value="5">⭐⭐⭐⭐⭐ 非常好</option>
        <option value="4">⭐⭐⭐⭐ 不错</option>
        <option value="3">⭐⭐⭐ 一般</option>
        <option value="2">⭐⭐ 不好用</option>
        <option value="1">⭐ 完全不行</option>
      </select>
    </div>
    <div class="field">
      <label>评价内容</label>
      <textarea id="rv-text" placeholder="说说你的使用感受..."></textarea>
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">取消</button>
      <button class="primary" onclick="submitReview('${wfId}')">提交</button>
    </div>
  `);
}

function submitReview(wfId) {
  const data = getData();
  const rating = parseInt(document.getElementById('rv-rating').value);
  const text = document.getElementById('rv-text').value.trim();
  if (!text) return showToast('请填写评价内容', true);

  const reviewObj = {
    id: 'rv_' + Date.now(),
    workflow_id: wfId,
    user_name: data.user.name,
    avatar: data.user.name.charAt(0),
    rating: rating,
    text: text,
    date: '刚刚'
  };
  data.reviews.unshift(reviewObj);
  const wf = data.workflows.find(w => w.id === wfId);
  if (wf) {
    const newCount = wf.review_count + 1;
    wf.rating = ((wf.rating * wf.review_count + rating) / newCount).toFixed(1) * 1;
    wf.review_count = newCount;
  }
  saveData(data);
  if (_apiLoaded) {
    delete _reviewsCache[wfId];
    apiPost('/workflows/' + wfId + '/reviews', {
      user_name: reviewObj.user_name,
      avatar: reviewObj.avatar,
      rating: rating,
      text: text
    });
  }
  closeModal();
  showToast('评价已发布');
  renderDetail();
}

/* =============================================================
   登录 / 注册
   ============================================================= */
function openLogin() {
  openModal(`
    <div class="auth-shell">
      <aside class="auth-rail">
        <div>
          <div class="auth-modal-logo">
            ${renderBrandMark('auth-logo-mark brand-mark')}
            <span>FlowHub</span>
          </div>
          <div class="auth-rail-copy">
            <div class="auth-rail-kicker">Guest friendly</div>
            <h3>可以先浏览,账号只在需要时出现。</h3>
            <p>登录用于保存你的收藏、评价和订阅状态。市场浏览、搜索和详情页保持开放。</p>
          </div>
          <div class="auth-rail-card">
            <div class="auth-rail-card-head">
              <span class="auth-rail-card-title">最近在用</span>
              <span class="auth-rail-card-badge">LIVE</span>
            </div>
            <div class="auth-workflow-row">
              <div class="auth-workflow-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
              <div>
                <div class="auth-workflow-name">商品图 AI</div>
                <div class="auth-workflow-meta">刚刚完成 1 次生成</div>
              </div>
              <div class="auth-workflow-score">4.9</div>
            </div>
            <div class="auth-workflow-row">
              <div class="auth-workflow-icon" style="background:var(--pro)"><i class="fas fa-pen"></i></div>
              <div>
                <div class="auth-workflow-name">小红书笔记</div>
                <div class="auth-workflow-meta">已保存到个人中心</div>
              </div>
              <div class="auth-workflow-score">Pro</div>
            </div>
            <div class="auth-workflow-row">
              <div class="auth-workflow-icon" style="background:var(--ad)"><i class="fas fa-arrow-up-right-from-square"></i></div>
              <div>
                <div class="auth-workflow-name">合作工具</div>
                <div class="auth-workflow-meta">外跳前保留归因</div>
              </div>
              <div class="auth-workflow-score">CPC</div>
            </div>
          </div>
        </div>
        <div class="auth-benefits">
          <div class="auth-benefit"><i class="fas fa-bookmark"></i><span>同步收藏</span></div>
          <div class="auth-benefit"><i class="fas fa-receipt"></i><span>保留账单</span></div>
          <div class="auth-benefit"><i class="fas fa-star"></i><span>发布评价</span></div>
        </div>
      </aside>
      <div class="auth-modal-body">
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
        <div class="auth-copy">
          <h2>登录 FlowHub</h2>
          <p>继续用游客模式也可以。登录只用于保存个人数据和解锁订阅权益。</p>
        </div>
        <div class="auth-soft-note">
          <i class="fas fa-circle-check"></i>
          <span>默认使用邮箱和密码登录。忘记密码时,再通过邮箱验证码登录。</span>
        </div>
        <div class="auth-tabs">
          <div class="auth-tab active" onclick="switchAuthTab(this, 'login')">登录</div>
          <div class="auth-tab" onclick="switchAuthTab(this, 'register')">注册</div>
        </div>
        <div id="auth-content">
          ${renderAuthForm('login')}
        </div>
        <div class="auth-divider"><span>其他方式</span></div>
        <div class="auth-third-party">
          <button class="third-party-btn" onclick="showToast('演示版本 · 真实接入需配置 OAuth')">
            <i class="fab fa-github" style="color:var(--ink)"></i>
            <span>GitHub</span>
          </button>
          <button class="third-party-btn" onclick="showToast('演示版本 · 真实接入需配置 OAuth')">
            <i class="fab fa-weixin" style="color:#07C160"></i>
            <span>微信</span>
          </button>
          <button class="third-party-btn" onclick="showToast('演示版本 · 真实接入需配置 OAuth')">
            <i class="fab fa-apple" style="color:var(--ink)"></i>
            <span>Apple</span>
          </button>
        </div>
        <button class="auth-guest-btn" onclick="closeModal(); showToast('已继续使用游客模式')">
          先不登录,继续浏览
        </button>
        <p style="font-size:11px;color:var(--ink-4);text-align:center;margin-top:16px;line-height:1.6">
          登录即代表你同意 <a style="color:var(--ink-2);cursor:pointer;text-decoration:underline">服务条款</a> 和 <a style="color:var(--ink-2);cursor:pointer;text-decoration:underline">隐私政策</a>
        </p>
      </div>
    </div>
  `);
  document.getElementById('modal-content').classList.add('auth-modal');
}

function switchAuthTab(el, type) {
  el.parentElement.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('auth-content').innerHTML = renderAuthForm(type);
}

function renderAuthForm(type) {
  if (type === 'forgot') {
    return `
      <div class="auth-form-hint">
        <i class="fas fa-envelope-circle-check"></i>
        <span>忘记密码时使用邮箱验证码登录。验证码 5 分钟内有效。</span>
      </div>
      <div class="field">
        <label>邮箱</label>
        <input id="auth-email" type="email" autocomplete="email" placeholder="name@example.com">
      </div>
      <div class="field">
        <label>验证码</label>
        <div style="display:flex;gap:8px">
          <input id="auth-code" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" maxlength="6" style="flex:1">
          <button class="auth-code-btn" id="auth-sms-btn" onclick="sendEmailCode()">获取验证码</button>
        </div>
      </div>
      <div class="auth-link-row" style="justify-content:flex-start">
        <button class="auth-text-link" onclick="switchAuthTab(document.querySelector('.auth-tab.active'), 'login')">返回密码登录</button>
      </div>
      <button class="auth-submit-btn" onclick="doAuth('forgot')">
        邮箱验证登录
        <i class="fas fa-arrow-right" style="font-size:11px;margin-left:6px"></i>
      </button>
    `;
  }
  return `
    <div class="auth-form-hint">
      <i class="fas fa-shield-halved"></i>
      <span>${type === 'login' ? '输入注册邮箱和密码继续。' : '注册后可获得 50 次免费调用额度。'}</span>
    </div>
    <div class="field">
      <label>邮箱</label>
      <input id="auth-email" type="email" autocomplete="email" placeholder="name@example.com">
    </div>
    ${type === 'register' ? `
      <div class="field">
        <label>昵称</label>
        <input id="auth-name" autocomplete="nickname" placeholder="设置你的昵称">
      </div>
    ` : ''}
    <div class="field">
      <label>密码</label>
      <input id="auth-password" type="password" autocomplete="${type === 'login' ? 'current-password' : 'new-password'}" placeholder="${type === 'login' ? '输入密码' : '至少 6 位密码'}">
    </div>
    ${type === 'register' ? `
      <div class="field">
        <label>确认密码</label>
        <input id="auth-password-confirm" type="password" autocomplete="new-password" placeholder="再次输入密码">
      </div>
    ` : `
      <div class="auth-link-row">
        <button class="auth-text-link" onclick="document.getElementById('auth-content').innerHTML = renderAuthForm('forgot')">忘记密码? 用邮箱验证码登录</button>
      </div>
    `}
    <button class="auth-submit-btn" onclick="doAuth('${type}')">
      ${type === 'login' ? '登录' : '注册并登录'}
      <i class="fas fa-arrow-right" style="font-size:11px;margin-left:6px"></i>
    </button>
  `;
}

let _codeTimer = null;
async function sendEmailCode() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showToast('请输入正确的邮箱地址', true);
  }
  const btn = document.getElementById('auth-sms-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '发送中…';
  btn.style.opacity = '0.6';

  try {
    const resp = await fetch(API_BASE + '/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await resp.json();
    if (!resp.ok) {
      btn.disabled = false;
      btn.textContent = '获取验证码';
      btn.style.opacity = '1';
      return showToast(result.error?.message || '发送失败', true);
    }
    showToast('验证码已发送到邮箱');
    let sec = 60;
    btn.textContent = `${sec}s`;
    _codeTimer = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(_codeTimer);
        btn.disabled = false;
        btn.textContent = '获取验证码';
        btn.style.opacity = '1';
      } else {
        btn.textContent = `${sec}s`;
      }
    }, 1000);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '获取验证码';
    btn.style.opacity = '1';
    if (!_apiLoaded) {
      sessionStorage.setItem('flowhub_demo_email_code:' + email, DEMO_EMAIL_CODE);
      showToast('后端邮件服务未连接,本地演示验证码为 ' + DEMO_EMAIL_CODE);
      return;
    }
    showToast('验证码发送失败,请检查后端 API 和 SMTP 配置', true);
  }
}

async function doAuth(type) {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('请输入正确的邮箱地址', true);

  const name = type === 'register'
    ? (document.getElementById('auth-name').value.trim() || '新用户')
    : undefined;
  const password = document.getElementById('auth-password')?.value || '';
  const confirmPassword = document.getElementById('auth-password-confirm')?.value || '';
  const code = document.getElementById('auth-code')?.value.trim() || '';

  if (type === 'login' && !password) return showToast('请输入密码', true);
  if (type === 'register') {
    if (password.length < 6) return showToast('密码至少 6 位', true);
    if (password !== confirmPassword) return showToast('两次输入的密码不一致', true);
  }
  if (type === 'forgot' && (!code || code.length !== 6)) return showToast('请输入 6 位验证码', true);

  const btn = document.querySelector('.auth-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中…'; }

  if (_apiLoaded) {
    try {
      const endpoint = type === 'register' ? '/auth/register' : '/auth/login';
      const body = type === 'register'
        ? { email, password, name }
        : (type === 'forgot' ? { email, code, mode: 'email_code' } : { email, password });
      const resp = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await resp.json();

      if (!resp.ok) {
        if (btn) { btn.disabled = false; btn.innerHTML = type === 'register' ? '注册并登录' : (type === 'forgot' ? '邮箱验证登录' : '登录'); }
        if (result.error?.code === 'USER_NOT_FOUND') return showToast('该邮箱未注册，请先注册', true);
        if (result.error?.code === 'USER_EXISTS') return showToast('该邮箱已注册，请直接登录', true);
        return showToast(result.error?.message || '操作失败', true);
      }

      if (window.FlowHubAuth?.setToken) window.FlowHubAuth.setToken(result.data.token);
      else localStorage.setItem('flowhub_token', result.data.token);
      const data = getData();
      data.user = result.data.user;
      saveData(data);
      closeModal();
      render();
      updateUserStatus();
      if (result.data.user.role === 'admin') loadAdminDataAsync().then(render);
      setTimeout(() => showWelcomePop(result.data.user.name, type === 'register'), 400);
      return;
    } catch (e) {
      console.warn('API auth failed, falling back to local:', e.message);
    }
  }

  if (type === 'forgot') {
    if (btn) { btn.disabled = false; btn.innerHTML = '邮箱验证登录'; }
    return showToast('邮箱验证码登录需要后端服务可用', true);
  }

  const accounts = _localAccounts;
  if (type === 'register') {
    if (accounts[email]) {
      if (btn) { btn.disabled = false; btn.innerHTML = '注册并登录'; }
      return showToast('该邮箱已注册，请直接登录', true);
    }
    accounts[email] = {
      email,
      name,
      password: btoa(unescape(encodeURIComponent(password))),
      created_at: new Date().toISOString()
    };
  }
  if (type === 'forgot' && !_apiLoaded) {
    const demoCode = sessionStorage.getItem('flowhub_demo_email_code:' + email);
    if (code !== demoCode) {
      if (btn) { btn.disabled = false; btn.innerHTML = '邮箱验证登录'; }
      return showToast('本地演示验证码不正确', true);
    }
  }
  if (type === 'login') {
    const account = accounts[email];
    if (!account) {
      if (btn) { btn.disabled = false; btn.innerHTML = '登录'; }
      return showToast('本地演示未找到账号，请先注册', true);
    }
    if (account.password !== btoa(unescape(encodeURIComponent(password)))) {
      if (btn) { btn.disabled = false; btn.innerHTML = '登录'; }
      return showToast('密码不正确', true);
    }
  }
  if (type === 'forgot' && !accounts[email]) {
    accounts[email] = {
      email,
      name: '用户' + email.split('@')[0].slice(-4),
      created_at: new Date().toISOString()
    };
  }

  const data = getData();
  const localAccount = accounts[email];
  data.user = {
    id: 'u_' + email.replace(/[@.]/g, '_'),
    email: email,
    name: name || localAccount?.name || ('用户' + email.split('@')[0].slice(-4)),
    tier: 'free',
    role: 'user',
    created_at: new Date().toISOString()
  };
  saveData(data);
  closeModal();
  render();
  updateUserStatus();
  setTimeout(() => showWelcomePop(data.user.name, type === 'register'), 400);
}

async function restoreSession() {
  const token = window.FlowHubAuth?.getToken ? window.FlowHubAuth.getToken() : localStorage.getItem('flowhub_token');
  if (!token || !_apiLoaded) return;
  try {
    const resp = await fetch(API_BASE + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!resp.ok) {
      if (window.FlowHubAuth?.clearToken) window.FlowHubAuth.clearToken();
      else localStorage.removeItem('flowhub_token');
      return;
    }
    const result = await resp.json();
    if (result.ok && result.data.user) {
      const data = getData();
      data.user = result.data.user;
      saveData(data);
      render();
      updateUserStatus();
      if (result.data.user.role === 'admin') loadAdminDataAsync().then(render);
    }
  } catch (e) {
    console.warn('Session restore failed:', e.message);
  }
}

function showWelcomePop(name, isNewUser) {
  // 清除之前的
  document.querySelector('.welcome-pop')?.remove();

  const pop = document.createElement('div');
  pop.className = 'welcome-pop';
  pop.innerHTML = `
    <div class="welcome-pop-head">
      <button class="close" onclick="this.closest('.welcome-pop').remove()"><i class="fas fa-times"></i></button>
      <h4>${isNewUser ? '🎉' : '👋'} ${isNewUser ? '欢迎加入,' : '欢迎回来,'}${escapeHtml(name)}</h4>
      <p>${isNewUser ? '你已获得 50 次免费调用额度' : '上次离开时已为你保留 153 次额度'}</p>
    </div>
    <div class="welcome-pop-body">
      <div class="welcome-pop-item" onclick="document.querySelector('.welcome-pop').remove(); switchView('market');">
        <i class="fas fa-compass"></i> 浏览本周精选工作流
      </div>
      <div class="welcome-pop-item" onclick="document.querySelector('.welcome-pop').remove(); openPricing();">
        <i class="fas fa-crown" style="color:#5B3FA8"></i> 升级 Pro,解锁全场
      </div>
      <div class="welcome-pop-item" onclick="document.querySelector('.welcome-pop').remove(); switchView('me');">
        <i class="fas fa-gift" style="color:#B85C00"></i> 邀请好友赢 1 个月 Pro
      </div>
    </div>
    <div class="welcome-pop-foot">FLOWHUB · 让 AI 工具触手可及</div>
  `;
  document.body.appendChild(pop);
  setTimeout(() => pop.classList.add('show'), 50);
  // 8 秒后自动关闭
  setTimeout(() => {
    if (pop.parentElement) {
      pop.classList.remove('show');
      setTimeout(() => pop.remove(), 400);
    }
  }, 8000);
}

function logout() {
  const data = getData();
  data.user = null;
  saveData(data);
  showToast('已退出登录');
  switchView('market');
  updateUserStatus();
}

/* =============================================================
   订阅方案
   ============================================================= */
function openPricing() {
  const data = getData();
  const isPro = data.user && data.user.tier === 'pro';

  openModal(`
    <div style="position:relative">
      <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
    </div>
    <h2 style="text-align:center">选一个适合你的方案</h2>
    <p class="modal-sub" style="text-align:center">免费开始,随时升级</p>
    <div class="pricing-grid">
      <div class="pricing-card ${!isPro && data.user ? 'current' : ''}">
        <h4>免费</h4>
        <div class="tag-line">体验工作流,看看哪些适合你</div>
        <div class="price-big"><span class="num">¥0</span><span class="unit">/ 永久</span></div>
        <div class="price-sub">无需绑卡</div>
        <button class="pricing-cta" disabled>${!isPro && data.user ? '当前方案' : '默认方案'}</button>
        <ul class="feat-list">
          <li><i class="fas fa-check"></i> 每月 50 次免费工作流调用</li>
          <li><i class="fas fa-check"></i> 浏览全部推荐工作流</li>
          <li><i class="fas fa-check"></i> 历史记录保留 7 天</li>
        </ul>
      </div>

      <div class="pricing-card featured ${isPro ? 'current' : ''}">
        <span class="pop">Most Popular</span>
        <h4>Pro</h4>
        <div class="tag-line">解锁全场自营工作流</div>
        <div class="price-big"><span class="num">¥39</span><span class="unit">/ 月</span></div>
        <div class="price-sub">年付 ¥372 · 折合 ¥31/月</div>
        <button class="pricing-cta" onclick="${isPro ? 'closeModal()' : 'doUpgrade()'}">${isPro ? '当前方案' : '升级 Pro →'}</button>
        <ul class="feat-list">
          <li><i class="fas fa-check"></i> 每月 1,000 次自营工作流调用</li>
          <li><i class="fas fa-check"></i> 全场 Pro 工作流不限切换</li>
          <li><i class="fas fa-check"></i> 历史记录永久保留</li>
          <li><i class="fas fa-check"></i> 优先支持</li>
        </ul>
      </div>

      <div class="pricing-card">
        <h4>Team</h4>
        <div class="tag-line">为小团队设计,共享工作流</div>
        <div class="price-big"><span class="num">¥99</span><span class="unit">/ 人 / 月</span></div>
        <div class="price-sub">最少 3 人起 · 联系销售</div>
        <button class="pricing-cta" onclick="showToast('请联系 sales@flowhub.cn')">联系销售</button>
        <ul class="feat-list">
          <li><i class="fas fa-check"></i> 每人每月 5,000 次调用</li>
          <li><i class="fas fa-check"></i> 团队管理后台</li>
          <li><i class="fas fa-check"></i> SSO 单点登录</li>
          <li><i class="fas fa-check"></i> 专属客户经理</li>
        </ul>
      </div>
    </div>
  `);
  document.getElementById('modal-content').classList.add('wide');
}

function doUpgrade() {
  const data = getData();
  if (!data.user) {
    closeModal();
    showToast('请先登录', true);
    setTimeout(openLogin, 500);
    return;
  }
  // 模拟支付
  closeModal();
  openModal(`
    <h2>支付订阅费</h2>
    <p class="modal-sub">Pro 月费 ¥39 · 演示版本不会真实扣款</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      <div style="padding:14px;border:1px solid var(--line-strong);border-radius:8px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="completeUpgrade()">
        <i class="fab fa-weixin" style="color:#07C160;font-size:20px"></i>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">微信支付</div>
          <div style="font-size:11px;color:var(--ink-3)">扫码支付 · 演示版本直接成功</div>
        </div>
        <i class="fas fa-chevron-right" style="font-size:11px;color:var(--ink-3)"></i>
      </div>
      <div style="padding:14px;border:1px solid var(--line-strong);border-radius:8px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="completeUpgrade()">
        <i class="fab fa-alipay" style="color:#1677FF;font-size:20px"></i>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">支付宝</div>
          <div style="font-size:11px;color:var(--ink-3)">扫码支付 · 演示版本直接成功</div>
        </div>
        <i class="fas fa-chevron-right" style="font-size:11px;color:var(--ink-3)"></i>
      </div>
    </div>
    <p style="font-size:11px;color:var(--ink-3);text-align:center;font-family:'JetBrains Mono', monospace">
      真实接入需要商户号 + 营业执照
    </p>
  `);
}

function completeUpgrade() {
  const data = getData();
  data.user.tier = 'pro';
  data.user.upgraded_at = new Date().toISOString();
  saveData(data);
  closeModal();
  showToast('🎉 升级成功!欢迎来到 Pro');
  render();
  updateUserStatus();
}

/* =============================================================
   渲染 · 个人中心
   ============================================================= */
function renderMe() {
  const data = getData();
  if (!data.user) {
    document.getElementById('view-me').innerHTML = `
      ${renderNav()}
      <div class="container" style="text-align:center;padding-top:80px">
        <h1 style="font-family:'Noto Serif SC',serif;font-size:28px;font-weight:700;margin-bottom:14px">还没有登录</h1>
        <p style="color:var(--ink-3);margin-bottom:24px">登录后查看你的使用记录、订阅状态</p>
        <button class="btn-primary" onclick="openLogin()" style="padding:12px 28px">立即登录</button>
      </div>
    `;
    return;
  }

  const myClicks = data.clicks.filter(c => c.user_id === data.user.id);
  const recentClicks = myClicks.slice(-10).reverse();
  const wfIdToWf = {};
  data.workflows.forEach(w => wfIdToWf[w.id] = w);
  const isPro = data.user.tier === 'pro';

  document.getElementById('view-me').innerHTML = `
    ${renderNav()}
    <div class="container">
      <div class="me-head-v2">
        <div class="me-head-left">
          <div class="me-avatar">${data.user.name.charAt(0)}</div>
          <div class="me-info">
            <div class="me-name-row">
              <span class="me-name">${escapeHtml(data.user.name)}</span>
              <span class="tier-pill ${isPro ? 'pro' : 'free'}">
                ${isPro ? '<i class="fas fa-crown" style="font-size:9px"></i> Pro 会员' : '免费用户'}
              </span>
            </div>
            <div class="me-meta">
              <span>${escapeHtml(data.user.email || '')}</span>
              <span class="me-meta-dot"></span>
              <span>加入 ${timeAgo(data.user.created_at)}</span>
              ${isPro ? '<span class="me-meta-dot"></span><span>续费于 2026-06-11</span>' : ''}
            </div>
          </div>
        </div>
        <div class="me-head-actions">
          ${!isPro ? `<button class="btn-pro" onclick="openPricing()"><i class="fas fa-crown" style="font-size:10px"></i>升级 Pro</button>` : ''}
          <button class="btn-secondary" onclick="logout()"><i class="fas fa-arrow-right-from-bracket" style="font-size:11px"></i> 退出</button>
        </div>
      </div>

      <div class="me-stats">
        <div class="stat-card">
          <div class="lbl">本月调用</div>
          <div class="val">${myClicks.length}</div>
          <div class="me-progress">
            <div class="me-progress-fill" style="width:${Math.min(100, (myClicks.length / (isPro ? 1000 : 50)) * 100)}%"></div>
          </div>
          <div class="delta">还剩 ${Math.max(0, (isPro ? 1000 : 50) - myClicks.length)} 次 · 总额度 ${isPro ? '1000' : '50'}</div>
        </div>
        <div class="stat-card">
          <div class="lbl">使用工作流</div>
          <div class="val">${new Set(myClicks.map(c => c.workflow_id)).size}</div>
          <div class="me-progress">
            <div class="me-progress-fill" style="width:${Math.min(100, (new Set(myClicks.map(c => c.workflow_id)).size / data.workflows.filter(w => w.status === 'active').length) * 100)}%"></div>
          </div>
          <div class="delta">共 ${data.workflows.filter(w => w.status === 'active').length} 个可用</div>
        </div>
        <div class="stat-card">
          <div class="lbl">订阅状态</div>
          <div class="val" style="font-size:18px">${isPro ? 'Pro 月付' : '免费'}</div>
          ${isPro ? '<div class="delta" style="margin-top:14px">下次续费 2026-06-11</div>' : '<div class="delta" style="color:var(--ink-3);margin-top:14px">升级解锁更多权益</div>'}
        </div>
        <div class="stat-card">
          <div class="lbl">节省时间</div>
          <div class="val">${(myClicks.length * 12).toFixed(0)}<span style="font-size:14px;color:var(--ink-3)">分钟</span></div>
          <div class="delta" style="margin-top:14px">按平均节省 12 分钟/次估算</div>
        </div>
      </div>

      ${isPro ? `
        <div class="panel">
          <div class="panel-head">
            <h3><i class="fas fa-crown" style="color:#5B3FA8;font-size:14px;margin-right:6px"></i>Pro 会员权益</h3>
            <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">已激活</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0;padding:0">
            <div style="padding:18px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)">
              <i class="fas fa-infinity" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">全场不限切换</div>
              <div style="font-size:11px;color:var(--ink-3)">120+ 自营工作流</div>
            </div>
            <div style="padding:18px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)">
              <i class="fas fa-bolt" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">1,000 次 / 月</div>
              <div style="font-size:11px;color:var(--ink-3)">月度调用额度</div>
            </div>
            <div style="padding:18px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)">
              <i class="fas fa-rocket" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">优先队列</div>
              <div style="font-size:11px;color:var(--ink-3)">峰值时段不排队</div>
            </div>
            <div style="padding:18px;border-bottom:1px solid var(--line)">
              <i class="fas fa-headset" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">优先客服</div>
              <div style="font-size:11px;color:var(--ink-3)">2 小时内响应</div>
            </div>
            <div style="padding:18px;border-right:1px solid var(--line)">
              <i class="fas fa-archive" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">永久历史</div>
              <div style="font-size:11px;color:var(--ink-3)">所有调用记录</div>
            </div>
            <div style="padding:18px;border-right:1px solid var(--line)">
              <i class="fas fa-flask" style="color:var(--pro);font-size:16px;margin-bottom:8px"></i>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">抢先体验</div>
              <div style="font-size:11px;color:var(--ink-3)">新工作流提前用</div>
            </div>
          </div>
        </div>
      ` : `
        <div class="panel" style="background:linear-gradient(135deg, #2A2A28, #0F0F0E);color:white;border:none">
          <div style="padding:24px">
            <div style="display:flex;align-items:start;justify-content:space-between">
              <div style="flex:1">
                <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:rgba(255,214,165,0.15);color:#FFD6A5;border-radius:999px;font-size:11px;font-family:'JetBrains Mono', monospace;font-weight:600;margin-bottom:14px">
                  <i class="fas fa-crown" style="font-size:10px"></i>仅 ¥39/月
                </div>
                <h3 style="font-family:'Noto Serif SC', serif;font-size:22px;font-weight:700;margin-bottom:8px">升级 Pro,解锁 120+ 工作流</h3>
                <p style="font-size:13px;opacity:0.7;line-height:1.6;max-width:480px">从写文案到生图,从数据分析到代码 Review · 全场工作流一次解锁,1000 次调用额度 · 比单独订阅省 80%</p>
              </div>
              <button class="btn-pro" onclick="openPricing()" style="background:#FFD6A5;color:#0F0F0E;padding:10px 22px">立即升级 →</button>
            </div>
          </div>
        </div>
      `}

      <div class="me-section-tabs" style="display:flex;gap:4px;border-bottom:1px solid var(--line);margin:24px 0 16px">
        <div class="me-tab active" onclick="switchMeTab(this, 'recent')" style="padding:10px 16px;font-size:13px;cursor:pointer;border-bottom:2px solid var(--ink);font-weight:600">最近使用</div>
        <div class="me-tab" onclick="switchMeTab(this, 'recommend')" style="padding:10px 16px;font-size:13px;cursor:pointer;color:var(--ink-3)">为你推荐</div>
        <div class="me-tab" onclick="switchMeTab(this, 'invite')" style="padding:10px 16px;font-size:13px;cursor:pointer;color:var(--ink-3)">邀请好友 <span style="background:#FFD6A5;color:#0F0F0E;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:3px;font-family:'JetBrains Mono', monospace">送 Pro</span></div>
        <div class="me-tab" onclick="switchMeTab(this, 'billing')" style="padding:10px 16px;font-size:13px;cursor:pointer;color:var(--ink-3)">订阅与账单</div>
      </div>

      <div id="me-tab-content">
        ${renderMeRecent(recentClicks, wfIdToWf)}
      </div>
    </div>
  `;
}

function renderMeRecent(recentClicks, wfIdToWf) {
  if (recentClicks.length === 0) {
    return `
      <div class="panel">
        <div style="padding:48px;text-align:center;color:var(--ink-3);font-size:13px">
          还没用过工作流, <a onclick="switchView('market')" style="cursor:pointer;text-decoration:underline">去发现</a>
        </div>
      </div>
    `;
  }
  return `
    <div class="panel">
      <table class="panel-table">
        <thead>
          <tr><th>工作流</th><th>类型</th><th>时间</th><th class="right">操作</th></tr>
        </thead>
        <tbody>
          ${recentClicks.map(c => {
            const wf = wfIdToWf[c.workflow_id];
            if (!wf) return '';
            return `
              <tr>
                <td>
                  <div class="nm">${escapeHtml(wf.name)}</div>
                  <div class="sub">${escapeHtml(wf.tagline || '').slice(0, 40)}</div>
                </td>
                <td><span class="badge-${wf.type === 'self' ? 'self' : 'ad'}">${wf.type === 'self' ? '自营' : '推荐'}</span></td>
                <td><span class="num">${timeAgo(c.clicked_at)}</span></td>
                <td class="right">
                  <button class="row-btn" onclick="goToDetail('${wf.id}')">查看</button>
                  <button class="row-btn" onclick="runWorkflow('${wf.id}')" style="color:var(--self)">再次使用</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMeRecommend() {
  const data = getData();
  // 推荐:用户没用过的自营工作流,按评分排序
  const myUsedIds = new Set(data.clicks.filter(c => c.user_id === data.user?.id).map(c => c.workflow_id));
  const recommended = data.workflows
    .filter(w => w.status === 'active' && w.type === 'self' && !myUsedIds.has(w.id))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  if (recommended.length === 0) {
    return `
      <div class="panel">
        <div style="padding:48px;text-align:center;color:var(--ink-3);font-size:13px">
          你已经用过所有自营工作流啦!
        </div>
      </div>
    `;
  }

  return `
    <div class="wf-grid">
      ${recommended.map(renderWfCard).join('')}
    </div>
  `;
}

function renderMeBilling() {
  const data = getData();
  const isPro = data.user.tier === 'pro';
  const orders = isPro ? [
    { id: 'ord_001', amount: 39, type: 'Pro 月费', date: '2026-05-11', status: 'paid' },
    { id: 'ord_002', amount: 39, type: 'Pro 月费', date: '2026-04-11', status: 'paid' },
    { id: 'ord_003', amount: 39, type: 'Pro 月费', date: '2026-03-11', status: 'paid' }
  ] : [];

  return `
    <div class="panel">
      <div class="panel-head">
        <h3>订阅与账单</h3>
        ${isPro ? '<button class="row-btn danger" onclick="cancelSub()">取消订阅</button>' : ''}
      </div>
      <div style="padding:20px">
        ${isPro ? `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--pro-bg);border-radius:10px;margin-bottom:18px">
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--pro)">Pro 月付订阅</div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:4px">每月 ¥39 · 下次扣款 2026-06-11</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:'JetBrains Mono', monospace;font-size:11px;color:var(--ink-3)">已订阅 3 个月</div>
              <div style="font-family:'Noto Serif SC', serif;font-size:18px;font-weight:700">¥117</div>
            </div>
          </div>
        ` : `
          <div style="padding:24px;text-align:center;color:var(--ink-3);font-size:13px">
            你还没有订阅 · <a onclick="openPricing()" style="cursor:pointer;text-decoration:underline;color:var(--ink)">查看方案</a>
          </div>
        `}
        ${orders.length > 0 ? `
          <div style="font-size:12px;color:var(--ink-3);font-family:'JetBrains Mono', monospace;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">订单记录</div>
          <table class="panel-table" style="margin:-20px;width:calc(100% + 40px)">
            <thead><tr><th>订单号</th><th>类型</th><th>日期</th><th class="right">金额</th><th class="right">状态</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td><span class="num">#${o.id}</span></td>
                  <td>${o.type}</td>
                  <td><span class="num">${o.date}</span></td>
                  <td class="right"><span class="num">¥${o.amount}</span></td>
                  <td class="right"><span class="badge-active">已支付</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    </div>
  `;
}

function switchMeTab(el, tab) {
  el.parentElement.querySelectorAll('.me-tab').forEach(t => {
    t.style.color = 'var(--ink-3)';
    t.style.borderBottom = '2px solid transparent';
    t.style.fontWeight = 'normal';
  });
  el.style.color = 'var(--ink)';
  el.style.borderBottom = '2px solid var(--ink)';
  el.style.fontWeight = '600';

  const data = getData();
  const myClicks = data.clicks.filter(c => c.user_id === data.user.id);
  const recentClicks = myClicks.slice(-10).reverse();
  const wfIdToWf = {};
  data.workflows.forEach(w => wfIdToWf[w.id] = w);

  const content = document.getElementById('me-tab-content');
  if (tab === 'recent') content.innerHTML = renderMeRecent(recentClicks, wfIdToWf);
  if (tab === 'recommend') content.innerHTML = renderMeRecommend();
  if (tab === 'invite') content.innerHTML = renderMeInvite();
  if (tab === 'billing') content.innerHTML = renderMeBilling();
}

function renderMeInvite() {
  const data = getData();
  // 基于手机号生成稳定邀请码
  const code = 'FH' + (data.user.id.slice(-6) || '888888').toUpperCase();
  const inviteUrl = `https://flowhub.cn/r/${code}`;

  return `
    <div class="invite-card">
      <div class="invite-eyebrow">REFERRAL · 邀请返利</div>
      <h3>邀请 1 位好友<br>免费再送 1 个月 Pro</h3>
      <p>好友通过你的链接注册成功 → 你们各得 1 个月 Pro · 上不封顶 · 老带新最高记录 18 个月</p>
      <div class="invite-code-box">
        <div>
          <div style="font-size:10px;opacity:0.6;margin-bottom:4px;font-family:'JetBrains Mono', monospace;letter-spacing:0.05em">你的专属邀请码</div>
          <div class="invite-code">${code}</div>
        </div>
        <button class="invite-copy-btn" onclick="copyInviteLink('${inviteUrl}')"><i class="fas fa-copy" style="font-size:10px;margin-right:4px"></i>复制链接</button>
      </div>
      <div class="invite-stats">
        <div class="invite-stat">
          <div class="v">0</div>
          <div class="l">已邀请</div>
        </div>
        <div class="invite-stat">
          <div class="v">0</div>
          <div class="l">已注册</div>
        </div>
        <div class="invite-stat">
          <div class="v">0 月</div>
          <div class="l">已获 Pro</div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head">
        <h3>分享渠道</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">一键复制</span>
      </div>
      <div style="padding:18px;display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px">
        ${[
          { i: 'fab fa-weixin', c: '#07C160', t: '微信好友', d: '复制链接发好友' },
          { i: 'fas fa-circle-nodes', c: '#1AAD19', t: '朋友圈', d: '生成分享海报' },
          { i: 'fab fa-weibo', c: '#E6162D', t: '微博', d: '一键分享' },
          { i: 'fab fa-twitter', c: '#1DA1F2', t: 'X / Twitter', d: '海外用户' },
          { i: 'fas fa-envelope', c: '#6B6963', t: '邮件', d: '专业场合' },
          { i: 'fas fa-qrcode', c: '#0F0F0E', t: '二维码', d: '线下扫码' }
        ].map(c => `
          <div onclick="showToast('已复制邀请链接')" style="padding:14px;border:1px solid var(--line);border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all 0.15s" onmouseover="this.style.borderColor='${c.c}'" onmouseout="this.style.borderColor='var(--line)'">
            <div style="width:32px;height:32px;background:${c.c}22;color:${c.c};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px">
              <i class="${c.i}"></i>
            </div>
            <div style="flex:1;line-height:1.3">
              <div style="font-weight:600;font-size:13px">${c.t}</div>
              <div style="font-size:11px;color:var(--ink-3)">${c.d}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head">
        <h3>返利规则</h3>
      </div>
      <div style="padding:18px">
        <div style="display:flex;flex-direction:column;gap:14px;font-size:13px">
          <div style="display:flex;align-items:center;gap:12px"><div style="width:24px;height:24px;background:var(--self-bg);color:var(--self);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono', monospace;font-size:12px">1</div><span>分享你的专属邀请链接 / 邀请码给朋友</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:24px;height:24px;background:var(--self-bg);color:var(--self);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono', monospace;font-size:12px">2</div><span>朋友通过你的链接注册 FlowHub 并完成邮箱验证</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:24px;height:24px;background:var(--self-bg);color:var(--self);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono', monospace;font-size:12px">3</div><span>你们双方各自获得 1 个月 Pro 体验(自动到账)</span></div>
          <div style="display:flex;align-items:center;gap:12px"><div style="width:24px;height:24px;background:var(--ad-bg);color:var(--ad);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-family:'JetBrains Mono', monospace;font-size:12px">4</div><span>邀请人数无上限,Pro 时长可累积</span></div>
        </div>
      </div>
    </div>
  `;
}

function copyInviteLink(url) {
  navigator.clipboard?.writeText(url).then(() => {
    showToast('已复制邀请链接到剪贴板');
  }).catch(() => {
    showToast('复制失败,请手动复制');
  });
}

function cancelSub() {
  if (!confirm('确定取消订阅?当前周期结束后会自动转为免费用户。')) return;
  showToast('订阅已取消(演示版,周期结束后会自动降级)');
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return '刚刚';
  if (ms < 3600000) return Math.floor(ms / 60000) + ' 分钟前';
  if (ms < 86400000) return Math.floor(ms / 3600000) + ' 小时前';
  return Math.floor(ms / 86400000) + ' 天前';
}

/* =============================================================
   渲染 · 管理员后台
   ============================================================= */
function renderAdmin() {
  const data = getData();
  const subView = state.adminView;
  const isAdmin = data.user && data.user.role === 'admin';

  if (!isAdmin) {
    document.getElementById('view-admin').innerHTML = `
      ${renderNav()}
      <div class="container admin-gate">
        <div class="admin-gate-card">
          <div class="admin-gate-icon"><i class="fas fa-lock"></i></div>
          <h2>需要管理员权限</h2>
          <p>后台统计、工具审核和投放审核只对管理员开放。请登录管理员账号后继续。</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn-primary" onclick="openLogin()">登录管理员账号</button>
            <button class="btn-secondary" onclick="switchView('market')">返回市场</button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (_apiLoaded && !_adminDataLoaded) {
    loadAdminDataAsync().then(() => {
      if (state.view === 'admin') render();
    });
  }

  const pendingToolSubmissions = (data.tool_submissions || []).filter(a => a.status === 'pending').length;

  document.getElementById('view-admin').innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-logo">
          ${renderBrandMark('mark brand-mark')}
          <div>
            <div class="name">FlowHub</div>
            <div class="role">Admin</div>
          </div>
        </div>
        <div class="nav-section">运营</div>
        <div class="nav-item ${subView === 'overview' ? 'active' : ''}" onclick="setAdminView('overview')"><i class="fas fa-chart-pie"></i>数据总览</div>
        <div class="nav-item ${subView === 'workflows' ? 'active' : ''}" onclick="setAdminView('workflows')"><i class="fas fa-bolt"></i>工作流管理
          ${data.workflows.filter(w => w.status === 'reviewing').length > 0
            ? `<span class="badge-num" style="background:#FF4D4D;color:white">${data.workflows.filter(w => w.status === 'reviewing').length}</span>`
            : `<span class="badge-num">${data.workflows.length}</span>`}
        </div>
        <div class="nav-item ${subView === 'ad_slots' ? 'active' : ''}" onclick="setAdminView('ad_slots')">
          <i class="fas fa-bullhorn"></i>推广位审核
          ${data.ad_applications.filter(a => a.status === 'pending').length > 0 ? `<span class="badge-num" style="background:#FF4D4D;color:white">${data.ad_applications.filter(a => a.status === 'pending').length}<span class="notification-dot" style="margin-left:4px;width:5px;height:5px"></span></span>` : `<span class="badge-num">0</span>`}
        </div>
        <div class="nav-item ${subView === 'tool_submissions' ? 'active' : ''}" onclick="setAdminView('tool_submissions')">
          <i class="fas fa-screwdriver-wrench"></i>工具审核
          ${pendingToolSubmissions > 0 ? `<span class="badge-num" style="background:#FF4D4D;color:white">${pendingToolSubmissions}<span class="notification-dot" style="margin-left:4px;width:5px;height:5px"></span></span>` : `<span class="badge-num">0</span>`}
        </div>
        <div class="nav-item ${subView === 'analytics' ? 'active' : ''}" onclick="setAdminView('analytics')"><i class="fas fa-chart-line"></i>深度分析</div>

        <div class="nav-section">用户</div>
        <div class="nav-item ${subView === 'users' ? 'active' : ''}" onclick="setAdminView('users')"><i class="fas fa-user-group"></i>会员管理</div>

        <div class="nav-section">前台</div>
        <div class="nav-item" onclick="switchView('market')"><i class="fas fa-arrow-left"></i>返回前台</div>
      </aside>

      <main class="admin-main">
        ${renderAdminContent(subView)}
      </main>
    </div>
  `;
}

function setAdminView(v) {
  state.adminView = v;
  renderAdmin();
}

function renderAdminContent(subView) {
  if (subView === 'overview') return renderAdminOverview();
  if (subView === 'workflows') return renderAdminWorkflows();
  if (subView === 'ad_slots') return renderAdminAdSlots();
  if (subView === 'tool_submissions') return renderAdminToolSubmissions();
  if (subView === 'analytics') return renderAdminAnalytics();
  if (subView === 'users') return renderAdminUsers();
  return '';
}

function getAdminClickStats(data) {
  const activeWfs = data.workflows.filter(w => w.status === 'active');
  const total = activeWfs.reduce((sum, w) => sum + getClickCount(w.id), 0);
  const last7 = activeWfs.reduce((sum, w) => sum + getClickCountInDays(w.id, 7), 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = data.clicks.filter(c => new Date(c.clicked_at).getTime() >= todayStart.getTime()).length;
  return { total, today, last7 };
}

function getSearchTermRanking(data) {
  const map = new Map();
  data.clicks.forEach(c => {
    const q = (c.search_query || '').trim();
    if (!q) return;
    map.set(q, (map.get(q) || 0) + 1);
  });
  const rows = Array.from(map.entries())
    .map(([name, clicks]) => ({ name, sub: 'search_query', clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6);
  if (rows.length) return rows;
  return ['商品图', 'SQL', '小红书', '翻译', '简历', '海报'].map((name, i) => ({
    name,
    sub: '等待真实搜索点击',
    clicks: i === 0 ? '—' : '—'
  }));
}

function getWorkflowClickRanking(data, onlyExternal) {
  return data.workflows
    .filter(w => w.status === 'active' && (!onlyExternal || w.type === 'recommend'))
    .map(w => ({
      id: w.id,
      name: w.name,
      sub: onlyExternal ? shortUrl(w.target_url || '') : w.category,
      clicks: getClickCount(w.id)
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6);
}

function renderAdminRankPanel(title, rows, emptyText) {
  return `
    <div class="panel" style="margin-bottom:0">
      <div class="panel-head">
        <h3>${title}</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">TOP ${Math.min(rows.length, 6)}</span>
      </div>
      <div class="rank-list">
        ${rows.length === 0 ? `
          <div style="padding:28px;text-align:center;color:var(--ink-3);font-size:13px">${emptyText || '暂无数据'}</div>
        ` : rows.map((row, i) => `
          <div class="rank-row">
            <div class="rank-no">${i + 1}</div>
            <div style="min-width:0">
              <div class="rank-title">${escapeHtml(row.name)}</div>
              <div class="rank-sub">${escapeHtml(row.sub || '')}</div>
            </div>
            <div class="rank-value">${typeof row.clicks === 'number' ? row.clicks.toLocaleString() : row.clicks}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAdminOverview() {
  const data = getData();
  const clickStats = getAdminClickStats(data);
  const searchRanking = getSearchTermRanking(data);
  const toolClickRanking = getWorkflowClickRanking(data, false);
  const externalRanking = getWorkflowClickRanking(data, true);
  const pendingTools = (data.tool_submissions || []).filter(s => s.status === 'pending').length;
  const seedClickTotal = data.workflows.reduce((sum, w) => sum + (w.seed_clicks || 0), 0);
  const totalClicks = data.clicks.length + seedClickTotal;
  const selfWfs = data.workflows.filter(w => w.type === 'self');
  const adWfs = data.workflows.filter(w => w.type === 'recommend');
  const selfSeedClicks = selfWfs.reduce((sum, w) => sum + (w.seed_clicks || 0), 0);
  const adSeedClicks = adWfs.reduce((sum, w) => sum + (w.seed_clicks || 0), 0);
  const selfClicks = selfSeedClicks + data.clicks.filter(c => {
    const wf = data.workflows.find(w => w.id === c.workflow_id);
    return wf && wf.type === 'self';
  }).length;
  const adClicks = adSeedClicks + (data.clicks.length - data.clicks.filter(c => {
    const wf = data.workflows.find(w => w.id === c.workflow_id);
    return wf && wf.type === 'self';
  }).length);

  // 估算收入
  const proUsers = 4283;  // 演示数据
  const subscriptionRevenue = proUsers * 39;
  let adRevenue = 0;
  data.workflows.filter(w => w.type === 'recommend').forEach(wf => {
    const clicks = getClickCount(wf.id);
    if (wf.price_model === 'cpc') adRevenue += clicks * wf.price_amount;
  });
  adRevenue += 32160; // 加上模拟基数

  // 排行
  const wfClickRanking = data.workflows
    .map(w => ({ ...w, clicks: getClickCount(w.id) }))
    .filter(w => w.status === 'active')
    .sort((a, b) => b.clicks - a.clicks);

  return `
    <div class="admin-head">
      <div>
        <h1>数据总览</h1>
        <div class="sub">
          <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:6px;height:6px;background:#5DCAA5;border-radius:50%;display:inline-block;animation:liveBlink 2s infinite"></span>实时数据 · 最后更新 ${new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary"><i class="fas fa-calendar-week"></i> 近 30 天</button>
        <button class="btn-secondary"><i class="fas fa-download"></i> 导出</button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="lbl">总点击量</div>
        <div class="val">${clickStats.total.toLocaleString()}</div>
        <div class="delta">含种子点击 + 真实点击</div>
      </div>
      <div class="stat-card">
        <div class="lbl">今日点击</div>
        <div class="val green">${clickStats.today.toLocaleString()}</div>
        <div class="delta">来自实时 click 记录</div>
      </div>
      <div class="stat-card">
        <div class="lbl">近 7 天点击</div>
        <div class="val orange">${clickStats.last7.toLocaleString()}</div>
        <div class="delta">含 7 天种子基数</div>
      </div>
      <div class="stat-card">
        <div class="lbl">待审核工具</div>
        <div class="val">${pendingTools}</div>
        <div class="delta">tool_submissions</div>
      </div>
    </div>

    <div class="admin-rank-grid">
      ${renderAdminRankPanel('工具点击排行', toolClickRanking, '暂无工具点击')}
      ${renderAdminRankPanel('搜索词排行', searchRanking, '暂无搜索词')}
      ${renderAdminRankPanel('外部跳转排行', externalRanking, '暂无外部跳转')}
    </div>

    <div class="stats-row stats-row-hero">
      <div class="stat-card stat-hero">
        <div class="stat-hero-row">
          <div>
            <div class="lbl">本月总收入</div>
            <div class="val val-big">¥${(subscriptionRevenue + adRevenue).toLocaleString()}</div>
            <div class="delta delta-pos"><i class="fas fa-arrow-up" style="font-size:9px"></i> +24.6% vs 上月 · ¥${Math.round((subscriptionRevenue + adRevenue) * 0.246).toLocaleString()}</div>
          </div>
          <div class="stat-mini-chart">
            ${renderMiniChart([40, 48, 45, 52, 58, 55, 62, 68, 72, 78, 82, 90], '#1A5D3A')}
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="lbl">订阅收入</div>
        <div class="val green">¥${subscriptionRevenue.toLocaleString()}</div>
        <div class="stat-mini-chart-inline">
          ${renderMiniChart([60, 65, 70, 72, 78, 82, 85], '#1A5D3A', 60)}
        </div>
        <div class="delta">${proUsers} 名 Pro 会员</div>
      </div>
      <div class="stat-card">
        <div class="lbl">广告收入</div>
        <div class="val orange">¥${Math.round(adRevenue).toLocaleString()}</div>
        <div class="stat-mini-chart-inline">
          ${renderMiniChart([30, 35, 32, 40, 45, 42, 50], '#B85C00', 60)}
        </div>
        <div class="delta">含 CPC + 包位</div>
      </div>
      <div class="stat-card">
        <div class="lbl">真实点击</div>
        <div class="val">${totalClicks}</div>
        <div class="stat-mini-chart-inline">
          ${renderMiniChart([20, 25, 22, 28, 30, 35, 38], '#5B3FA8', 60)}
        </div>
        <div class="delta">自营 ${selfClicks} · 推荐 ${adClicks}</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-head">
        <div>
          <h3>近 30 天趋势</h3>
          <div style="font-size:12px;color:var(--ink-3);margin-top:2px">自营调用 vs 推荐点击</div>
        </div>
        <div class="legend">
          <span><span class="legend-dot" style="background:var(--self)"></span>自营调用</span>
          <span><span class="legend-dot" style="background:var(--ad)"></span>推荐点击</span>
        </div>
      </div>
      ${renderTrendChart()}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="panel" style="margin-bottom:0">
        <div class="panel-head">
          <h3>收入构成</h3>
          <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">本月</span>
        </div>
        <div style="padding:20px">
          <div style="display:flex;align-items:flex-end;gap:0;height:160px;border-bottom:1px solid var(--line);padding:0 12px 0 0;margin-bottom:14px;position:relative">
            <div style="position:absolute;top:0;right:0;font-size:10px;color:var(--ink-4);font-family:'JetBrains Mono', monospace">¥220K</div>
            <div style="position:absolute;top:50%;right:0;font-size:10px;color:var(--ink-4);font-family:'JetBrains Mono', monospace">¥110K</div>
            ${[
              { l: '1月', s: 60, a: 20 }, { l: '2月', s: 75, a: 25 }, { l: '3月', s: 88, a: 32 },
              { l: '4月', s: 108, a: 38 }, { l: '5月', s: 135, a: 45 }
            ].map((m, i, arr) => `
              <div style="flex:1;display:flex;flex-direction:column-reverse;align-items:center;gap:2px;margin:0 4px">
                <div style="font-size:9px;color:var(--ink-3);margin-top:6px;font-family:'JetBrains Mono', monospace">${m.l}</div>
                <div style="width:100%;display:flex;flex-direction:column-reverse;height:140px;justify-content:flex-start">
                  <div style="background:var(--self);height:${m.s * 0.8}px;border-radius:3px 3px 0 0;transition:height 0.6s ease ${i * 0.1}s"></div>
                  <div style="background:var(--ad);height:${m.a * 0.8}px;border-radius:${i === 4 ? '3px 3px 0 0' : '0'};transition:height 0.6s ease ${i * 0.1 + 0.2}s"></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-3);margin-top:10px">
            <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;background:var(--self);border-radius:2px"></span>订阅</span>
            <span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;background:var(--ad);border-radius:2px"></span>广告</span>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:0">
        <div class="panel-head">
          <h3>今日活动</h3>
          <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">实时</span>
        </div>
        <div style="padding:0">
          ${[
            { i: 'fa-user-plus', c: '#1A5D3A', t: '3 个用户升级 Pro', s: '5 分钟前' },
            { i: 'fa-bullhorn', c: '#B85C00', t: '新推广位申请', s: '12 分钟前' },
            { i: 'fa-bolt', c: '#1A5D3A', t: '工作流被调用 47 次', s: '半小时前' },
            { i: 'fa-star', c: '#F4B400', t: '新增 5 条 5 星评价', s: '1 小时前' },
            { i: 'fa-handshake', c: '#B85C00', t: '完成创作者结算 ¥3,200', s: '2 小时前' }
          ].map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:13px 20px;border-top:1px solid var(--line)">
              <div style="width:32px;height:32px;border-radius:8px;background:${a.c}22;color:${a.c};display:flex;align-items:center;justify-content:center;font-size:13px">
                <i class="fas ${a.i}"></i>
              </div>
              <div style="flex:1;font-size:13px">${a.t}</div>
              <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">${a.s}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="panel" style="margin-bottom:0">
        <div class="panel-head">
          <h3>来源分析</h3>
          <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">本月</span>
        </div>
        <div style="padding:20px">
          ${[
            { name: '市场首页', pct: 42, color: 'var(--self)' },
            { name: '搜索结果', pct: 28, color: 'var(--pro)' },
            { name: '分类浏览', pct: 16, color: 'var(--ad)' },
            { name: '外部链接', pct: 9, color: '#F4B400' },
            { name: '其他', pct: 5, color: 'var(--ink-3)' }
          ].map(s => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
              <div style="width:90px;font-size:12px;color:var(--ink-2);flex-shrink:0">${s.name}</div>
              <div style="flex:1;height:20px;background:var(--bg-soft);border-radius:6px;overflow:hidden;position:relative">
                <div style="height:100%;width:${s.pct}%;background:${s.color};border-radius:6px;transition:width 0.8s ease"></div>
              </div>
              <div style="width:36px;font-size:12px;font-family:'JetBrains Mono',monospace;color:var(--ink-3);text-align:right">${s.pct}%</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="panel" style="margin-bottom:0">
        <div class="panel-head">
          <h3>近 7 天每日点击</h3>
          <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">日报</span>
        </div>
        <div style="padding:20px">
          ${(() => {
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            const today = new Date().getDay();
            const selfD = [145, 168, 152, 178, 195, 132, 118];
            const adD = [72, 85, 68, 92, 103, 58, 45];
            const maxD = Math.max(...selfD.map((s, i) => s + adD[i]));
            return days.map((d, i) => {
              const total = selfD[i] + adD[i];
              const isToday = (i + 1) % 7 === today;
              return `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;${isToday ? 'font-weight:600' : ''}">
                  <div style="width:30px;font-size:11px;color:${isToday ? 'var(--self)' : 'var(--ink-3)'};font-family:'JetBrains Mono',monospace">${d}</div>
                  <div style="flex:1;height:16px;display:flex;gap:1px;border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${selfD[i] / maxD * 100}%;background:var(--self);border-radius:4px 0 0 4px;transition:width 0.6s ease ${i * 0.05}s"></div>
                    <div style="height:100%;width:${adD[i] / maxD * 100}%;background:var(--ad);border-radius:0 4px 4px 0;transition:width 0.6s ease ${i * 0.05 + 0.1}s"></div>
                  </div>
                  <div style="width:40px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--ink-3);text-align:right">${total}</div>
                </div>
              `;
            }).join('');
          })()}
          <div style="display:flex;justify-content:center;gap:16px;font-size:11px;color:var(--ink-3);margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">
            <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:var(--self);border-radius:2px"></span>自营</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:var(--ad);border-radius:2px"></span>推荐</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>工作流调用排行</h3>
        <button class="row-btn" onclick="setAdminView('workflows')">查看全部 →</button>
      </div>
      <table class="panel-table">
        <thead>
          <tr><th>排名</th><th>工作流</th><th>类型</th><th class="right">真实点击</th><th class="right">评分</th></tr>
        </thead>
        <tbody>
          ${wfClickRanking.slice(0, 5).map((w, i) => `
            <tr>
              <td><span class="num">#${i + 1}</span></td>
              <td>
                <div class="nm">${escapeHtml(w.name)}</div>
                <div class="sub">${escapeHtml(w.category)}</div>
              </td>
              <td><span class="badge-${w.type === 'self' ? 'self' : 'ad'}">${w.type === 'self' ? '自营' : '推荐'}</span></td>
              <td class="right"><span class="num">${w.clicks}</span></td>
              <td class="right"><span class="num">${w.rating} ⭐</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMiniChart(values, color, width) {
  const w = width || 140;
  const h = 40;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  const area = `M 0,${h} L ${pts.split(' ').join(' L ')} L ${w},${h} Z`;
  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block">
      <defs>
        <linearGradient id="mg-${color.replace('#','')}-${w}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#mg-${color.replace('#','')}-${w})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${w}" cy="${h - ((values[values.length-1] - min) / range) * (h - 6) - 3}" r="2.5" fill="${color}"/>
    </svg>
  `;
}

function renderTrendChart() {
  const data = getData();
  // 生成 30 天数据
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selfData = [];
  const adData = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = today.getTime() - i * 86400000;
    const dayEnd = day + 86400000;
    let selfDay = 0, adDay = 0;
    data.clicks.forEach(c => {
      const t = new Date(c.clicked_at).getTime();
      if (t >= day && t < dayEnd) {
        const wf = data.workflows.find(w => w.id === c.workflow_id);
        if (wf?.type === 'self') selfDay++; else adDay++;
      }
    });
    // 加点模拟基数
    selfData.push(selfDay + Math.floor(80 + i * 4 + Math.random() * 30));
    adData.push(adDay + Math.floor(40 + i * 1.5 + Math.random() * 20));
  }

  const w = 900, h = 220;
  const maxVal = Math.max(...selfData, ...adData);
  const pts = (arr) => arr.map((v, i) => `${i * (w / (days - 1))},${h - (v / maxVal) * (h - 30) - 10}`).join(' ');
  const area = (arr) => `M ${pts(arr).split(' ')[0]} L ${pts(arr).split(' ').slice(1).join(' L ')} L ${w},${h} L 0,${h} Z`;

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:200px">
      <line x1="0" y1="40" x2="${w}" y2="40" stroke="#EFEEE9" stroke-width="1"/>
      <line x1="0" y1="110" x2="${w}" y2="110" stroke="#EFEEE9" stroke-width="1"/>
      <line x1="0" y1="180" x2="${w}" y2="180" stroke="#EFEEE9" stroke-width="1"/>
      <path d="${area(selfData)}" fill="#1A5D3A" fill-opacity="0.1"/>
      <polyline points="${pts(selfData)}" fill="none" stroke="#1A5D3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${pts(adData)}" fill="none" stroke="#B85C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${(days - 1) * (w / (days - 1))}" cy="${h - (selfData[days - 1] / maxVal) * (h - 30) - 10}" r="4" fill="#1A5D3A"/>
      <circle cx="${(days - 1) * (w / (days - 1))}" cy="${h - (adData[days - 1] / maxVal) * (h - 30) - 10}" r="4" fill="#B85C00"/>
    </svg>
  `;
}

/* ----- 工作流管理 ----- */
function renderAdminWorkflows() {
  const data = getData();
  return `
    <div class="admin-head">
      <div>
        <h1>工作流管理</h1>
        <div class="sub">添加、编辑、上下架工作流</div>
      </div>
      <button class="btn-primary" onclick="openWfForm()">+ 添加工作流</button>
    </div>

    <div class="panel">
      <table class="panel-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>跳转 URL</th>
            <th>计费</th>
            <th class="right">点击</th>
            <th class="right">评分</th>
            <th class="right">状态</th>
            <th class="right">操作</th>
          </tr>
        </thead>
        <tbody>
          ${data.workflows.map(wf => `
            <tr>
              <td>
                <div class="nm">${escapeHtml(wf.name)}</div>
                <div class="sub">${escapeHtml(wf.category)} · ${escapeHtml((wf.tags || []).join(', '))}</div>
              </td>
              <td><span class="badge-${wf.type === 'self' ? 'self' : 'ad'}">${wf.type === 'self' ? '自营' : '推荐'}</span></td>
              <td>
                <a href="${wf.target_url}" target="_blank" style="font-family:'JetBrains Mono', monospace;font-size:11px;color:var(--ink-2);text-decoration:underline">
                  ${shortUrl(wf.target_url)}
                </a>
              </td>
              <td><span class="num">${formatPrice(wf, true)}</span></td>
              <td class="right"><span class="num">${getClickCount(wf.id)}</span></td>
              <td class="right"><span class="num">${wf.rating}</span></td>
              <td class="right">
                ${wf.status === 'reviewing' ? `
                  <button class="status-tgl" style="background:#FFF7E6;color:#B85C00;border-color:#F2A623" onclick="approveWf('${wf.id}')">
                    ◉ 待审核
                  </button>
                ` : `
                  <button class="status-tgl ${wf.status === 'active' ? 'on' : 'off'}" onclick="toggleWfStatus('${wf.id}')">
                    ${wf.status === 'active' ? '● 启用' : '○ 暂停'}
                  </button>
                `}
              </td>
              <td class="right">
                <button class="row-btn" onclick="openWfForm('${wf.id}')">编辑</button>
                <button class="row-btn danger" onclick="deleteWf('${wf.id}')">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openWfForm(wfId, options) {
  const data = getData();
  const wf = wfId ? data.workflows.find(w => w.id === wfId) : null;
  const mode = options?.mode || 'admin';
  state.editingWfId = wfId || null;
  state.editingWfMode = mode;
  state.clearWfLogo = false;
  state.clearWfGallery = false;

  openModal(`
    <h2>${wf ? (mode === 'creator' ? '编辑提交资料' : '编辑工作流') : '添加工作流'}</h2>
    <p class="modal-sub">${mode === 'creator' ? '修改后会重新进入管理员审核,通过后才会展示到市场。' : '填写真实产品信息、Logo 和详情页图片。'}</p>
    <div class="field">
      <label>名称 *</label>
      <input id="wf-name" value="${escapeHtml(wf ? wf.name : '')}" placeholder="比如:PicSpark 商品图 AI">
    </div>
    <div class="field">
      <label>一句话简介</label>
      <input id="wf-tagline" value="${escapeHtml(wf ? wf.tagline : '')}" placeholder="一句话说清楚能干嘛">
    </div>
    <div class="field">
      <label>详细描述</label>
      <textarea id="wf-desc" placeholder="详细介绍工作流的能力、适用场景">${escapeHtml(wf ? wf.description : '')}</textarea>
    </div>
    <div class="field">
      <label>跳转 URL *</label>
      <input id="wf-url" value="${escapeHtml(wf ? wf.target_url : '')}" placeholder="https://www.picspark.cn">
    </div>
    <div class="field">
      <label>产品 Logo / 图标</label>
      <input id="wf-logo-file" type="file" accept="image/*">
      ${getWorkflowLogo(wf) ? renderMediaPreview([{ label: '当前 Logo', url: getWorkflowLogo(wf) }], '') : '<div style="font-size:12px;color:var(--ink-3);margin-top:8px">未上传时会使用产品名称首字作为图标</div>'}
      ${getWorkflowLogo(wf) ? '<button class="row-btn danger" style="margin-top:8px" onclick="clearWorkflowLogoField()">移除当前 Logo</button>' : ''}
    </div>
    <div class="field">
      <label>详情页轮播图片</label>
      <input id="wf-gallery-files" type="file" accept="image/*" multiple>
      <div style="font-size:11px;color:var(--ink-3);margin-top:6px">最多 6 张。上传后会替换当前详情页轮播图,用于展示真实产品截图或案例图。</div>
      ${renderMediaPreview(wf?.gallery || [], '未上传时使用系统生成的演示图')}
      ${wf?.gallery?.length ? '<button class="row-btn danger" style="margin-top:8px" onclick="clearWorkflowGalleryField()">清空当前轮播图</button>' : ''}
    </div>
    <div class="field-row">
      <div class="field">
        <label>类型</label>
        <select id="wf-type">
          <option value="self" ${wf?.type === 'self' ? 'selected' : ''}>自营(会员可用)</option>
          <option value="recommend" ${wf?.type === 'recommend' ? 'selected' : ''}>推荐(收广告费)</option>
        </select>
      </div>
      <div class="field">
        <label>分类</label>
        <select id="wf-category">
          ${CATEGORIES.filter(c => c !== '全部').map(c => `
            <option value="${c}" ${wf?.category === c ? 'selected' : ''}>${c}</option>
          `).join('')}
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>计费方式</label>
        <select id="wf-price-model">
          <option value="free" ${wf?.price_model === 'free' ? 'selected' : ''}>免费</option>
          <option value="pro" ${wf?.price_model === 'pro' ? 'selected' : ''}>Pro 会员</option>
          <option value="cpc" ${wf?.price_model === 'cpc' ? 'selected' : ''}>CPC 按点击</option>
          <option value="cps" ${wf?.price_model === 'cps' ? 'selected' : ''}>CPS 按销售</option>
        </select>
      </div>
      <div class="field">
        <label>金额 / %</label>
        <input id="wf-price-amount" type="number" step="0.1" value="${wf ? wf.price_amount : 0}">
      </div>
    </div>
    <div class="field">
      <label>标签(英文逗号分隔)</label>
      <input id="wf-tags" value="${escapeHtml(wf ? (wf.tags || []).join(', ') : '')}" placeholder="电商, AI 生图, 中文">
    </div>
    <div class="field">
      <label>主题色</label>
      <div class="color-row" id="color-row">
        ${['#1A5D3A', '#B85C00', '#1E3A8A', '#5B3FA8', '#B83A6B', '#1F6B68', '#8C6510', '#0F0F0E'].map(c => `
          <div class="color-swatch ${(wf?.cover_color || '#1A5D3A') === c ? 'active' : ''}" data-color="${c}" style="background:${c}" onclick="pickColor('${c}', this)"></div>
        `).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">取消</button>
      <button class="primary" onclick="saveWf()">${wf ? '保存' : '添加'}</button>
    </div>
  `);
}

function openCreatorWfForm(wfId) {
  openWfForm(wfId, { mode: 'creator' });
}

function pickColor(color, el) {
  el.parentElement.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

function clearWorkflowLogoField() {
  state.clearWfLogo = true;
  showToast('保存后会移除当前 Logo');
}

function clearWorkflowGalleryField() {
  state.clearWfGallery = true;
  showToast('保存后会清空当前轮播图');
}

async function saveWf() {
  const name = document.getElementById('wf-name').value.trim();
  const url = document.getElementById('wf-url').value.trim();
  if (!name) return showToast('请填写名称', true);
  if (!url) return showToast('请填写跳转 URL', true);
  try { new URL(url); } catch { return showToast('URL 格式不正确', true); }

  const data = getData();
  const existing = state.editingWfId ? data.workflows.find(w => w.id === state.editingWfId) : null;
  const logoUpload = await readImageInput('wf-logo-file', 1);
  const galleryUpload = await readImageInput('wf-gallery-files', 6);
  const logoUrl = logoUpload[0]?.url || (state.clearWfLogo ? '' : (existing?.logo_url || existing?.cover_image_url || ''));
  const gallery = galleryUpload.length
    ? galleryUpload.map((item, index) => ({
      label: item.label || ('产品图 ' + (index + 1)),
      shortLabel: '图 ' + (index + 1),
      title: name,
      url: item.url
    }))
    : (state.clearWfGallery ? [] : (existing?.gallery || []));
  const newData = {
    name,
    tagline: document.getElementById('wf-tagline').value.trim(),
    description: document.getElementById('wf-desc').value.trim(),
    target_url: url,
    type: document.getElementById('wf-type').value,
    category: document.getElementById('wf-category').value,
    price_model: document.getElementById('wf-price-model').value,
    price_amount: parseFloat(document.getElementById('wf-price-amount').value) || 0,
    cover_color: document.querySelector('.color-swatch.active').dataset.color,
    cover_image_url: logoUrl,
    logo_url: logoUrl,
    gallery,
    tags: document.getElementById('wf-tags').value.split(',').map(t => t.trim()).filter(Boolean)
  };

  if (state.editingWfId) {
    const wf = existing;
    Object.assign(wf, newData);
    if (state.editingWfMode === 'creator') {
      wf.status = 'reviewing';
      wf.updated_at = new Date().toISOString();
      showToast('已保存,等待管理员审核');
    } else {
      showToast('已更新工作流');
    }
  } else {
    data.workflows.unshift({
      id: 'wf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      ...newData,
      status: 'active',
      rating: 5.0,
      review_count: 0,
      examples: [],
      created_at: new Date().toISOString()
    });
    showToast('已添加工作流');
  }

  if (_apiLoaded && state.editingWfMode !== 'creator') {
    const result = state.editingWfId
      ? await apiPut('/admin/workflows/' + state.editingWfId, newData)
      : await apiPost('/admin/workflows', newData);
    if (!result.ok) showToast(result.error?.message || '已保存到本地,但同步 API 失败', true);
    else await loadAdminDataAsync();
  }

  saveData(data);
  if (_apiLoaded && _apiCache) {
    _apiCache.workflows = data.workflows.map(_parseWorkflow);
  }
  closeModal();
  state.editingWfMode = 'admin';
  if (state.view === 'creator') renderCreator();
  else renderAdmin();
}

function toggleWfStatus(id) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === id);
  wf.status = wf.status === 'active' ? 'paused' : 'active';
  saveData(data);
  renderAdmin();
}

function approveWf(id) {
  openModal(`
    <div style="text-align:center;padding:16px 0">
      <h2 style="font-family:'Noto Serif SC',serif;font-size:20px;margin-bottom:8px">审核工作流</h2>
      <p style="font-size:13px;color:var(--ink-3);margin-bottom:24px">确认后工作流将上架到市场</p>
      <div class="modal-actions" style="justify-content:center">
        <button onclick="rejectWf('${id}')" style="color:#DC2626;border-color:#DC2626">
          <i class="fas fa-times" style="font-size:10px;margin-right:4px"></i>拒绝
        </button>
        <button class="primary" onclick="doApproveWf('${id}')">
          <i class="fas fa-check" style="font-size:10px;margin-right:4px"></i>通过并上架
        </button>
      </div>
    </div>
  `);
}

function doApproveWf(id) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === id);
  if (wf) { wf.status = 'active'; saveData(data); }
  closeModal();
  showToast('已通过审核并上架');
  renderAdmin();
}

function rejectWf(id) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === id);
  if (wf) { wf.status = 'rejected'; saveData(data); }
  closeModal();
  showToast('已拒绝');
  renderAdmin();
}

function deleteWf(id) {
  if (!confirm('确定删除?所有点击记录也会一并删除')) return;
  const data = getData();
  data.workflows = data.workflows.filter(w => w.id !== id);
  data.clicks = data.clicks.filter(c => c.workflow_id !== id);
  data.reviews = data.reviews.filter(r => r.workflow_id !== id);
  saveData(data);
  showToast('已删除');
  renderAdmin();
}

/* ----- 推广位审核 ----- */
function renderAdminAdSlots() {
  const data = getData();
  const pending = data.ad_applications.filter(a => a.status === 'pending');
  const approved = data.ad_applications.filter(a => a.status === 'approved');
  const rejected = data.ad_applications.filter(a => a.status === 'rejected');

  return `
    <div class="admin-head">
      <div>
        <h1>推广位审核</h1>
        <div class="sub">广告主投放申请 · 审核 / 通过 / 驳回</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="lbl">待审核</div><div class="val orange">${pending.length}</div></div>
      <div class="stat-card"><div class="lbl">已通过</div><div class="val green">${approved.length}</div></div>
      <div class="stat-card"><div class="lbl">已驳回</div><div class="val" style="color:var(--danger)">${rejected.length}</div></div>
      <div class="stat-card"><div class="lbl">推广位类型</div><div class="val">${AD_SLOTS.length}</div></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>待审核申请</h3>
      </div>
      ${pending.length === 0 ? `
        <div style="padding:40px;text-align:center;color:var(--ink-3);font-size:13px">没有待审核的申请</div>
      ` : `
        <table class="panel-table">
          <thead>
            <tr><th>广告主</th><th>工作流</th><th>位置</th><th>计费</th><th>申请时间</th><th class="right">操作</th></tr>
          </thead>
          <tbody>
            ${pending.map(app => {
              const slot = AD_SLOTS.find(s => s.id === app.slot);
              return `
                <tr>
                  <td>
                    <div class="nm">${escapeHtml(app.advertiser_name)}</div>
                    <div class="sub">${escapeHtml(app.contact)}</div>
                  </td>
                  <td>
                    <div class="nm">${escapeHtml(app.workflow_name)}</div>
                    <div class="sub">${shortUrl(app.workflow_url)}</div>
                  </td>
                  <td><span class="num">${slot?.name || app.slot}</span></td>
                  <td><span class="num">${app.price_model === 'cpc' ? `CPC ¥${app.price}` : `包位 ¥${app.price}/${slot?.package_unit || '周'}`}</span></td>
                  <td><span class="num">${timeAgo(app.applied_at)}</span></td>
                  <td class="right">
                    <button class="row-btn" onclick="approveAd('${app.id}')" style="color:var(--self)">通过</button>
                    <button class="row-btn danger" onclick="rejectAd('${app.id}')">驳回</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>

    ${approved.length > 0 ? `
      <div class="panel">
        <div class="panel-head"><h3>已通过的广告</h3></div>
        <table class="panel-table">
          <thead>
            <tr><th>广告主</th><th>工作流</th><th>位置</th><th>计费</th><th class="right">状态</th></tr>
          </thead>
          <tbody>
            ${approved.map(app => `
              <tr>
                <td>${escapeHtml(app.advertiser_name)}</td>
                <td>${escapeHtml(app.workflow_name)}</td>
                <td><span class="num">${AD_SLOTS.find(s => s.id === app.slot)?.name || app.slot}</span></td>
                <td><span class="num">${app.price_model === 'cpc' ? `CPC ¥${app.price}` : `¥${app.price}`}</span></td>
                <td class="right"><span class="badge-active">投放中</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function approveAd(appId) {
  const data = getData();
  const app = data.ad_applications.find(a => a.id === appId);
  if (!app) return;
  app.status = 'approved';
  data.workflows.unshift({
    id: 'wf_ad_' + Date.now(),
    name: app.workflow_name,
    tagline: app.workflow_desc || '合作伙伴推荐工作流',
    description: app.workflow_desc || '该工作流由 ' + app.advertiser_name + ' 提供',
    target_url: app.workflow_url,
    type: 'recommend',
    category: '其他',
    tags: ['合作伙伴'],
    price_model: app.price_model === 'cpc' ? 'cpc' : 'free',
    price_amount: app.price_model === 'cpc' ? app.price : 0,
    cover_color: '#B85C00',
    status: 'active',
    rating: 4.5,
    review_count: 0,
    examples: [],
    created_at: new Date().toISOString()
  });
  saveData(data);
  if (_apiLoaded) {
    apiPatch('/ad-applications/' + appId + '/status', { status: 'approved' })
      .then(() => { loadAdDataAsync(); loadDataFromAPI(); });
  }
  showToast('已通过 · 工作流已上架');
  renderAdmin();
}

function rejectAd(appId) {
  if (!confirm('确定驳回这个申请?')) return;
  const data = getData();
  const app = data.ad_applications.find(a => a.id === appId);
  if (app) app.status = 'rejected';
  saveData(data);
  if (_apiLoaded) {
    apiPatch('/ad-applications/' + appId + '/status', { status: 'rejected' })
      .then(() => loadAdDataAsync());
  }
  showToast('已驳回');
  renderAdmin();
}

/* ----- 工具提交审核 ----- */
function renderAdminToolSubmissions() {
  const data = getData();
  const submissions = data.tool_submissions || [];
  const pending = submissions.filter(s => s.status === 'pending');
  const approved = submissions.filter(s => s.status === 'approved');
  const rejected = submissions.filter(s => s.status === 'rejected');

  return `
    <div class="admin-head">
      <div>
        <h1>工具审核</h1>
        <div class="sub">用户提交的外部工具 · 通过后自动创建正式工具并上架</div>
      </div>
      <button class="btn-secondary" onclick="${_apiLoaded ? "loadAdminDataAsync().then(render)" : "renderAdmin()"}">
        <i class="fas fa-rotate"></i> 刷新
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="lbl">待审核</div><div class="val orange">${pending.length}</div></div>
      <div class="stat-card"><div class="lbl">已通过</div><div class="val green">${approved.length}</div></div>
      <div class="stat-card"><div class="lbl">已驳回</div><div class="val" style="color:var(--danger)">${rejected.length}</div></div>
      <div class="stat-card"><div class="lbl">总提交</div><div class="val">${submissions.length}</div></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Pending Tool Submissions</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">${pending.length} pending</span>
      </div>
      ${pending.length === 0 ? `
        <div style="padding:44px;text-align:center;color:var(--ink-3);font-size:13px">没有待审核的工具提交</div>
      ` : `
        <table class="panel-table">
          <thead>
            <tr>
              <th>工具</th>
              <th>提交人</th>
              <th>分类 / 标签</th>
              <th>链接</th>
              <th>提交时间</th>
              <th class="right">操作</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map(sub => `
              <tr>
                <td>
                  <div class="nm">${escapeHtml(sub.tool_name)}</div>
                  <div class="sub">${sub.submission_type === 'self' ? '自营工作流' : '推荐工具'} · ${escapeHtml(sub.tool_desc || '暂无描述')}</div>
                  ${sub.logo_url || (sub.gallery || []).length ? `<div class="sub">已上传 Logo / 案例图 ${Array.isArray(sub.gallery) ? sub.gallery.length : 0} 张</div>` : ''}
                </td>
                <td>
                  <div class="nm">${escapeHtml(sub.submitter_name || '匿名提交')}</div>
                  <div class="sub">${escapeHtml(sub.contact)}</div>
                </td>
                <td>
                  <div class="nm">${escapeHtml(sub.category || '其他')}</div>
                  <div class="sub">${escapeHtml((sub.tags || []).join(', ') || '无标签')}</div>
                </td>
                <td>
                  <a href="${escapeHtml(sub.tool_url)}" target="_blank" style="font-family:'JetBrains Mono', monospace;font-size:11px;color:var(--ink-2);text-decoration:underline">
                    ${escapeHtml(shortUrl(sub.tool_url))}
                  </a>
                </td>
                <td><span class="num">${timeAgo(sub.submitted_at)}</span></td>
                <td class="right">
                  <button class="row-btn" onclick="approveToolSubmission('${sub.id}')" style="color:var(--self)">Approve</button>
                  <button class="row-btn danger" onclick="rejectToolSubmission('${sub.id}')">Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    ${(approved.length || rejected.length) ? `
      <div class="panel">
        <div class="panel-head"><h3>审核记录</h3></div>
        <table class="panel-table">
          <thead>
            <tr><th>工具</th><th>状态</th><th>正式工作流</th><th>管理员备注</th><th class="right">处理时间</th></tr>
          </thead>
          <tbody>
            ${submissions.filter(s => s.status !== 'pending').map(sub => `
              <tr>
                <td>
                  <div class="nm">${escapeHtml(sub.tool_name)}</div>
                  <div class="sub">${escapeHtml(shortUrl(sub.tool_url))}</div>
                </td>
                <td><span class="${sub.status === 'approved' ? 'badge-active' : 'badge-rejected'}">${sub.status === 'approved' ? '已通过' : '已驳回'}</span></td>
                <td><span class="num">${sub.workflow_id || '-'}</span></td>
                <td>${sub.admin_note ? `<div class="admin-note">${escapeHtml(sub.admin_note)}</div>` : '<span style="color:var(--ink-4)">-</span>'}</td>
                <td class="right"><span class="num">${sub.reviewed_at ? timeAgo(sub.reviewed_at) : '-'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
}

function workflowFromToolSubmission(sub) {
  const type = sub.submission_type === 'self' ? 'self' : 'recommend';
  const priceModel = sub.price_model || (type === 'self' ? 'pro' : 'free');
  return {
    id: 'wf_tool_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: sub.tool_name,
    tagline: (sub.tool_desc || '用户提交的外部 AI 工具').slice(0, 80),
    description: sub.tool_desc || '用户提交的外部 AI 工具',
    target_url: sub.tool_url,
    type,
    category: sub.category || '其他',
    tags: sub.tags || [],
    price_model: priceModel,
    price_amount: parseFloat(sub.price_amount) || 0,
    cover_color: type === 'self' ? '#1A5D3A' : '#B85C00',
    cover_image_url: sub.logo_url || '',
    logo_url: sub.logo_url || '',
    gallery: Array.isArray(sub.gallery) ? sub.gallery : [],
    status: 'active',
    rating: 4.5,
    review_count: 0,
    seed_clicks: 0,
    seed_clicks_7d: 0,
    examples: [],
    created_at: new Date().toISOString()
  };
}

function workflowPreviewFromToolSubmission(sub) {
  const wf = workflowFromToolSubmission(sub);
  wf.id = sub.workflow_id || sub.id;
  wf.status = sub.status === 'approved' ? 'active' : (sub.status === 'pending' ? 'reviewing' : 'rejected');
  wf.rating = 0;
  wf.review_count = 0;
  wf.seed_clicks = 0;
  wf.seed_clicks_7d = 0;
  wf._submission = true;
  wf._creator = { name: sub.submitter_name || '', contact: sub.contact || '' };
  return wf;
}

async function approveToolSubmission(id) {
  const data = getData();
  const sub = (data.tool_submissions || []).find(s => s.id === id);
  if (!sub) return showToast('提交记录不存在', true);
  if (sub.status !== 'pending') return showToast('该提交已处理', true);

  if (_apiLoaded) {
    const result = await apiPost('/admin/tool-submissions/' + id + '/approve', {});
    if (!result.ok) return showToast(result.error?.message || '审核失败', true);
    await loadAdminDataAsync();
    showToast('已通过 · 工具已上架');
    renderAdmin();
    return;
  }

  const wf = workflowFromToolSubmission(sub);
  data.workflows.unshift(wf);
  sub.status = 'approved';
  sub.workflow_id = wf.id;
  sub.reviewed_at = new Date().toISOString();
  saveData(data);
  showToast('已通过 · 工具已上架');
  renderAdmin();
}

function rejectToolSubmission(id) {
  const data = getData();
  const sub = (data.tool_submissions || []).find(s => s.id === id);
  if (!sub) return showToast('提交记录不存在', true);
  if (sub.status !== 'pending') return showToast('该提交已处理', true);
  openModal(`
    <h2>驳回工具提交</h2>
    <p class="modal-sub">${escapeHtml(sub.tool_name)} · 给提交人留下清晰的处理说明</p>
    <div class="field">
      <label>管理员备注</label>
      <textarea id="tool-admin-note" placeholder="例如: 官网无法访问 / 描述不完整 / 与现有工具重复"></textarea>
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">取消</button>
      <button class="primary" style="background:var(--danger)" onclick="doRejectToolSubmission('${id}')">确认驳回</button>
    </div>
  `);
}

async function doRejectToolSubmission(id) {
  const note = document.getElementById('tool-admin-note').value.trim();
  const data = getData();
  const sub = (data.tool_submissions || []).find(s => s.id === id);
  if (!sub) return showToast('提交记录不存在', true);
  if (sub.status !== 'pending') return showToast('该提交已处理', true);

  if (_apiLoaded) {
    const result = await apiPost('/admin/tool-submissions/' + id + '/reject', { admin_note: note });
    if (!result.ok) return showToast(result.error?.message || '驳回失败', true);
    await loadAdminDataAsync();
    closeModal();
    showToast('已驳回');
    renderAdmin();
    return;
  }

  sub.status = 'rejected';
  sub.admin_note = note;
  sub.reviewed_at = new Date().toISOString();
  saveData(data);
  closeModal();
  showToast('已驳回');
  renderAdmin();
}

/* ----- 深度分析 ----- */
function renderAdminAnalytics() {
  const data = getData();
  const totalClicks = data.clicks.length;

  // 简单转化漏斗(基于模拟数据 + 真实点击)
  const funnelData = [
    { step: '访问首页', value: 28450, desc: '首页 PV' },
    { step: '浏览卡片', value: 12180, desc: '至少点击 1 张卡片' },
    { step: '进入详情', value: 6840, desc: '查看工作流详情页' },
    { step: '触发调用', value: 3240 + totalClicks, desc: '点击立即使用' },
    { step: '完成订阅', value: 318, desc: '升级为 Pro' }
  ];

  // CTR 分析
  const wfsCtrAnalysis = data.workflows
    .filter(w => w.type === 'recommend' && w.status === 'active')
    .map(w => {
      const clicks = getClickCount(w.id);
      const impressions = 800 + Math.floor(Math.random() * 5000);
      const ctr = ((clicks / impressions) * 100).toFixed(1);
      return { ...w, clicks, impressions, ctr };
    });

  return `
    <div class="admin-head">
      <div>
        <h1>深度分析</h1>
        <div class="sub">转化漏斗 · CTR 分析 · 收入构成</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>用户转化漏斗</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">近 30 天</span>
      </div>
      <div class="funnel">
        ${funnelData.map((s, i) => {
          const conversion = i === 0 ? 100 : ((s.value / funnelData[0].value) * 100).toFixed(1);
          return `
            <div class="funnel-step">
              <div class="funnel-num">${i + 1}</div>
              <div class="funnel-info">
                <div class="nm">${s.step}</div>
                <div class="desc">${s.desc}</div>
              </div>
              <div class="funnel-stats">
                <div class="v">${s.value.toLocaleString()}</div>
                <div class="conv">${conversion}% ${i > 0 ? `· ${((s.value / funnelData[i-1].value) * 100).toFixed(1)}% 上一步` : ''}</div>
              </div>
              <div class="funnel-bar"><div class="funnel-bar-fill" style="width:${conversion}%"></div></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>推荐工作流 CTR 分析</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">CTR 阈值: 高 ≥10% · 中 5-10% · 低 <5%</span>
      </div>
      ${wfsCtrAnalysis.length === 0 ? `
        <div style="padding:40px;text-align:center;color:var(--ink-3);font-size:13px">还没有推荐工作流</div>
      ` : `
        <table class="panel-table">
          <thead>
            <tr><th>工作流</th><th class="right">展现</th><th class="right">点击</th><th class="right">CTR</th><th class="right">CPC</th><th class="right">预估收入</th></tr>
          </thead>
          <tbody>
            ${wfsCtrAnalysis.map(w => {
              const ctrNum = parseFloat(w.ctr);
              const ctrClass = ctrNum >= 10 ? 'high' : ctrNum >= 5 ? 'mid' : 'low';
              const revenue = w.price_model === 'cpc' ? (w.clicks * w.price_amount).toFixed(2) : '-';
              return `
                <tr>
                  <td>
                    <div class="nm">${escapeHtml(w.name)}</div>
                    <div class="sub">${escapeHtml(w.category)}</div>
                  </td>
                  <td class="right"><span class="num">${w.impressions.toLocaleString()}</span></td>
                  <td class="right"><span class="num">${w.clicks}</span></td>
                  <td class="right"><span class="ctr-pill ${ctrClass}">${w.ctr}%</span></td>
                  <td class="right"><span class="num">${w.price_model === 'cpc' ? '¥' + w.price_amount : '-'}</span></td>
                  <td class="right"><span class="num">${revenue !== '-' ? '¥' + revenue : '-'}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

/* ----- 会员管理 ----- */
function renderAdminUsers() {
  const data = getData();
  const mockUsers = [
    { id: 'u_1', name: '梁先生', email: 'liang****@163.com', tier: 'pro', joined: '2026-04-12', clicks: 153 },
    { id: 'u_2', name: '小赵', email: 'zhao****@qq.com', tier: 'pro', joined: '2026-04-18', clicks: 89 },
    { id: 'u_3', name: '老王', email: 'wang****@gmail.com', tier: 'free', joined: '2026-04-22', clicks: 12 },
    { id: 'u_4', name: '李姐', email: 'li****@outlook.com', tier: 'pro', joined: '2026-05-01', clicks: 67 },
    { id: 'u_5', name: '某 MCN', email: 'mcn****@corp.cn', tier: 'free', joined: '2026-05-05', clicks: 3 }
  ];
  if (data.user) {
    const ue = data.user.email || '';
    const at = ue.indexOf('@');
    const maskedEmail = at > 2 ? ue.slice(0, 2) + '****' + ue.slice(at) : ue;
    mockUsers.unshift({
      id: data.user.id,
      name: data.user.name + ' (你)',
      email: maskedEmail,
      tier: data.user.tier,
      joined: data.user.created_at ? new Date(data.user.created_at).toISOString().slice(0, 10) : '—',
      clicks: data.clicks.filter(c => c.user_id === data.user.id).length
    });
  }

  const proCount = mockUsers.filter(u => u.tier === 'pro').length;
  const freeCount = mockUsers.length - proCount;

  return `
    <div class="admin-head">
      <div>
        <h1>会员管理</h1>
        <div class="sub">注册用户 · 订阅状态 · 使用情况</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="lbl">总用户</div><div class="val">${mockUsers.length + 4280}</div></div>
      <div class="stat-card"><div class="lbl">Pro 会员</div><div class="val green">${proCount + 4283}</div></div>
      <div class="stat-card"><div class="lbl">免费用户</div><div class="val">${freeCount}</div></div>
      <div class="stat-card"><div class="lbl">付费转化</div><div class="val">15.6%</div></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>用户列表(演示)</h3>
        <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">含模拟数据</span>
      </div>
      <table class="panel-table">
        <thead>
          <tr><th>用户</th><th>邮箱</th><th>会员等级</th><th>加入时间</th><th class="right">使用次数</th></tr>
        </thead>
        <tbody>
          ${mockUsers.map(u => `
            <tr>
              <td><div class="nm">${escapeHtml(u.name)}</div></td>
              <td><span class="num" style="font-size:11px">${u.email}</span></td>
              <td>${u.tier === 'pro' ? '<span class="tier-pill pro" style="display:inline-flex"><i class="fas fa-crown" style="font-size:8px"></i>Pro</span>' : '<span class="tier-pill free" style="display:inline-flex">免费</span>'}</td>
              <td><span class="num" style="font-size:11px">${u.joined}</span></td>
              <td class="right"><span class="num">${u.clicks}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* =============================================================
   渲染 · 广告主入驻
   ============================================================= */
function renderAdvertiser() {
  document.getElementById('view-advertiser').innerHTML = `
    ${renderNav()}
    <div class="container">
      <div style="padding:32px 0 24px;border-bottom:1px solid var(--line);margin-bottom:32px">
        <div class="hero-eyebrow">FOR ADVERTISERS</div>
        <h1 style="font-family:'Noto Serif SC',serif;font-size:38px;font-weight:700;line-height:1.15;letter-spacing:-0.01em;margin-bottom:14px">
          把你的工具<span style="font-style:italic;color:var(--ink-3);font-weight:500">推荐给真实用户</span>
        </h1>
        <p style="font-size:15px;color:var(--ink-2);max-width:580px;line-height:1.65">
          FlowHub 每月活跃用户超过 18 万,以中小企业主、电商运营、自媒体作者为主。在这里投放你的工作流推广,获取精准流量。
        </p>
      </div>

      <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;margin-bottom:18px">选择推广位</h2>
      <div class="ad-slots-grid">
        ${AD_SLOTS.map(slot => `
          <div class="ad-slot">
            <div class="ad-slot-head">
              <div>
                <h4>${slot.name}</h4>
                <div class="desc">${slot.desc}</div>
              </div>
            </div>
            <div class="stats">
              <div class="stat-blk">
                <div class="v">${slot.daily_impressions.toLocaleString()}</div>
                <div class="l">日均展现</div>
              </div>
              <div class="stat-blk">
                <div class="v">${slot.ctr_baseline}</div>
                <div class="l">基准 CTR</div>
              </div>
            </div>
            <div style="margin-bottom:14px">
              <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">两种计费方式</div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px">
                <span>包位</span>
                <span class="price-tag">¥${slot.package_price} / ${slot.package_unit}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
                <span>CPC</span>
                <span class="price-tag">¥${slot.cpc_min}+ / 点击</span>
              </div>
            </div>
            <button class="btn-primary" style="width:100%" onclick="openAdvertiseForm('${slot.id}')">
              申请投放 →
            </button>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:48px;padding:24px;background:var(--bg-soft);border-radius:14px">
        <h3 style="font-family:'Noto Serif SC',serif;font-size:18px;font-weight:700;margin-bottom:12px">为什么选择 FlowHub</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:14px">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="fas fa-bullseye" style="color:var(--ad);margin-right:6px"></i>精准流量</div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.6">用户主动找工作流,意图明确,转化率高于通用广告 3-5 倍</div>
          </div>
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="fas fa-shield-halved" style="color:var(--ad);margin-right:6px"></i>反刷量</div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.6">同 IP / 同设备指纹 5 分钟内重复点击不计费</div>
          </div>
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="fas fa-chart-line" style="color:var(--ad);margin-right:6px"></i>实时数据</div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.6">广告主后台看展现、点击、CTR、消耗,数据可下载</div>
          </div>
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:4px"><i class="fas fa-handshake" style="color:var(--ad);margin-right:6px"></i>多种模式</div>
            <div style="font-size:12px;color:var(--ink-3);line-height:1.6">支持 CPC 按点击 / 包位月付 / CPS 销售分成,灵活搭配</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function openAdvertiseForm(slotId) {
  const slot = AD_SLOTS.find(s => s.id === slotId);
  openModal(`
    <h2>申请投放 · ${slot.name}</h2>
    <p class="modal-sub">提交后平台 1-2 个工作日内审核</p>
    <div class="field">
      <label>公司 / 组织名 *</label>
      <input id="ad-name" placeholder="比如:北京 XX 科技有限公司">
    </div>
    <div class="field">
      <label>联系方式 *</label>
      <input id="ad-contact" placeholder="邮箱 / 微信">
    </div>
    <div class="field">
      <label>要投放的工作流名称 *</label>
      <input id="ad-wf-name" placeholder="工作流在 FlowHub 上展示的名字">
    </div>
    <div class="field">
      <label>工作流 URL *</label>
      <input id="ad-wf-url" placeholder="https://...">
    </div>
    <div class="field">
      <label>工作流简介</label>
      <textarea id="ad-wf-desc" placeholder="一句话介绍这个工作流"></textarea>
    </div>
    <div class="field">
      <label>计费方式</label>
      <select id="ad-price-model">
        <option value="package">包位 · ¥${slot.package_price}/${slot.package_unit}</option>
        <option value="cpc">CPC · ¥${slot.cpc_min}+/点击</option>
      </select>
    </div>
    <div class="field">
      <label>出价(¥)</label>
      <input id="ad-price" type="number" value="${slot.package_price}" step="100">
    </div>
    <div class="modal-actions">
      <button onclick="closeModal()">取消</button>
      <button class="primary" onclick="submitAdvertise('${slotId}')">提交申请</button>
    </div>
  `);
}

function submitAdvertise(slotId) {
  const name = document.getElementById('ad-name').value.trim();
  const contact = document.getElementById('ad-contact').value.trim();
  const wfName = document.getElementById('ad-wf-name').value.trim();
  const wfUrl = document.getElementById('ad-wf-url').value.trim();
  if (!name || !contact || !wfName || !wfUrl) return showToast('请填写带 * 的必填项', true);
  try { new URL(wfUrl); } catch { return showToast('URL 格式不正确', true); }

  const data = getData();
  const adAppObj = {
    id: 'ad_app_' + Date.now(),
    advertiser_name: name,
    contact: contact,
    workflow_name: wfName,
    workflow_url: wfUrl,
    workflow_desc: document.getElementById('ad-wf-desc').value.trim(),
    slot: slotId,
    price_model: document.getElementById('ad-price-model').value,
    price: parseFloat(document.getElementById('ad-price').value) || 0,
    status: 'pending',
    applied_at: new Date().toISOString()
  };
  data.ad_applications.unshift(adAppObj);
  saveData(data);
  if (_apiLoaded) {
    apiPost('/ad-applications', adAppObj).then(() => loadAdDataAsync());
  }
  closeModal();
  showToast('申请已提交 · 平台审核后会联系你');
}

/* =============================================================
   创作者入驻申请
   ============================================================= */
function openCreatorApply() {
  openModal(`
    <div style="padding:4px 0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <h2 style="font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700">申请成为创作者</h2>
          <p style="font-size:13px;color:var(--ink-3);margin-top:4px">提交后 1-2 个工作日内审核,通过后即可上架工作流</p>
        </div>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="creator-type-btn active" id="ct-self" onclick="switchCreatorType('self')">
          <i class="fas fa-wand-magic-sparkles" style="color:var(--self)"></i>
          <div>
            <div style="font-weight:600;font-size:13px">上架自营工作流</div>
            <div style="font-size:11px;color:var(--ink-3)">在 FlowHub 内直接运行</div>
          </div>
        </button>
        <button class="creator-type-btn" id="ct-recommend" onclick="switchCreatorType('recommend')">
          <i class="fas fa-external-link-alt" style="color:var(--ad)"></i>
          <div>
            <div style="font-weight:600;font-size:13px">推荐第三方工具</div>
            <div style="font-size:11px;color:var(--ink-3)">跳转至你的网站</div>
          </div>
        </button>
      </div>

      <div class="field">
        <label>创作者 / 公司名 *</label>
        <input id="ca-name" placeholder="你或你的团队名称">
      </div>
      <div class="field">
        <label>联系方式 *</label>
        <input id="ca-contact" placeholder="邮箱或微信号">
      </div>
      <div class="field">
        <label>工作流名称 *</label>
        <input id="ca-wf-name" placeholder="给你的工作流起个名字">
      </div>
      <div class="field">
        <label>一句话介绍 *</label>
        <input id="ca-tagline" placeholder="简短描述你的工作流能做什么">
      </div>
      <div class="field">
        <label>详细描述</label>
        <textarea id="ca-desc" placeholder="介绍工作流的功能、适用场景、技术特点等" rows="3"></textarea>
      </div>
      <div class="field">
        <label>工作流 URL *</label>
        <input id="ca-url" placeholder="https://your-tool.com">
      </div>
      <div class="field">
        <label>产品 Logo / 图标</label>
        <input id="ca-logo-file" type="file" accept="image/*">
      </div>
      <div class="field">
        <label>详情页产品图 / 案例图</label>
        <input id="ca-gallery-files" type="file" accept="image/*" multiple>
        <div style="font-size:11px;color:var(--ink-3);margin-top:6px">最多 6 张,审核通过后会展示在详情页轮播。</div>
      </div>
      <div class="field">
        <label>所属分类 *</label>
        <select id="ca-category">
          ${CATEGORIES.filter(c => c !== '全部').map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>标签 <span style="font-size:11px;color:var(--ink-3);font-weight:normal">用逗号分隔,最多 3 个</span></label>
        <input id="ca-tags" placeholder="AI 生图, 电商, 中文">
      </div>

      <div style="background:var(--bg-soft);border-radius:10px;padding:14px 16px;margin:16px 0;font-size:12px;line-height:1.7;color:var(--ink-2)">
        <div style="font-weight:600;margin-bottom:4px"><i class="fas fa-info-circle" style="color:var(--self);margin-right:4px"></i>审核说明</div>
        提交后平台将审核工作流的内容质量和安全性。审核通过后,工作流将上架到市场。自营工作流享受 70% 分成,推荐工作流按 CPC 或 CPS 计费。
      </div>

      <div class="modal-actions">
        <button onclick="closeModal()">取消</button>
        <button class="primary" onclick="submitCreatorApply()"><i class="fas fa-paper-plane" style="font-size:11px;margin-right:4px"></i>提交申请</button>
      </div>
    </div>
  `);
}

function switchCreatorType(type) {
  document.getElementById('ct-self').classList.toggle('active', type === 'self');
  document.getElementById('ct-recommend').classList.toggle('active', type === 'recommend');
  window._creatorApplyType = type;
}

async function submitCreatorApply() {
  const name = document.getElementById('ca-name').value.trim();
  const contact = document.getElementById('ca-contact').value.trim();
  const wfName = document.getElementById('ca-wf-name').value.trim();
  const tagline = document.getElementById('ca-tagline').value.trim();
  const url = document.getElementById('ca-url').value.trim();
  const category = document.getElementById('ca-category').value;

  if (!name || !contact || !wfName || !tagline || !url) {
    return showToast('请填写带 * 的必填项', true);
  }
  try { new URL(url); } catch { return showToast('URL 格式不正确', true); }

  const type = window._creatorApplyType || 'self';
  const tags = document.getElementById('ca-tags').value.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 3);
  const desc = document.getElementById('ca-desc').value.trim();
  const logoUpload = await readImageInput('ca-logo-file', 1);
  const galleryUpload = await readImageInput('ca-gallery-files', 6);
  const logoUrl = logoUpload[0]?.url || '';
  const gallery = galleryUpload.map((item, index) => ({
    label: item.label || ('案例图 ' + (index + 1)),
    shortLabel: '图 ' + (index + 1),
    title: wfName,
    url: item.url
  }));

  const data = getData();
  const submission = {
    id: 'tool_sub_' + Date.now(),
    submitter_name: name,
    contact,
    tool_name: wfName,
    tool_url: url,
    tool_desc: desc || tagline,
    category,
    tags,
    submission_type: type,
    price_model: type === 'self' ? 'pro' : 'cpc',
    price_amount: type === 'self' ? 0 : 1,
    logo_url: logoUrl,
    gallery,
    status: 'pending',
    admin_note: '',
    workflow_id: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    _creator_user_id: data.user?.id || null
  };

  if (_apiLoaded) {
    const result = await apiPost('/tool-submissions', submission);
    if (!result.ok) return showToast(result.error?.message || '提交失败,请稍后再试', true);
    if (_apiCache) {
      const saved = { ...submission, ...(result.data?.submission || {}) };
      saved._creator_user_id = data.user?.id || null;
      _apiCache.tool_submissions = _apiCache.tool_submissions || [];
      _apiCache.tool_submissions.unshift(saved);
    }
  } else {
    data.tool_submissions = data.tool_submissions || [];
    data.tool_submissions.unshift(submission);
    saveData(data);
  }

  closeModal();
  showToast('申请已提交!审核通过后将上架到市场');

  setTimeout(() => {
    openModal(`
      <div style="text-align:center;padding:24px 16px">
        <div style="width:56px;height:56px;background:var(--self-bg);color:var(--self);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px"><i class="fas fa-check"></i></div>
        <h2 style="font-family:'Noto Serif SC',serif;font-size:20px;font-weight:700;margin-bottom:8px">申请已收到</h2>
        <p style="font-size:14px;color:var(--ink-2);margin-bottom:6px">${escapeHtml(wfName)}</p>
        <p style="font-size:13px;color:var(--ink-3);margin-bottom:24px;line-height:1.6">
          审核周期 1-2 个工作日<br>通过后将自动上架到「${category}」分类
        </p>
        <div style="background:var(--bg-soft);border-radius:10px;padding:16px;text-align:left;margin-bottom:20px">
          <div style="font-size:12px;color:var(--ink-3);margin-bottom:10px">申请详情</div>
          <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;font-size:13px">
            <span style="color:var(--ink-3)">类型</span><span>${type === 'self' ? '自营工作流' : '推荐工作流'}</span>
            <span style="color:var(--ink-3)">分类</span><span>${category}</span>
            <span style="color:var(--ink-3)">状态</span><span style="color:var(--ad);font-weight:600">审核中</span>
          </div>
        </div>
        <button class="btn-primary" onclick="closeModal()" style="width:100%">知道了</button>
      </div>
    `);
  }, 300);
}

/* =============================================================
   渲染 · PicSpark 接入向导(实战教学)
   ============================================================= */
function renderWizard() {
  const step = state.wizardStep || 1;
  document.getElementById('view-wizard').innerHTML = `
    ${renderNav()}
    <div class="container">
      <div style="padding:24px 0 16px">
        <div class="hero-eyebrow">INTEGRATION GUIDE · 接入实战</div>
        <h1 style="font-family:'Noto Serif SC', serif;font-size:30px;font-weight:700;letter-spacing:-0.01em;margin-bottom:8px">PicSpark 接入 FlowHub 实战</h1>
        <p style="color:var(--ink-3);font-size:14px;max-width:580px;line-height:1.65">这是一份「真实可操作」的接入指南,你可以照着每一步在 PicSpark 端做改动。完成 4 步后,PicSpark 就会出现在 FlowHub 的卡片市场,并能精确记录每次点击和归因。</p>
      </div>

      <div class="wizard-progress">
        ${[
          { n: 1, l: '配置 CSP / 跨域' },
          { n: 2, l: '识别归因参数' },
          { n: 3, l: '注册 Webhook 回调' },
          { n: 4, l: '测试与上线' }
        ].map((s, i, arr) => `
          <div class="wizard-step ${step > s.n ? 'done' : step === s.n ? 'active' : ''}" onclick="setWizardStep(${s.n})" style="cursor:pointer">
            <div class="circle">${step > s.n ? '<i class="fas fa-check" style="font-size:11px"></i>' : s.n}</div>
            <span class="label">${s.l}</span>
          </div>
          ${i < arr.length - 1 ? `<div class="wizard-line ${step > s.n ? 'done' : ''}"></div>` : ''}
        `).join('')}
      </div>

      ${renderWizardStep(step)}

      <div style="display:flex;justify-content:space-between;margin-top:24px">
        ${step > 1 ?
          `<button class="btn-secondary" onclick="setWizardStep(${step - 1})">← 上一步</button>` :
          `<div></div>`
        }
        ${step < 4 ?
          `<button class="btn-primary" onclick="setWizardStep(${step + 1})">下一步 →</button>` :
          `<button class="btn-primary" onclick="finishWizard()"><i class="fas fa-rocket" style="font-size:11px"></i> 完成接入 · 提交审核</button>`
        }
      </div>
    </div>
  `;
}

function setWizardStep(n) {
  state.wizardStep = n;
  renderWizard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function finishWizard() {
  showToast('🎉 接入完成!正在为你提交审核,1-2 个工作日内会通知你');
  setTimeout(() => {
    state.wizardStep = 1;
    switchView('market');
  }, 2000);
}

function renderWizardStep(step) {
  if (step === 1) {
    return `
      <div class="wizard-panel">
        <h2>第一步 · 配置 CSP 允许 FlowHub 嵌入(可选)</h2>
        <p class="desc">如果你想让 PicSpark 在 FlowHub 内以 iframe 嵌入方式展示,需要在 nginx / 服务器配置允许嵌入。如果只是跳转外链,可以跳过这步。</p>

        <div style="margin-bottom:18px">
          <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">在 nginx 配置中添加响应头</h4>
          <div class="code-block">
            <span class="code-lang">NGINX</span>
            <button class="copy-code" onclick="copyCode(this)">复制</button>
<span class="comment"># 在 picspark.cn 的 server 配置块里添加</span>
<span class="kw">add_header</span> Content-Security-Policy <span class="str">"frame-ancestors 'self' https://flowhub.cn https://*.flowhub.cn"</span>;

<span class="comment"># 注意:不要用 X-Frame-Options(已废弃)</span>
<span class="comment"># 现代浏览器只识别 CSP frame-ancestors</span>
          </div>
        </div>

        <div>
          <h4 style="font-size:13px;font-weight:600;margin-bottom:8px">或在 Next.js / Vercel 项目里配置</h4>
          <div class="code-block">
            <span class="code-lang">next.config.js</span>
            <button class="copy-code" onclick="copyCode(this)">复制</button>
<span class="comment">// next.config.js</span>
<span class="kw">module</span>.<span class="fn">exports</span> = {
  <span class="fn">async</span> headers() {
    <span class="kw">return</span> [{
      source: <span class="str">'/(.*)'</span>,
      headers: [{
        key: <span class="str">'Content-Security-Policy'</span>,
        value: <span class="str">"frame-ancestors 'self' https://flowhub.cn"</span>
      }]
    }];
  }
};
          </div>
        </div>

        <div style="margin-top:18px;padding:14px;background:var(--info-bg);border-radius:8px;border-left:3px solid var(--info);font-size:12px;color:var(--info);line-height:1.6">
          <strong>💡 PicSpark 团队的选择</strong><br>
          因为你有自己的收费体系,建议选「URL 跳转」模式,不需要做这一步。直接进入第二步。
        </div>
      </div>
    `;
  }

  if (step === 2) {
    return `
      <div class="wizard-panel">
        <h2>第二步 · 识别 FlowHub 归因参数</h2>
        <p class="desc">当用户从 FlowHub 点击进入 PicSpark 时,URL 会带上归因参数。PicSpark 需要识别并存储这个归因关系,这样后续付费时才能反馈给 FlowHub 分账。</p>

        <h4 style="font-size:13px;font-weight:600;margin:14px 0 8px">FlowHub 跳转的 URL 格式</h4>
        <div class="code-block">
          <span class="code-lang">URL</span>
<span class="str">https://www.picspark.cn/?from=flowhub&wf_id=wf_abc123&uid=u_138xxxx&ts=1730000000&sig=a8f9e2c4...</span>
        </div>

        <h4 style="font-size:13px;font-weight:600;margin:18px 0 8px">在 PicSpark 落地页加这段代码</h4>
        <div class="code-block">
          <span class="code-lang">JavaScript · 前端</span>
          <button class="copy-code" onclick="copyCode(this)">复制</button>
<span class="comment">// 在 picspark.cn 网站首页 / 入口页面执行</span>
<span class="kw">const</span> params = <span class="kw">new</span> <span class="fn">URLSearchParams</span>(window.location.search);

<span class="kw">if</span> (params.<span class="fn">get</span>(<span class="str">'from'</span>) === <span class="str">'flowhub'</span>) {
  <span class="kw">const</span> attribution = {
    fh_uid: params.<span class="fn">get</span>(<span class="str">'uid'</span>),
    wf_id: params.<span class="fn">get</span>(<span class="str">'wf_id'</span>),
    referred_at: <span class="fn">Date</span>.<span class="fn">now</span>(),
    expires_at: <span class="fn">Date</span>.<span class="fn">now</span>() + <span class="num-v">30</span> * <span class="num-v">86400000</span>  <span class="comment">// 30 天归因窗口</span>
  };

  <span class="comment">// 存到 cookie / localStorage / 用户档案</span>
  localStorage.<span class="fn">setItem</span>(<span class="str">'fh_attribution'</span>, <span class="fn">JSON</span>.<span class="fn">stringify</span>(attribution));

  <span class="comment">// 可选:UI 上显示一条欢迎条</span>
  <span class="fn">showFlowHubBanner</span>(<span class="str">'欢迎从 FlowHub 来的朋友,享 7 天 8 折'</span>);
}
        </div>

        <h4 style="font-size:13px;font-weight:600;margin:18px 0 8px">后端:用户注册时关联归因</h4>
        <div class="code-block">
          <span class="code-lang">Node.js / Express</span>
          <button class="copy-code" onclick="copyCode(this)">复制</button>
<span class="kw">app</span>.<span class="fn">post</span>(<span class="str">'/api/user/register'</span>, <span class="fn">async</span> (req, res) => {
  <span class="kw">const</span> { phone, code, fh_attribution } = req.body;

  <span class="kw">const</span> user = <span class="kw">await</span> <span class="fn">createUser</span>({ phone });

  <span class="kw">if</span> (fh_attribution) {
    <span class="kw">await</span> <span class="fn">db</span>.attributions.<span class="fn">insert</span>({
      user_id: user.id,
      source: <span class="str">'flowhub'</span>,
      fh_uid: fh_attribution.fh_uid,
      wf_id: fh_attribution.wf_id,
      created_at: <span class="kw">new</span> <span class="fn">Date</span>()
    });
  }

  res.<span class="fn">json</span>({ ok: <span class="kw">true</span>, user });
});
        </div>
      </div>
    `;
  }

  if (step === 3) {
    return `
      <div class="wizard-panel">
        <h2>第三步 · 注册 Webhook 回调 FlowHub</h2>
        <p class="desc">当 PicSpark 用户完成关键动作(注册成功 / 首次付费 / 续费),需要通过 Webhook 通知 FlowHub,这样 FlowHub 才能算出该给你多少分成 / 推广费。</p>

        <h4 style="font-size:13px;font-weight:600;margin:14px 0 8px">FlowHub 提供的 Webhook 端点</h4>
        <div class="code-block">
          <span class="code-lang">POST · WEBHOOK</span>
<span class="kw">POST</span> https://api.flowhub.cn/v1/webhook/attribution
<span class="kw">Content-Type</span>: application/json
<span class="kw">X-FlowHub-Signature</span>: &lt;HMAC-SHA256 签名&gt;

{
  <span class="str">"event_type"</span>: <span class="str">"purchase"</span>,    <span class="comment">// signup | purchase | renewal</span>
  <span class="str">"fh_uid"</span>: <span class="str">"u_138xxxx"</span>,
  <span class="str">"picspark_uid"</span>: <span class="str">"pu_abc123"</span>,
  <span class="str">"amount"</span>: <span class="num-v">99.00</span>,
  <span class="str">"currency"</span>: <span class="str">"CNY"</span>,
  <span class="str">"occurred_at"</span>: <span class="str">"2026-05-11T10:30:00Z"</span>
}
        </div>

        <h4 style="font-size:13px;font-weight:600;margin:18px 0 8px">PicSpark 端的触发代码示例</h4>
        <div class="code-block">
          <span class="code-lang">Node.js</span>
          <button class="copy-code" onclick="copyCode(this)">复制</button>
<span class="comment">// 在 PicSpark 用户完成支付时触发</span>
<span class="kw">async function</span> <span class="fn">notifyFlowHub</span>(user, event, amount) {
  <span class="kw">const</span> attribution = <span class="kw">await</span> <span class="fn">db</span>.attributions
    .<span class="fn">findOne</span>({ user_id: user.id, source: <span class="str">'flowhub'</span> });

  <span class="kw">if</span> (!attribution) <span class="kw">return</span>;  <span class="comment">// 不是 FlowHub 来源</span>

  <span class="comment">// 检查归因窗口(30 天内有效)</span>
  <span class="kw">if</span> (<span class="fn">Date</span>.<span class="fn">now</span>() - attribution.created_at > <span class="num-v">30</span> * <span class="num-v">86400000</span>) <span class="kw">return</span>;

  <span class="kw">const</span> payload = {
    event_type: event,
    fh_uid: attribution.fh_uid,
    picspark_uid: user.id,
    amount: amount,
    occurred_at: <span class="kw">new</span> <span class="fn">Date</span>().<span class="fn">toISOString</span>()
  };

  <span class="kw">const</span> signature = <span class="fn">hmacSha256</span>(<span class="fn">JSON</span>.<span class="fn">stringify</span>(payload), FLOWHUB_SECRET);

  <span class="kw">await</span> <span class="fn">fetch</span>(<span class="str">'https://api.flowhub.cn/v1/webhook/attribution'</span>, {
    method: <span class="str">'POST'</span>,
    headers: {
      <span class="str">'Content-Type'</span>: <span class="str">'application/json'</span>,
      <span class="str">'X-FlowHub-Signature'</span>: signature
    },
    body: <span class="fn">JSON</span>.<span class="fn">stringify</span>(payload)
  });
}
        </div>

        <div style="margin-top:18px;padding:14px;background:#FFF6E0;border-radius:8px;border-left:3px solid var(--warn);font-size:12px;color:#8A6500;line-height:1.6">
          <strong>⚠️ 签名校验很重要</strong><br>
          FlowHub 会用 HMAC-SHA256 签名验证请求,防止有人伪造分账数据骗钱。共享密钥在管理员后台 → 接入密钥 中获取。
        </div>
      </div>
    `;
  }

  if (step === 4) {
    return `
      <div class="wizard-panel">
        <h2>第四步 · 测试接入是否成功</h2>
        <p class="desc">在正式上线前,点击下方按钮模拟一次完整的接入流程,验证你的配置正确。</p>

        <div style="margin:18px 0;padding:18px;background:var(--bg-soft);border-radius:10px">
          <div style="font-size:13px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px">
            <i class="fas fa-flask" style="color:var(--self)"></i>
            模拟测试
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--ink-2);margin-bottom:14px">
            <div>1. 模拟用户从 FlowHub 点击 PicSpark 卡片</div>
            <div>2. 模拟 PicSpark 识别 ?from=flowhub 参数</div>
            <div>3. 模拟用户在 PicSpark 完成付费</div>
            <div>4. 模拟 Webhook 回调 FlowHub</div>
            <div>5. 验证 FlowHub 收到通知并写入归因表</div>
          </div>
          <button class="wizard-test-btn" onclick="runWizardTest()">
            <i class="fas fa-play" style="font-size:11px"></i> 开始测试
          </button>
          <div class="wizard-test-result" id="wizard-test-result"></div>
        </div>

        <div style="margin-top:24px">
          <h4 style="font-size:13px;font-weight:600;margin-bottom:10px">上线前检查清单</h4>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto" checked><span>归因参数识别已部署</span></label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto" checked><span>Webhook 端点已配置</span></label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto" checked><span>HMAC 签名已实现</span></label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto"><span>测试环境验证通过</span></label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto"><span>生产环境密钥已替换</span></label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" style="width:auto"><span>已阅读《创作者协议》</span></label>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function copyCode(btn) {
  const code = btn.parentElement.innerText.replace(/^\s*(NGINX|JAVASCRIPT|.*?)\s*复制\s*/i, '').trim();
  navigator.clipboard?.writeText(code).then(() => {
    const orig = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}

function runWizardTest() {
  const result = document.getElementById('wizard-test-result');
  result.classList.add('show');
  result.classList.remove('failed');

  const steps = [
    '[10:42:11] → 模拟跳转:GET /?from=flowhub&wf_id=wf_picspark&uid=u_138xxxx',
    '[10:42:11] ✓ PicSpark 识别归因参数,存入 localStorage',
    '[10:42:12] → 模拟用户行为:浏览 picspark.cn(15 秒)',
    '[10:42:27] → 模拟用户注册:phone=139****1234',
    '[10:42:28] ✓ 后端关联归因:fh_uid=u_138xxxx',
    '[10:43:05] → 模拟用户付费:¥99 月费',
    '[10:43:05] → 触发 Webhook 回调',
    '[10:43:06] → POST https://api.flowhub.cn/v1/webhook/attribution',
    '[10:43:06] ✓ HMAC 签名验证通过',
    '[10:43:06] ✓ FlowHub 收到回调,记录归因',
    '[10:43:06] ✓ 本月分账金额 +¥29.70(30%)',
    '',
    '🎉 测试完成!所有步骤通过,接入正常。'
  ];

  result.textContent = '';
  let i = 0;
  const interval = setInterval(() => {
    result.textContent += steps[i] + '\n';
    i++;
    if (i >= steps.length) clearInterval(interval);
  }, 280);
}

/* =============================================================
   渲染 · 创作者后台
   ============================================================= */
function renderCreator() {
  const data = getData();
  const currentUser = data.user || {};
  // 假设当前创作者是 "PicSpark 团队",拥有 PicSpark 工作流
  const ownedWorkflows = data.workflows.filter(w =>
    w.name.includes('PicSpark') ||
    w.id === 'wf_seed_picspark' ||
    w.name.includes('小红书') ||
    w.name.includes('品牌色板') ||
    w._creator?.contact === currentUser.email ||
    w.creator_id === currentUser.id
  );
  const ownedIds = new Set(ownedWorkflows.map(w => w.id));
  const mySubmissions = (data.tool_submissions || []).filter(sub =>
    (currentUser.email && sub.contact === currentUser.email) ||
    (currentUser.id && sub._creator_user_id === currentUser.id)
  );
  const submissionWorkflows = mySubmissions
    .filter(sub => !sub.workflow_id || !ownedIds.has(sub.workflow_id))
    .map(workflowPreviewFromToolSubmission);
  const myWorkflows = [...ownedWorkflows, ...submissionWorkflows];

  const totalClicks = myWorkflows.reduce((sum, w) => sum + getClickCount(w.id), 0);
  const baseEarning = 18420;
  const dynamicEarning = totalClicks * 1.2;
  const monthEarning = baseEarning + dynamicEarning;

  document.getElementById('view-creator').innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-logo">
          ${renderBrandMark('mark brand-mark')}
          <div>
            <div class="name">FlowHub</div>
            <div class="role">Creator</div>
          </div>
        </div>
        <div class="nav-section">数据</div>
        <div class="nav-item active"><i class="fas fa-chart-pie"></i>收益总览</div>
        <div class="nav-item"><i class="fas fa-bolt"></i>我的工作流<span class="badge-num">${myWorkflows.length}</span></div>
        <div class="nav-item"><i class="fas fa-chart-line"></i>调用分析</div>
        <div class="nav-item"><i class="fas fa-star"></i>用户评价</div>

        <div class="nav-section">收益</div>
        <div class="nav-item"><i class="fas fa-wallet"></i>结算与提现</div>
        <div class="nav-item"><i class="fas fa-file-invoice"></i>开票信息</div>

        <div class="nav-section">运营</div>
        <div class="nav-item" onclick="setAdminView('workflows'); switchView('admin')"><i class="fas fa-plus"></i>添加新工作流</div>
        <div class="nav-item" onclick="switchView('wizard')"><i class="fas fa-code"></i>接入文档</div>

        <div class="nav-section">前台</div>
        <div class="nav-item" onclick="switchView('market')"><i class="fas fa-arrow-left"></i>返回前台</div>
      </aside>

      <main class="admin-main">
        <div class="admin-head">
          <div>
            <h1>创作者后台</h1>
            <div class="sub">
              <span style="display:inline-flex;align-items:center;gap:5px">
                <span style="width:6px;height:6px;background:#5DCAA5;border-radius:50%;display:inline-block;animation:liveBlink 2s infinite"></span>
                PicSpark 团队 · 已认证创作者
              </span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary"><i class="fas fa-download"></i> 导出报表</button>
            <button class="btn-primary"><i class="fas fa-wallet"></i> 申请提现</button>
          </div>
        </div>

        <div class="creator-hero">
          <h1>本月预估收益</h1>
          <div class="sub">5 月 11 日截至 · 月底结算 · 次月 15 号到账</div>
          <div class="creator-earning-row">
            <div class="creator-earning-main">
              <div class="earning-num"><span class="earning-currency">¥</span>${Math.round(monthEarning).toLocaleString()}</div>
              <div class="earning-label">本月分账 · 占平台总订阅 12.3%</div>
            </div>
            <div class="creator-earning-stat">
              <div class="v">${totalClicks + 32418}</div>
              <div class="l">本月调用</div>
            </div>
            <div class="creator-earning-stat">
              <div class="v">+24.6%</div>
              <div class="l">vs 上月</div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
          <div class="chart-card" style="margin-bottom:0">
            <div class="chart-head">
              <div>
                <h3>近 30 天收益趋势</h3>
                <div style="font-size:12px;color:var(--ink-3);margin-top:2px">订阅分摊 + CPC 推广位</div>
              </div>
              <div class="legend">
                <span><span class="legend-dot" style="background:var(--self)"></span>订阅分摊</span>
                <span><span class="legend-dot" style="background:var(--ad)"></span>推广收益</span>
              </div>
            </div>
            ${renderCreatorEarningChart()}
          </div>

          <div class="panel" style="margin-bottom:0">
            <div class="panel-head">
              <h3>结算预告</h3>
            </div>
            <div style="padding:18px">
              <div style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px">下次结算</div>
              <div style="font-family:'Noto Serif SC', serif;font-size:24px;font-weight:700;margin-bottom:6px">2026-06-15</div>
              <div style="font-size:12px;color:var(--ink-3);margin-bottom:18px">还有 35 天</div>
              <div style="background:var(--bg-soft);border-radius:8px;padding:14px">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px">
                  <span style="color:var(--ink-3)">订阅分摊收益</span>
                  <span style="font-family:'JetBrains Mono', monospace;font-weight:600">¥${Math.round(monthEarning * 0.85).toLocaleString()}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px">
                  <span style="color:var(--ink-3)">推广位收益</span>
                  <span style="font-family:'JetBrains Mono', monospace;font-weight:600">¥${Math.round(monthEarning * 0.15).toLocaleString()}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:12px">
                  <span style="color:var(--ink-3)">平台抽成 (30%)</span>
                  <span style="font-family:'JetBrains Mono', monospace;font-weight:600;color:var(--danger)">-¥${Math.round(monthEarning * 0.43).toLocaleString()}</span>
                </div>
                <div style="height:1px;background:var(--line);margin:10px 0"></div>
                <div style="display:flex;justify-content:space-between;font-size:13px">
                  <span style="font-weight:700">实际到账</span>
                  <span style="font-family:'Noto Serif SC', serif;font-weight:700;color:var(--self)">¥${Math.round(monthEarning * 0.7).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3>我的工作流表现</h3>
            <span style="font-size:11px;color:var(--ink-3);font-family:'JetBrains Mono', monospace">${myWorkflows.length} 个工作流 / 提交</span>
          </div>
          ${myWorkflows.length === 0 ? `
            <div style="padding:40px;text-align:center;color:var(--ink-3);font-size:13px">还没有上架工作流</div>
          ` : `
            <table class="panel-table">
              <thead>
                <tr><th>工作流</th><th>类型</th><th>状态</th><th class="right">本月调用</th><th class="right">评分</th><th class="right">本月收益</th><th class="right">操作</th></tr>
              </thead>
              <tbody>
                ${myWorkflows.map(w => {
                  const clicks = getClickCount(w.id) + Math.floor(Math.random() * 8000 + 2000);
                  const wfEarn = Math.round(clicks * 0.85 * 0.7);
                  return `
                    <tr>
                      <td>
                        <div class="nm">${escapeHtml(w.name)}</div>
                        <div class="sub">${escapeHtml(w.category)} · ${escapeHtml((w.tags || []).join(', '))}</div>
                      </td>
                      <td><span class="badge-${w.type === 'self' ? 'self' : 'ad'}">${w.type === 'self' ? '自营' : '推荐'}</span></td>
                      <td><span class="${w.status === 'active' ? 'badge-active' : w.status === 'reviewing' ? 'badge-pending' : 'badge-rejected'}">${w.status === 'active' ? '已上架' : w.status === 'reviewing' ? '待审核' : '未通过'}</span></td>
                      <td class="right"><span class="num">${clicks.toLocaleString()}</span></td>
                      <td class="right"><span class="num">${w.rating} ⭐</span></td>
                      <td class="right"><span class="num" style="color:var(--self);font-weight:700">¥${wfEarn.toLocaleString()}</span></td>
                      <td class="right">
                        ${w._submission
                          ? `<button class="row-btn" onclick="showToast('提交正在审核中,通过后会生成正式工作流')">查看</button>`
                          : `<button class="row-btn" onclick="goToDetail('${w.id}')">查看</button>`
                        }
                        ${!w._submission && (w._creator || w.status === 'reviewing') ? `<button class="row-btn" onclick="openCreatorWfForm('${w.id}')">编辑</button>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
          <div class="panel" style="margin-bottom:0">
            <div class="panel-head"><h3>分账规则</h3></div>
            <div style="padding:18px;font-size:13px;color:var(--ink-2);line-height:1.7">
              <div style="margin-bottom:12px"><strong style="color:var(--self)">✓ 创作者分成 70%</strong></div>
              <div style="margin-bottom:12px">用户每月订阅费按「工作流调用次数加权」分配给创作者</div>
              <div style="font-family:'JetBrains Mono', monospace;font-size:12px;background:var(--bg-soft);padding:12px;border-radius:6px;line-height:1.6">
                创作者月收益 =<br>
                (该创作者工作流调用次数 ÷ 平台总调用) ×<br>
                当月订阅总收入 × 70%
              </div>
              <div style="font-size:11px;color:var(--ink-3);margin-top:12px">
                · 平台抽成 30%(对标 App Store)<br>
                · 月结,次月 15 号到账<br>
                · 最低提现门槛 ¥100
              </div>
            </div>
          </div>

          <div class="panel" style="margin-bottom:0">
            <div class="panel-head"><h3>最近结算记录</h3></div>
            <table class="panel-table">
              <thead><tr><th>月份</th><th class="right">收益</th><th class="right">状态</th></tr></thead>
              <tbody>
                <tr><td>2026 年 4 月</td><td class="right"><span class="num">¥${Math.round(monthEarning * 0.78).toLocaleString()}</span></td><td class="right"><span class="badge-active">已到账</span></td></tr>
                <tr><td>2026 年 3 月</td><td class="right"><span class="num">¥${Math.round(monthEarning * 0.65).toLocaleString()}</span></td><td class="right"><span class="badge-active">已到账</span></td></tr>
                <tr><td>2026 年 2 月</td><td class="right"><span class="num">¥${Math.round(monthEarning * 0.52).toLocaleString()}</span></td><td class="right"><span class="badge-active">已到账</span></td></tr>
                <tr><td>2026 年 1 月</td><td class="right"><span class="num">¥${Math.round(monthEarning * 0.41).toLocaleString()}</span></td><td class="right"><span class="badge-active">已到账</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderCreatorEarningChart() {
  const days = 30;
  const subscription = [];
  const promo = [];
  for (let i = 0; i < days; i++) {
    subscription.push(Math.floor(180 + i * 8 + Math.random() * 60));
    promo.push(Math.floor(40 + i * 1.2 + Math.random() * 20));
  }
  const w = 900, h = 220;
  const maxVal = Math.max(...subscription, ...promo);
  const pts = (arr) => arr.map((v, i) => `${i * (w / (days - 1))},${h - (v / maxVal) * (h - 30) - 10}`).join(' ');

  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:200px">
      <line x1="0" y1="40" x2="${w}" y2="40" stroke="#EFEEE9" stroke-width="1"/>
      <line x1="0" y1="110" x2="${w}" y2="110" stroke="#EFEEE9" stroke-width="1"/>
      <line x1="0" y1="180" x2="${w}" y2="180" stroke="#EFEEE9" stroke-width="1"/>
      <path d="M 0 ${h} L ${pts(subscription)} L ${w} ${h} Z" fill="#1A5D3A" fill-opacity="0.12"/>
      <polyline points="${pts(subscription)}" fill="none" stroke="#1A5D3A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${pts(promo)}" fill="none" stroke="#B85C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${(days - 1) * (w / (days - 1))}" cy="${h - (subscription[days - 1] / maxVal) * (h - 30) - 10}" r="4" fill="#1A5D3A"/>
      <circle cx="${(days - 1) * (w / (days - 1))}" cy="${h - (promo[days - 1] / maxVal) * (h - 30) - 10}" r="4" fill="#B85C00"/>
    </svg>
  `;
}

/* =============================================================
   AI 客服
   ============================================================= */
let chatbotOpen = false;

function toggleChatbot() {
  chatbotOpen = !chatbotOpen;
  const panel = document.getElementById('chatbot-panel');
  const fab = document.getElementById('chatbot-fab');
  panel.classList.toggle('show', chatbotOpen);
  // 打开时清除红点
  const badge = fab.querySelector('.chatbot-badge');
  if (chatbotOpen && badge) badge.style.display = 'none';
}

function askChatbot(q) {
  document.getElementById('chatbot-input').value = q;
  sendChatMsg();
}

function sendChatMsg() {
  const input = document.getElementById('chatbot-input');
  const text = input.value.trim();
  if (!text) return;
  const body = document.getElementById('chatbot-body');

  // 移除之前的建议
  body.querySelectorAll('.chat-suggestions').forEach(el => el.remove());

  // 用户消息
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.innerHTML = `<div class="chat-bubble">${escapeHtml(text)}</div>`;
  body.appendChild(userMsg);
  input.value = '';

  // 滚动到底
  body.scrollTop = body.scrollHeight;

  // 打字指示
  const typing = document.createElement('div');
  typing.className = 'chat-msg bot';
  typing.id = 'chat-typing';
  typing.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;

  // 模拟回复
  setTimeout(() => {
    typing.remove();
    const reply = getChatReply(text);
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.innerHTML = `<div class="chat-bubble">${reply.text}</div>`;
    body.appendChild(botMsg);

    // 如果有建议,加上
    if (reply.suggestions && reply.suggestions.length) {
      const sg = document.createElement('div');
      sg.className = 'chat-suggestions';
      sg.innerHTML = reply.suggestions.map(s => `<button class="chat-suggest" onclick="askChatbot('${s.replace(/'/g, "\\'")}')">${escapeHtml(s)}</button>`).join('');
      body.appendChild(sg);
    }

    body.scrollTop = body.scrollHeight;
  }, 800 + Math.random() * 400);
}

function getChatReply(q) {
  const lower = q.toLowerCase();
  if (lower.includes('pro') || lower.includes('升级') || lower.includes('订阅')) {
    return {
      text: '升级 Pro 非常简单 👍<br><br>1. 点右上角「升级 Pro」按钮<br>2. 选择月付(¥39)或年付(¥372,省 ¥96)<br>3. 微信 / 支付宝扫码支付<br>4. 立即解锁全场 120+ 工作流<br><br>需要我现在帮你打开订阅页吗?',
      suggestions: ['打开订阅页', 'Pro 和免费有什么区别', '年付能省多少']
    };
  }
  if (lower.includes('退订') || lower.includes('取消') || lower.includes('退款')) {
    return {
      text: '可以随时取消订阅,操作方式:<br><br>个人中心 → 订阅与账单 → 取消订阅<br><br>取消后:<br>• 当前周期内仍可使用 Pro 权益<br>• 周期结束后自动转为免费用户<br>• 不会再扣款<br>• 如需退款,联系人工客服',
      suggestions: ['联系人工客服', 'Pro 月费多少']
    };
  }
  if (lower.includes('上架') || lower.includes('创作者') || lower.includes('入驻') || lower.includes('工作流')) {
    return {
      text: '欢迎加入 FlowHub 创作者!🎨<br><br>上架流程:<br>1. 创作者后台 → 申请入驻(实名认证)<br>2. 添加工作流(URL / iframe / API 三种方式)<br>3. 填写元信息 + 设置定价<br>4. 提交审核(1-2 个工作日)<br><br>分账规则:创作者 70% / 平台 30%',
      suggestions: ['查看创作者后台', 'API 接入文档', '怎么算分账']
    };
  }
  if (lower.includes('picspark') || lower.includes('接入')) {
    return {
      text: '关于 PicSpark 接入 FlowHub:<br><br>因为 PicSpark 有自己的收费体系,推荐使用「URL 跳转 + Webhook 回调」模式。<br><br>核心步骤:<br>1. 配置归因参数识别(?from=flowhub)<br>2. 注册 Webhook 回调上报付费事件<br>3. 平台审核后上架<br><br>已经为你准备好了完整的接入向导!',
      suggestions: ['打开接入向导', '看代码示例', 'Webhook 怎么配置']
    };
  }
  if (lower.includes('多少') || lower.includes('价格') || lower.includes('多贵')) {
    return {
      text: '当前 FlowHub 定价:<br><br>• <strong>免费</strong>:¥0 / 月,50 次调用<br>• <strong>Pro</strong>:¥39 / 月,1000 次调用,全场工作流<br>• <strong>Team</strong>:¥99 / 人 / 月,5000 次调用,团队协作<br><br>所有方案都支持随时升级 / 降级。',
      suggestions: ['打开订阅页', 'Team 怎么开通']
    };
  }
  if (lower.includes('打开') && (lower.includes('订阅') || lower.includes('pro'))) {
    toggleChatbot();
    setTimeout(openPricing, 300);
    return { text: '好的,正在为你打开订阅方案页 ✨' };
  }
  if (lower.includes('打开') && lower.includes('向导')) {
    toggleChatbot();
    setTimeout(() => switchView('wizard'), 300);
    return { text: '好的,正在为你打开 PicSpark 接入向导 ✨' };
  }
  if (lower.includes('打开') && lower.includes('创作者')) {
    toggleChatbot();
    setTimeout(() => switchView('creator'), 300);
    return { text: '好的,正在为你打开创作者后台 ✨' };
  }
  if (lower.includes('你好') || lower.includes('hi') || lower.includes('hello')) {
    return {
      text: '你好!👋 我是 FlowHub 智能助手。我可以帮你:<br><br>• 解答订阅和支付问题<br>• 介绍工作流功能<br>• 引导创作者入驻<br>• 转接人工客服<br><br>有什么需要帮助的?',
      suggestions: ['Pro 价格是多少', '怎么上架工作流', '联系人工客服']
    };
  }
  if (lower.includes('人工') || lower.includes('客服')) {
    return {
      text: '正在为你转接人工客服 👨‍💼<br><br>工作日 9:00-21:00 · 通常 5 分钟内响应<br>邮箱: support@flowhub.cn<br>微信: flowhub-cs<br><br>夜间会有 AI 助手先帮你记录问题,工作人员上班后第一时间联系你。',
      suggestions: ['继续 AI 对话']
    };
  }
  // 默认
  return {
    text: '我可能没完全理解你的问题 🤔<br><br>你可以问我关于:订阅、付费、创作者入驻、接入流程的问题,或者直接转接人工客服。',
    suggestions: ['Pro 升级方法', '怎么上架工作流', '联系人工客服', 'PicSpark 接入']
  };
}

/* =============================================================
   主渲染
   ============================================================= */
function render() {
  document.body.classList.toggle('immersive-run', state.view === 'run');
  if (state.view === 'market') {
    renderMarket();
    setTimeout(startLiveFeed, 200);
  } else {
    if (liveFeedTimer) { clearInterval(liveFeedTimer); liveFeedTimer = null; }
  }

  if (state.view === 'detail') renderDetail();
  else if (state.view === 'run') renderRun();
  else if (state.view === 'search') renderSearch();
  else if (state.view === 'me') renderMe();
  else if (state.view === 'admin') renderAdmin();
  else if (state.view === 'creator') renderCreator();
  else if (state.view === 'advertiser') renderAdvertiser();
  else if (state.view === 'wizard') renderWizard();
  updateUserStatus();
  updateMobileTab();
  bindGlobalSearch();
}

// 快捷键
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    switchView('search');
    setTimeout(() => {
      const input = document.querySelector('#view-search #search-page-input, #view-search .cnav-search input');
      if (input) input.focus();
    }, 100);
  }
  if (e.key === 'Escape') closeModal();
});

// 初始化: 先用本地数据渲染, 再从 API 刷新
render();
loadDataFromAPI().then(() => { if (_apiLoaded) { render(); restoreSession(); } });

// 主题切换
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  if (window.FlowHubAuth?.setTheme) window.FlowHubAuth.setTheme(next);
  else localStorage.setItem('flowhub_theme', next);
  const cls = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  document.querySelectorAll('#theme-icon, #theme-icon-nav').forEach(el => { if (el) el.className = cls; });
}

(function() {
  const saved = window.FlowHubAuth?.getTheme ? window.FlowHubAuth.getTheme() : localStorage.getItem('flowhub_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    const cls = saved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    document.querySelectorAll('#theme-icon, #theme-icon-nav').forEach(el => { if (el) el.className = cls; });
  }
})();

function openFooterPage(page) {
  const pages = {
    about: { title: '关于我们', icon: 'fa-building', content: 'FlowHub 是国内领先的 AI 工作流聚合平台。我们致力于让每个人都能轻松使用 AI 工具提升工作效率。<br><br>成立于 2025 年,总部位于深圳,团队成员来自腾讯、字节跳动、阿里等知名科技公司。<br><br>联系邮箱:hello@flowhub.cn' },
    jobs: { title: '加入我们', icon: 'fa-users', content: '我们正在寻找有激情的伙伴加入!<br><br><b>开放岗位:</b><br>• 全栈工程师(Next.js / Node.js)<br>• AI 产品经理<br>• 增长运营<br>• UI/UX 设计师<br><br>简历投递:hr@flowhub.cn' },
    media: { title: '媒体合作', icon: 'fa-handshake', content: '如果你是媒体记者、自媒体博主或行业分析师,欢迎联系我们获取最新资讯和合作机会。<br><br>媒体联系:pr@flowhub.cn<br>商务合作:biz@flowhub.cn' },
    tutorial: { title: '使用教程', icon: 'fa-book-open', content: '<b>快速上手</b><br>1. 注册并登录 FlowHub 账号<br>2. 浏览市场,找到你需要的工作流<br>3. 点击「立即使用」开始体验<br>4. 升级 Pro 解锁全场工作流<br><br><b>常见问题</b><br>• Pro 会员包含哪些权益?— 全场自营工作流无限使用<br>• 如何申请退款?— 联系客服处理<br>• 支持团队版吗?— 即将上线' },
    blog: { title: '开发者博客', icon: 'fa-code', content: '<b>最新文章</b><br><br>📝 《FlowHub API 接入指南 v2.0》<br><span style="color:var(--ink-3)">2026-05-10</span><br><br>📝 《如何构建高质量的 AI 工作流》<br><span style="color:var(--ink-3)">2026-05-03</span><br><br>📝 《FlowHub 创作者激励计划发布》<br><span style="color:var(--ink-3)">2026-04-28</span><br><br>更多文章即将发布,敬请期待。' },
    terms: { title: '服务条款', icon: 'fa-file-contract', content: '<b>FlowHub 服务条款</b><br>最后更新:2026 年 5 月 1 日<br><br>欢迎使用 FlowHub 平台。使用本平台即表示你同意以下条款:<br><br>1. 账号安全:你有责任保管好自己的账号<br>2. 合理使用:禁止滥用平台资源或进行违法活动<br>3. 知识产权:平台内容受版权保护<br>4. 费用说明:订阅费用按月计费,可随时取消<br>5. 免责声明:平台不对第三方工作流的输出结果负责' },
    privacy: { title: '隐私协议', icon: 'fa-shield-halved', content: '<b>FlowHub 隐私政策</b><br>最后更新:2026 年 5 月 1 日<br><br>我们重视你的隐私。本政策说明我们如何收集和使用你的信息:<br><br>1. 信息收集:注册信息、使用数据、设备信息<br>2. 使用目的:提供服务、改善体验、安全保障<br>3. 信息共享:未经同意不会向第三方共享个人信息<br>4. 数据安全:采用行业标准加密措施<br>5. 你的权利:可随时查看、修改或删除个人信息' },
    cookie: { title: 'Cookie 设置', icon: 'fa-cookie-bite', content: '<b>Cookie 使用说明</b><br><br>FlowHub 使用以下类型的 Cookie:<br><br>🟢 <b>必要 Cookie</b> — 维持登录状态和基本功能<br>🟡 <b>分析 Cookie</b> — 帮助我们了解用户使用习惯<br>🔵 <b>功能 Cookie</b> — 记住你的偏好设置(如暗色模式)<br><br>你可以在浏览器设置中管理 Cookie 偏好。禁用必要 Cookie 可能影响平台正常使用。' }
  };
  const p = pages[page];
  if (!p) return;
  openModal(`
    <div style="padding:28px 32px;max-width:520px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:var(--self);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px"><i class="fas ${p.icon}"></i></div>
          <h2 style="font-size:20px;font-weight:700;font-family:'Noto Serif SC',serif">${p.title}</h2>
        </div>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <div style="font-size:14px;line-height:1.8;color:var(--ink-2)">${p.content}</div>
    </div>
  `);
}

// 在线试用(模拟执行)
function tryRunDemo(wfId) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf || !wf.examples || wf.examples.length === 0) return;

  const outputEl = document.getElementById('try-output-' + wfId);
  if (!outputEl) return;

  outputEl.classList.add('loading');
  outputEl.textContent = '';

  // 模拟生成 1.5 秒
  setTimeout(() => {
    outputEl.classList.remove('loading');
    const example = wf.examples[0];
    // 提取「输出」部分(如果输入输出分隔在 \n\n 后)
    const parts = example.text.split(/输出[::]/);
    const outputText = parts.length > 1 ? parts[1].trim() : example.text;
    outputEl.textContent = outputText;
  }, 1500);
}

function tryClearOutput(wfId) {
  const outputEl = document.getElementById('try-output-' + wfId);
  if (outputEl) {
    outputEl.classList.remove('loading');
    outputEl.textContent = '点击「试一下」查看示例输出';
  }
}

const IMAGE_VIDEO_PRESETS = {
  product: {
    prompt: '一瓶高端护肤精华在水面和柔光中旋转,透明玻璃质感,干净高级的电商广告画面',
    style: 'product',
    ratio: '9:16'
  },
  short: {
    prompt: '雨夜街角,年轻主角回头看向镜头,身后霓虹灯闪烁,悬疑短剧开场镜头',
    style: 'cinematic',
    ratio: '9:16'
  },
  poster: {
    prompt: '夏日音乐节主视觉海报,舞台灯光、人群剪影、强烈色彩冲击,适合动态海报',
    style: 'anime',
    ratio: '1:1'
  }
};

const IMAGE_VIDEO_STYLES = {
  cinematic: '电影感',
  product: '商品广告',
  anime: '动画分镜',
  realistic: '真实摄影'
};

let _imageVideoBoards = {};
let _ivDragState = null;
let _ivPanState = null;
let _ivHistory = {};
let _ivBoardsLoaded = false;
let _ivConnectionDraft = null;

let _ivBoardMemoryStore = {};
const IV_CANVAS = { width: 1900, height: 1000 };
const IV_NODE_SIZE = {
  config: { w: 210, h: 206 },
  shot: { w: 210, h: 266 },
  video: { w: 224, h: 224 },
  output: { w: 170, h: 258 },
  note: { w: 210, h: 120 }
};

function createEmptyIvBoard() {
  return {
    assets: [],
    shots: [],
    notes: [],
    connections: [],
    nodeStates: {},
    videoSettings: {
      prompt: '镜头连贯切换,保留主体一致性,光线和氛围逐步增强'
    },
    video: null,
    running: false,
    zoom: 1,
    grid: true,
    locked: false,
    tool: 'select',
    selectedNode: '',
    nodePositions: {
      config: { x: 100, y: 318 },
      video: { x: 820, y: 296 },
      output: { x: 1058, y: 286 }
    }
  };
}

function normalizeIvBoardPayload(board) {
  const source = board && typeof board === 'object' ? JSON.parse(JSON.stringify(board)) : {};
  const next = {
    ...createEmptyIvBoard(),
    ...source
  };
  next.assets = Array.isArray(source.assets) ? source.assets.filter(asset => asset && asset.id) : [];
  next.shots = Array.isArray(source.shots) ? source.shots.filter(shot => shot && shot.id && shot.assetId) : [];
  next.notes = Array.isArray(source.notes) ? source.notes.filter(note => note && note.id) : [];
  next.connections = Array.isArray(source.connections) ? source.connections.filter(conn => conn && conn.from && conn.to) : [];
  next.nodeStates = source.nodeStates && typeof source.nodeStates === 'object' ? source.nodeStates : {};
  next.videoSettings = source.videoSettings && typeof source.videoSettings === 'object' ? source.videoSettings : {};
  next.video = source.video && typeof source.video === 'object' ? source.video : null;
  next.running = false;
  next.nodePositions = source.nodePositions && typeof source.nodePositions === 'object' ? source.nodePositions : {};
  next.tool = ['select', 'pan'].includes(source.tool) ? source.tool : 'select';
  next.selectedNode = typeof source.selectedNode === 'string' ? source.selectedNode : '';
  ensureImageVideoBoardState(next);
  return next;
}

function loadIvBoardsFromStorage() {
  if (_ivBoardsLoaded) return;
  _ivBoardsLoaded = true;
  try {
    const parsed = _ivBoardMemoryStore;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    const loaded = {};
    Object.keys(parsed).forEach(wfId => {
      loaded[wfId] = normalizeIvBoardPayload(parsed[wfId]);
    });
    _imageVideoBoards = { ...loaded, ..._imageVideoBoards };
  } catch (err) {
    console.warn('Image video project storage load failed:', err);
  }
}

function saveIvBoardsToStorage(wfId) {
  try {
    const payload = {};
    Object.keys(_imageVideoBoards).forEach(id => {
      ensureImageVideoBoardState(_imageVideoBoards[id]);
      payload[id] = cloneIvBoard(_imageVideoBoards[id]);
    });
    _ivBoardMemoryStore = payload;
    markIvSaveStatus(wfId, '已保存', 'saved');
    return true;
  } catch (err) {
    console.warn('Image video project storage save failed:', err);
    markIvSaveStatus(wfId, '保存失败', 'error');
    showToast('项目太大,保存失败。建议先导出备份或减少本地图片数量。', true);
    return false;
  }
}

function persistIvBoard(wfId, options = {}) {
  const ok = saveIvBoardsToStorage(wfId);
  if (ok && !options.silent) showToast('项目已保存到本机');
  return ok;
}

function markIvSaveStatus(wfId, text, state = 'saved') {
  const el = document.getElementById('iv-save-status-' + wfId);
  if (!el) return;
  const icon = state === 'error'
    ? 'fa-circle-exclamation'
    : state === 'saving'
      ? 'fa-spinner fa-spin'
      : 'fa-check-circle';
  el.classList.toggle('err', state === 'error');
  el.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(text)}`;
}

function getImageVideoBoard(wfId) {
  loadIvBoardsFromStorage();
  if (!_imageVideoBoards[wfId]) {
    _imageVideoBoards[wfId] = createEmptyIvBoard();
  }
  ensureImageVideoBoardState(_imageVideoBoards[wfId]);
  return _imageVideoBoards[wfId];
}

function ensureImageVideoBoardState(board) {
  board.assets = board.assets || [];
  board.shots = board.shots || [];
  board.notes = board.notes || [];
  board.connections = Array.isArray(board.connections) ? board.connections : [];
  board.nodeStates = board.nodeStates && typeof board.nodeStates === 'object' ? board.nodeStates : {};
  board.videoSettings = board.videoSettings && typeof board.videoSettings === 'object' ? board.videoSettings : {};
  board.videoSettings.prompt = board.videoSettings.prompt || '镜头连贯切换,保留主体一致性,光线和氛围逐步增强';
  board.video = board.video || null;
  board.running = !!board.running;
  board.zoom = board.zoom || 1;
  board.grid = board.grid !== false;
  board.locked = !!board.locked;
  board.tool = board.tool || 'select';
  board.selectedNode = board.selectedNode || '';
  board.nodePositions = board.nodePositions || {};
  board.nodePositions.config = board.nodePositions.config || { x: 100, y: 318 };
  board.nodePositions.video = board.nodePositions.video || { x: 820, y: 296 };
  board.nodePositions.output = board.nodePositions.output || { x: 1058, y: 286 };
  board.shots.forEach((shot, index) => {
    if (typeof shot.x !== 'number') shot.x = 350 + index * 234;
    if (typeof shot.y !== 'number') shot.y = 268 + (index % 2) * 34;
  });
  board.notes.forEach((note, index) => {
    if (typeof note.x !== 'number') note.x = 330 + index * 36;
    if (typeof note.y !== 'number') note.y = 620 + index * 22;
  });
  syncIvWorkflowConnections(board);
}

function cloneIvBoard(board) {
  return JSON.parse(JSON.stringify({
    assets: board.assets,
    shots: board.shots,
    notes: board.notes,
    connections: board.connections,
    nodeStates: board.nodeStates,
    videoSettings: board.videoSettings,
    video: board.video,
    nodePositions: board.nodePositions,
    zoom: board.zoom,
    grid: board.grid,
    locked: board.locked,
    tool: board.tool,
    selectedNode: board.selectedNode
  }));
}

function getIvNodeKey(type, id) {
  return `${type}:${id}`;
}

function isIvWorkflowNodePresent(board, type, id) {
  if (type === 'config') return id === 'config';
  if (type === 'video') return id === 'video';
  if (type === 'output') return id === 'output' && !!board.video;
  if (type === 'shot') return board.shots.some(shot => shot.id === id);
  if (type === 'note') return board.notes.some(note => note.id === id);
  return false;
}

function makeIvConnection(fromType, fromId, toType, toId, status = 'idle') {
  return {
    id: `conn_${fromType}_${fromId}_${toType}_${toId}`.replace(/[^a-zA-Z0-9_]/g, '_'),
    from: { type: fromType, id: fromId, port: 'out' },
    to: { type: toType, id: toId, port: 'in' },
    status
  };
}

function getIvDefaultConnections(board) {
  const links = [];
  if (board.shots.length) {
    links.push(makeIvConnection('config', 'config', 'shot', board.shots[0].id));
    board.shots.forEach((shot, index) => {
      const next = board.shots[index + 1];
      if (next) links.push(makeIvConnection('shot', shot.id, 'shot', next.id));
    });
    links.push(makeIvConnection('shot', board.shots[board.shots.length - 1].id, 'video', 'video'));
  } else {
    links.push(makeIvConnection('config', 'config', 'video', 'video', 'pending'));
  }
  if (board.video) links.push(makeIvConnection('video', 'video', 'output', 'output', 'done'));
  return links;
}

function syncIvWorkflowConnections(board, options = {}) {
  const force = !!options.force;
  const defaults = getIvDefaultConnections(board);
  const valid = (board.connections || []).filter(conn =>
    conn.from && conn.to &&
    isIvWorkflowNodePresent(board, conn.from.type, conn.from.id) &&
    isIvWorkflowNodePresent(board, conn.to.type, conn.to.id)
  );
  const defaultIds = new Set(defaults.map(conn => conn.id));
  let next = force || !valid.length ? defaults : valid;
  if (!board.video) next = next.filter(conn => conn.to.type !== 'output' && conn.from.type !== 'output');
  board.connections = next.map(conn => ({
    ...conn,
    status: conn.status || (defaultIds.has(conn.id) ? 'idle' : 'custom')
  }));
}

function getIvNodeStatus(board, type, id) {
  const key = getIvNodeKey(type, id);
  return board.nodeStates[key] || 'idle';
}

function setIvNodeStatus(board, type, id, status) {
  board.nodeStates[getIvNodeKey(type, id)] = status;
}

function resetIvExecutionState(board) {
  board.running = false;
  board.nodeStates = {};
  (board.connections || []).forEach(conn => {
    conn.status = conn.status === 'custom' ? 'custom' : 'idle';
  });
}

function getIvNodeStatusLabel(status) {
  if (status === 'running') return '运行中';
  if (status === 'done') return '完成';
  if (status === 'error') return '失败';
  return '就绪';
}

function renderIvNodeState(board, type, id) {
  const status = getIvNodeStatus(board, type, id);
  return `<span class="iv-node-state ${status}">${getIvNodeStatusLabel(status)}</span>`;
}

function renderIvPort(wfId, type, id, port) {
  const active = _ivConnectionDraft &&
    _ivConnectionDraft.wfId === wfId &&
    _ivConnectionDraft.type === type &&
    _ivConnectionDraft.id === id &&
    _ivConnectionDraft.port === port;
  const title = port === 'out' ? '输出端口:点击后连接到下个节点' : '输入端口:接收上个节点输出';
  return `<button class="iv-node-port ${port} ${active ? 'active' : ''}" title="${title}" onclick="handleIvPortClick(event,'${wfId}','${type}','${id}','${port}')"></button>`;
}

function getIvNodeDisplayName(board, type, id) {
  if (type === 'config') return 'Image2Image 生图';
  if (type === 'video') return 'Grok Video-3 生视频';
  if (type === 'output') return '视频输出';
  if (type === 'shot') {
    const index = board.shots.findIndex(shot => shot.id === id);
    return index >= 0 ? `镜头 ${index + 1}` : '镜头';
  }
  if (type === 'note') return '文字备注';
  return type;
}

function getIvHistory(wfId) {
  if (!_ivHistory[wfId]) _ivHistory[wfId] = { undo: [], redo: [] };
  return _ivHistory[wfId];
}

function pushIvHistory(wfId) {
  const history = getIvHistory(wfId);
  history.undo.push(cloneIvBoard(getImageVideoBoard(wfId)));
  if (history.undo.length > 30) history.undo.shift();
  history.redo = [];
}

function restoreIvBoardSnapshot(wfId, snapshot) {
  _imageVideoBoards[wfId] = JSON.parse(JSON.stringify(snapshot));
  ensureImageVideoBoardState(_imageVideoBoards[wfId]);
  renderImageVideoCanvas(wfId);
  renderImageVideoAssets(wfId);
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
}

function undoIvCanvas(wfId) {
  const history = getIvHistory(wfId);
  if (!history.undo.length) return showToast('没有可撤销的操作', true);
  history.redo.push(cloneIvBoard(getImageVideoBoard(wfId)));
  restoreIvBoardSnapshot(wfId, history.undo.pop());
  showToast('已撤销');
}

function redoIvCanvas(wfId) {
  const history = getIvHistory(wfId);
  if (!history.redo.length) return showToast('没有可重做的操作', true);
  history.undo.push(cloneIvBoard(getImageVideoBoard(wfId)));
  restoreIvBoardSnapshot(wfId, history.redo.pop());
  showToast('已重做');
}

function saveIvProject(wfId) {
  markIvSaveStatus(wfId, '保存中', 'saving');
  persistIvBoard(wfId);
}

function exportIvProject(wfId) {
  const board = getImageVideoBoard(wfId);
  const wf = (getData().workflows || []).find(item => item.id === wfId);
  const payload = {
    type: 'flowhub.image2video.project',
    version: 1,
    workflow_id: wfId,
    workflow_name: wf ? wf.name : '',
    exported_at: new Date().toISOString(),
    board: cloneIvBoard(board)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flowhub-image2video-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast('项目 JSON 已导出');
}

function openIvProjectImport(wfId) {
  const input = document.getElementById('iv-project-file-' + wfId);
  if (input) input.click();
}

function handleIvProjectImport(event, wfId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      applyImportedIvProject(wfId, payload);
    } catch (err) {
      console.warn('Project import failed:', err);
      showToast('导入失败,请选择有效的 FlowHub 项目 JSON', true);
    } finally {
      event.target.value = '';
    }
  };
  reader.onerror = () => {
    showToast('读取文件失败', true);
    event.target.value = '';
  };
  reader.readAsText(file);
}

function applyImportedIvProject(wfId, payload) {
  const imported = payload && payload.board ? payload.board : payload;
  if (!imported || typeof imported !== 'object') {
    showToast('导入失败,项目结构不正确', true);
    return;
  }
  pushIvHistory(wfId);
  _imageVideoBoards[wfId] = normalizeIvBoardPayload(imported);
  _imageVideoBoards[wfId].tool = 'select';
  _imageVideoBoards[wfId].selectedNode = '';
  renderImageVideoCanvas(wfId);
  renderImageVideoAssets(wfId);
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('项目已导入');
}

function clearIvCanvas(wfId) {
  const board = getImageVideoBoard(wfId);
  if ((board.assets.length || board.shots.length || board.notes.length || board.video) && !confirm('确定清空当前画布项目吗?')) return;
  pushIvHistory(wfId);
  _imageVideoBoards[wfId] = createEmptyIvBoard();
  renderImageVideoCanvas(wfId);
  renderImageVideoAssets(wfId);
  renderImageVideoPreviewBox(wfId, { empty: true });
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('画布已清空');
}

function applyImageVideoPreset(wfId, presetId) {
  const preset = IMAGE_VIDEO_PRESETS[presetId];
  if (!preset) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('iv-prompt-' + wfId, preset.prompt);
  set('iv-style-' + wfId, preset.style);
  set('iv-ratio-' + wfId, preset.ratio);
  showToast('已填入创作样例');
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function getImageVideoGradient(prompt, style) {
  const palettes = {
    cinematic: [['#101820', '#1A5D3A', '#D8A24A'], ['#0F0F0E', '#4B2E83', '#CFAF6A']],
    product: [['#E9F4EF', '#B7D7C6', '#F4B183'], ['#F7F2E8', '#C6D4C1', '#C88B5A']],
    anime: [['#2E1065', '#DB2777', '#FDE68A'], ['#0F172A', '#2563EB', '#F9A8D4']],
    realistic: [['#D7D2C8', '#7C8C75', '#2E2A24'], ['#E6E1D8', '#8A9A8D', '#CBB79D']]
  };
  const list = palettes[style] || palettes.cinematic;
  const colors = list[hashText(prompt) % list.length];
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 52%, ${colors[2]} 100%)`;
}

function summarizePrompt(prompt) {
  const clean = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '未命名镜头';
  return clean.length > 18 ? clean.slice(0, 18) + '...' : clean;
}

function appendIvMessage(wfId, type, text) {
  const assets = document.getElementById('iv-assets-' + wfId);
  if (!assets) return;
  assets.insertAdjacentHTML('beforebegin', `<div class="iv-msg ${type}">${escapeHtml(text)}</div>`);
  const chat = document.getElementById('iv-chat-' + wfId);
  if (chat) chat.scrollTop = chat.scrollHeight;
}

function renderIvAssetCard(wfId, asset) {
  return `
    <div class="iv-asset-card" draggable="true" ondragstart="handleIvDragStart(event,'${wfId}','${asset.id}')">
      <div class="iv-asset-preview" data-scene="${escapeHtml(asset.title)}" style="background:${asset.bg}"></div>
      <div class="iv-asset-body">
        <div>
          <strong>${escapeHtml(asset.title)}</strong>
          <span>${escapeHtml(asset.styleLabel)} · ${escapeHtml(asset.ratio)}</span>
        </div>
      </div>
      <div class="iv-asset-actions">
        <button class="iv-mini-btn" onclick="addImageAssetToCanvas('${wfId}','${asset.id}')">加入画布</button>
        <button class="iv-mini-btn" onclick="generateVideo3Preview('${wfId}')">生视频</button>
        <button class="iv-mini-btn" onclick="showToast('已进入继续优化模式')">继续优化</button>
      </div>
    </div>
  `;
}

function renderIvVideoChatCard(wfId) {
  const board = getImageVideoBoard(wfId);
  if (!board.video) return '';
  const firstShot = board.shots[0];
  const firstAsset = firstShot ? board.assets.find(item => item.id === firstShot.assetId) : null;
  const ratio = board.video.ratio || getRunnerValue('iv-ratio-' + wfId, '9:16');
  const resolution = ratio === '16:9' ? '1280 x 720' : ratio === '1:1' ? '1024 x 1024' : '720 x 1280';
  return `
    <div class="iv-video-chat-card">
      <div class="iv-video-chat-thumb" style="background:${firstAsset ? firstAsset.bg : 'linear-gradient(135deg,#0F0F0E,#1A5D3A)'}"></div>
      <div class="iv-video-chat-copy">
        <strong>Grok Video-3 生视频</strong>
        <p>时长: ${escapeHtml(board.video.duration)}s　分辨率: ${escapeHtml(resolution)}<br>提示词: 镜头连贯切换,光线和氛围逐步增强。</p>
      </div>
      <div class="iv-asset-actions">
        <button class="iv-mini-btn" onclick="generateVideo3Preview('${wfId}')">生视频</button>
        <button class="iv-mini-btn" onclick="showToast('视频输出节点已在画布中')">加入画布</button>
        <button class="iv-mini-btn" onclick="showToast('已进入继续优化模式')">继续优化</button>
      </div>
    </div>
  `;
}

function renderImageVideoAssets(wfId) {
  const board = getImageVideoBoard(wfId);
  const el = document.getElementById('iv-assets-' + wfId);
  if (!el) return;
  el.innerHTML = board.assets.map(asset => renderIvAssetCard(wfId, asset)).join('') + renderIvVideoChatCard(wfId);
  const chat = document.getElementById('iv-chat-' + wfId);
  if (chat) chat.scrollTop = chat.scrollHeight;
}

function generateImage2Asset(wfId) {
  const prompt = getRunnerValue('iv-prompt-' + wfId, IMAGE_VIDEO_PRESETS.short.prompt);
  const style = getRunnerValue('iv-style-' + wfId, 'cinematic');
  const ratio = getRunnerValue('iv-ratio-' + wfId, '9:16');
  if (prompt.length < 8) {
    showToast('画面描述太短,请写具体一点', true);
    return;
  }

  const btn = document.getElementById('iv-image-btn-' + wfId);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中';
  }
  appendIvMessage(wfId, 'user', prompt);
  recordWorkflowClick(getData(), wfId, { source: 'image2_generation' });

  setTimeout(() => {
    const board = getImageVideoBoard(wfId);
    const asset = {
      id: 'asset_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      prompt,
      title: summarizePrompt(prompt),
      style,
      styleLabel: IMAGE_VIDEO_STYLES[style] || style,
      ratio,
      bg: getImageVideoGradient(prompt, style),
      created_at: new Date().toISOString()
    };
    board.assets.unshift(asset);
    board.assets = board.assets.slice(0, 8);
    renderImageVideoAssets(wfId);
    persistIvBoard(wfId, { silent: true });
    appendIvMessage(wfId, 'bot', 'Image2 已生成关键帧。你可以拖到左侧画布,或点击「加入画布」。');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-image"></i> 生成图片';
    }
    showToast('关键帧已生成');
  }, 650);
}

function handleIvDragStart(event, wfId, assetId) {
  event.dataTransfer.setData('text/plain', assetId);
  event.dataTransfer.setData('application/x-flowhub-wf', wfId);
  event.dataTransfer.effectAllowed = 'copy';
}

function handleIvDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  event.currentTarget.classList.add('drag-over');
}

function handleIvDragLeave(event) {
  event.currentTarget.classList.remove('drag-over');
}

function handleIvDrop(event, wfId) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const point = getIvCanvasPoint(event, wfId);
  const files = Array.from(event.dataTransfer.files || []).filter(file => file.type && file.type.startsWith('image/'));
  if (files.length) {
    importIvImageFiles(wfId, files, point);
    return;
  }

  const assetId = event.dataTransfer.getData('text/plain');
  const board = getImageVideoBoard(wfId);
  if (assetId && board.assets.some(asset => asset.id === assetId)) {
    addImageAssetToCanvas(wfId, assetId, point);
    return;
  }

  const imageUrl = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
  if (/^(https?:|data:image\/)/i.test(imageUrl || '')) {
    pushIvHistory(wfId);
    createExternalImageAsset(wfId, imageUrl.trim(), '外部拖入图片', point);
    return;
  }
  showToast('请拖入图片文件或右侧生成结果', true);
}

function openIvImageUpload(wfId) {
  const input = document.getElementById('iv-file-' + wfId);
  if (input) input.click();
}

function handleIvFileInput(event, wfId) {
  const files = Array.from(event.target.files || []).filter(file => file.type && file.type.startsWith('image/'));
  if (files.length) {
    importIvImageFiles(wfId, files, { x: 390, y: 360 });
  }
  event.target.value = '';
}

function importIvImageFiles(wfId, files, point) {
  pushIvHistory(wfId);
  files.slice(0, 6).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      createExternalImageAsset(wfId, reader.result, file.name || '本地图片', {
        x: point.x + index * 34,
        y: point.y + index * 28
      }, { skipHistory: true });
    };
    reader.readAsDataURL(file);
  });
}

function createExternalImageAsset(wfId, src, name, point, options = {}) {
  const board = getImageVideoBoard(wfId);
  const title = summarizePrompt(String(name || '外部图片').replace(/\.[^.]+$/, ''));
  const asset = {
    id: 'asset_upload_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    prompt: name || '外部拖入图片',
    title,
    style: 'uploaded',
    styleLabel: '上传图片',
    ratio: '原图',
    bg: `url("${String(src).replace(/"/g, '%22')}") center / cover`,
    created_at: new Date().toISOString()
  };
  board.assets.unshift(asset);
  board.assets = board.assets.slice(0, 12);
  addImageAssetToCanvas(wfId, asset.id, point, { skipHistory: true });
  renderImageVideoAssets(wfId);
  persistIvBoard(wfId, { silent: true });
  appendIvMessage(wfId, 'bot', `已导入图片「${title}」,并放到左侧自由画布。`);
  showToast('图片已拖入画布');
}

function renderImageVideoPreviewBox(wfId, options = {}) {
  const board = getImageVideoBoard(wfId);
  const videoBox = document.getElementById('iv-video-' + wfId);
  if (!videoBox) return;
  if (!board.video) {
    if (options.empty) {
      videoBox.innerHTML = '<div class="iv-video-empty">画布里至少 2 个镜头后,可以生成视频预览</div>';
    }
    return;
  }
  const firstShot = board.shots[0] || null;
  const firstAsset = firstShot ? board.assets.find(item => item.id === firstShot.assetId) : null;
  videoBox.innerHTML = `
    <div class="iv-video-result">
      <div class="iv-video-thumb" style="background:${firstAsset ? firstAsset.bg : 'linear-gradient(135deg,#0F0F0E,#1A5D3A)'}"></div>
      <div class="iv-video-copy">
        <h5>视频预览已生成</h5>
        <p>${board.shots.length} 个镜头 · ${escapeHtml(board.video.duration)}s · ${escapeHtml(board.video.ratio)}<br>当前为 Grok Video-3 生成链路占位,后续可替换真实 API 返回的视频 URL。</p>
        <div class="try-actions">
          <button class="try-btn primary" onclick="showToast('演示版暂不提供下载')"><i class="fas fa-play"></i> 预览</button>
          <button class="try-btn" onclick="generateVideo3Preview('${wfId}')">重新生成</button>
        </div>
      </div>
    </div>
  `;
}

function resetImageVideoPreview(wfId) {
  const board = getImageVideoBoard(wfId);
  board.video = null;
  resetIvExecutionState(board);
  syncIvWorkflowConnections(board, { force: true });
  renderImageVideoPreviewBox(wfId, { empty: true });
  renderImageVideoAssets(wfId);
}

function getIvCanvasPoint(event, wfId) {
  const board = getImageVideoBoard(wfId);
  const canvas = document.getElementById('iv-canvas-' + wfId);
  if (!canvas) return { x: 360, y: 270 };
  const rect = canvas.getBoundingClientRect();
  const zoom = board.zoom || 1;
  const x = (event.clientX - rect.left + canvas.scrollLeft) / zoom;
  const y = (event.clientY - rect.top + canvas.scrollTop) / zoom;
  return {
    x: Math.max(80, Math.min(IV_CANVAS.width - 260, x - 105)),
    y: Math.max(110, Math.min(IV_CANVAS.height - 320, y - 120))
  };
}

function getIvNodeRects(board, excludeKey = '') {
  const rects = [
    { key: 'config:config', type: 'config', ...board.nodePositions.config },
    { key: 'video:video', type: 'video', ...board.nodePositions.video },
    ...(board.video ? [{ key: 'output:output', type: 'output', ...board.nodePositions.output }] : []),
    ...board.shots.map(shot => ({ key: 'shot:' + shot.id, type: 'shot', x: shot.x, y: shot.y })),
    ...board.notes.map(note => ({ key: 'note:' + note.id, type: 'note', x: note.x, y: note.y }))
  ].filter(rect => rect.key !== excludeKey);
  return rects.map(rect => {
    const size = getIvNodeSize(rect.type);
    return { ...rect, w: size.w, h: size.h };
  });
}

function rectsOverlap(a, b, gap = 22) {
  return !(
    a.x + a.w + gap < b.x ||
    b.x + b.w + gap < a.x ||
    a.y + a.h + gap < b.y ||
    b.y + b.h + gap < a.y
  );
}

function findIvOpenPosition(board, desired, type, excludeKey = '') {
  const size = getIvNodeSize(type);
  const base = {
    x: Math.max(60, Math.min(IV_CANVAS.width - size.w - 60, desired.x)),
    y: Math.max(88, Math.min(IV_CANVAS.height - size.h - 50, desired.y))
  };
  const occupied = getIvNodeRects(board, excludeKey);
  const offsets = [
    [0, 0], [34, 34], [-34, 34], [58, -38], [-58, -38],
    [112, 0], [-112, 0], [0, 112], [0, -112],
    [154, 72], [-154, 72], [154, -72], [-154, -72],
    [238, 0], [0, 190], [238, 116]
  ];
  for (const [dx, dy] of offsets) {
    const candidate = {
      x: Math.max(60, Math.min(IV_CANVAS.width - size.w - 60, base.x + dx)),
      y: Math.max(88, Math.min(IV_CANVAS.height - size.h - 50, base.y + dy)),
      w: size.w,
      h: size.h
    };
    if (!occupied.some(rect => rectsOverlap(candidate, rect))) return { x: candidate.x, y: candidate.y };
  }
  const index = occupied.length;
  return {
    x: Math.max(60, Math.min(IV_CANVAS.width - size.w - 60, 360 + (index % 4) * 238)),
    y: Math.max(88, Math.min(IV_CANVAS.height - size.h - 50, 250 + Math.floor(index / 4) * 206))
  };
}

function getIvDefaultShotPosition(board) {
  const index = board.shots.length;
  return findIvOpenPosition(board, {
    x: 350 + index * 234,
    y: 260 + (index % 2) * 34
  }, 'shot');
}

function reflowIvSystemNodesForShots(board, shotCount) {
  const lastShotX = shotCount > 0 ? 350 + (shotCount - 1) * 234 : 350;
  const videoX = Math.max(820, lastShotX + 236);
  board.nodePositions.video = {
    x: Math.min(IV_CANVAS.width - IV_NODE_SIZE.video.w - 80, videoX),
    y: board.nodePositions.video.y || 296
  };
  board.nodePositions.output = {
    x: Math.min(IV_CANVAS.width - IV_NODE_SIZE.output.w - 80, board.nodePositions.video.x + 238),
    y: board.nodePositions.output.y || 286
  };
}

function addImageAssetToCanvas(wfId, assetId, point, options = {}) {
  const board = getImageVideoBoard(wfId);
  const asset = board.assets.find(item => item.id === assetId);
  if (!asset) return;
  if (!options.skipHistory) pushIvHistory(wfId);
  resetImageVideoPreview(wfId);
  if (!point) reflowIvSystemNodesForShots(board, board.shots.length + 1);
  const pos = findIvOpenPosition(board, point || getIvDefaultShotPosition(board), 'shot');
  board.shots.push({
    id: 'shot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    assetId,
    duration: board.shots.length === 0 ? 2.5 : 2,
    motion: board.shots.length === 0 ? 'push in' : 'match cut',
    x: pos.x,
    y: pos.y
  });
  syncIvWorkflowConnections(board, { force: true });
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('已加入镜头画布');
}

function removeIvShot(wfId, shotId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.shots = board.shots.filter(shot => shot.id !== shotId);
  resetImageVideoPreview(wfId);
  syncIvWorkflowConnections(board, { force: true });
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
}

function getIvNodePosition(board, type, id) {
  if (type === 'shot') return board.shots.find(shot => shot.id === id);
  if (type === 'note') return board.notes.find(note => note.id === id);
  return board.nodePositions[type];
}

function getIvNodeSize(type) {
  return IV_NODE_SIZE[type] || IV_NODE_SIZE.shot;
}

function setIvNodePosition(board, type, id, x, y) {
  const size = getIvNodeSize(type);
  const nx = Math.max(40, Math.min(IV_CANVAS.width - size.w - 40, x));
  const ny = Math.max(70, Math.min(IV_CANVAS.height - size.h - 40, y));
  const node = getIvNodePosition(board, type, id);
  if (node) {
    node.x = nx;
    node.y = ny;
  }
  return { x: nx, y: ny };
}

function getIvNodeCenter(board, type, id, side = 'right') {
  const pos = getIvNodePosition(board, type, id);
  const size = getIvNodeSize(type);
  if (!pos) return { x: 0, y: 0 };
  return {
    x: pos.x + (side === 'left' ? 0 : size.w),
    y: pos.y + size.h * 0.46
  };
}

function getIvWorkflowLinks(board) {
  syncIvWorkflowConnections(board);
  return board.connections.map(conn => ({
    id: conn.id,
    from: [conn.from.type, conn.from.id],
    to: [conn.to.type, conn.to.id],
    status: conn.status || 'idle',
    pending: conn.status === 'pending' || (!board.video && conn.to.type === 'output')
  }));
}

function renderIvLinkSvg(wfId) {
  const board = getImageVideoBoard(wfId);
  return getIvWorkflowLinks(board).map(link => {
    const from = getIvNodeCenter(board, link.from[0], link.from[1], 'right');
    const to = getIvNodeCenter(board, link.to[0], link.to[1], 'left');
    const mid = Math.max(from.x + 50, (from.x + to.x) / 2);
    const d = `M ${from.x} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${to.x} ${to.y}`;
    const cls = `${link.pending ? 'pending' : ''} ${escapeHtml(link.status || '')}`;
    const deleteX = (from.x + to.x) / 2;
    const deleteY = (from.y + to.y) / 2 - 15;
    return `
      <path class="iv-link-hit" d="${d}" onclick="removeIvConnection(event,'${wfId}','${link.id}')"></path>
      <path class="iv-link-path ${cls}" d="${d}"></path>
      <circle class="iv-link-dot ${escapeHtml(link.status || '')}" cx="${from.x}" cy="${from.y}" r="5"></circle>
      <circle class="iv-link-dot ${escapeHtml(link.status || '')}" cx="${to.x}" cy="${to.y}" r="5"></circle>
      <g class="iv-link-remove" onclick="removeIvConnection(event,'${wfId}','${link.id}')" title="删除连接">
        <circle cx="${deleteX}" cy="${deleteY}" r="10"></circle>
        <text x="${deleteX}" y="${deleteY}">×</text>
      </g>
    `;
  }).join('');
}

function handleIvPortClick(event, wfId, type, id, port) {
  event.preventDefault();
  event.stopPropagation();
  const board = getImageVideoBoard(wfId);
  if (board.locked) return showToast('画布已锁定,先关闭锁定再连接节点', true);
  if (port === 'out') {
    _ivConnectionDraft = { wfId, type, id, port };
    renderImageVideoCanvas(wfId);
    showToast('已选择输出端口,点击下个节点的输入端口完成连接');
    return;
  }
  if (!_ivConnectionDraft || _ivConnectionDraft.wfId !== wfId) {
    showToast('请先点击一个输出端口', true);
    return;
  }
  if (_ivConnectionDraft.type === type && _ivConnectionDraft.id === id) {
    showToast('不能连接到同一个节点', true);
    return;
  }
  pushIvHistory(wfId);
  const conn = makeIvConnection(_ivConnectionDraft.type, _ivConnectionDraft.id, type, id);
  board.connections = (board.connections || []).filter(item => item.id !== conn.id && !(item.to.type === type && item.to.id === id));
  board.connections.push(conn);
  _ivConnectionDraft = null;
  board.video = null;
  resetIvExecutionState(board);
  renderImageVideoPreviewBox(wfId, { empty: true });
  renderImageVideoAssets(wfId);
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('节点已连接');
}

function removeIvConnection(event, wfId, connId) {
  event.preventDefault();
  event.stopPropagation();
  const board = getImageVideoBoard(wfId);
  if (board.locked) return showToast('画布已锁定,先关闭锁定再删除连接', true);
  const conn = board.connections.find(item => item.id === connId);
  if (!conn) return;
  pushIvHistory(wfId);
  board.connections = board.connections.filter(item => item.id !== connId);
  board.video = null;
  resetIvExecutionState(board);
  renderImageVideoPreviewBox(wfId, { empty: true });
  renderImageVideoAssets(wfId);
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('连接已删除');
}

function redrawIvLinks(wfId) {
  const layer = document.getElementById('iv-links-' + wfId);
  if (layer) layer.innerHTML = renderIvLinkSvg(wfId);
  updateIvMinimap(wfId);
}

function startIvNodeDrag(event, wfId, type, id) {
  if (event.button !== 0 || event.target.closest('button, input, select, textarea')) return;
  const board = getImageVideoBoard(wfId);
  if (board.locked) return showToast('画布已锁定,先关闭锁定再移动节点', true);
  const pos = getIvNodePosition(board, type, id);
  if (!pos) return;
  pushIvHistory(wfId);
  board.selectedNode = type + ':' + id;
  document.querySelectorAll('#iv-canvas-' + wfId + ' .iv-draggable-node').forEach(node => node.classList.remove('selected'));
  event.currentTarget.classList.add('selected', 'dragging');
  _ivDragState = {
    wfId,
    type,
    id,
    element: event.currentTarget,
    startX: event.clientX,
    startY: event.clientY,
    originX: pos.x,
    originY: pos.y,
    zoom: board.zoom || 1
  };
  event.preventDefault();
}

function startIvCanvasPan(event, wfId) {
  if (event.button !== 0 || event.target.closest('.iv-draggable-node, button, input, select, textarea')) return;
  const board = getImageVideoBoard(wfId);
  if (board.tool !== 'pan') return;
  const canvas = document.getElementById('iv-canvas-' + wfId);
  if (!canvas) return;
  _ivPanState = {
    wfId,
    canvas,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: canvas.scrollLeft,
    scrollTop: canvas.scrollTop
  };
  canvas.classList.add('panning');
  event.preventDefault();
}

function moveIvNodeDrag(event) {
  if (!_ivDragState) return;
  const board = getImageVideoBoard(_ivDragState.wfId);
  const dx = (event.clientX - _ivDragState.startX) / _ivDragState.zoom;
  const dy = (event.clientY - _ivDragState.startY) / _ivDragState.zoom;
  const pos = setIvNodePosition(board, _ivDragState.type, _ivDragState.id, _ivDragState.originX + dx, _ivDragState.originY + dy);
  _ivDragState.element.style.left = pos.x + 'px';
  _ivDragState.element.style.top = pos.y + 'px';
  redrawIvLinks(_ivDragState.wfId);
}

function moveIvCanvasPan(event) {
  if (!_ivPanState) return;
  _ivPanState.canvas.scrollLeft = _ivPanState.scrollLeft - (event.clientX - _ivPanState.startX);
  _ivPanState.canvas.scrollTop = _ivPanState.scrollTop - (event.clientY - _ivPanState.startY);
}

function endIvNodeDrag() {
  if (!_ivDragState) return;
  _ivDragState.element.classList.remove('dragging');
  renderImageVideoCanvas(_ivDragState.wfId);
  persistIvBoard(_ivDragState.wfId, { silent: true });
  _ivDragState = null;
}

function endIvCanvasPan() {
  if (!_ivPanState) return;
  _ivPanState.canvas.classList.remove('panning');
  _ivPanState = null;
}

document.addEventListener('pointermove', (event) => {
  moveIvNodeDrag(event);
  moveIvCanvasPan(event);
});
document.addEventListener('pointerup', () => {
  endIvNodeDrag();
  endIvCanvasPan();
});

function renderImageVideoCanvas(wfId) {
  const board = getImageVideoBoard(wfId);
  const canvas = document.getElementById('iv-canvas-' + wfId);
  if (!canvas) return;

  const firstShot = board.shots[0] || null;
  const firstAsset = firstShot ? board.assets.find(item => item.id === firstShot.assetId) : null;
  const prompt = firstAsset ? firstAsset.prompt : getRunnerValue('iv-prompt-' + wfId, IMAGE_VIDEO_PRESETS.short.prompt);
  const styleLabel = firstAsset ? firstAsset.styleLabel : IMAGE_VIDEO_STYLES[getRunnerValue('iv-style-' + wfId, 'cinematic')];
  const ratio = firstAsset ? firstAsset.ratio : getRunnerValue('iv-ratio-' + wfId, '9:16');
  const videoPrompt = board.videoSettings.prompt;
  const configPos = board.nodePositions.config;
  const videoPos = board.nodePositions.video;
  const outputPos = board.nodePositions.output;
  const selected = board.selectedNode || '';
  canvas.classList.toggle('no-grid', !board.grid);
  canvas.classList.toggle('iv-canvas-locked', !!board.locked);

  const configNode = `
    <div class="iv-flow-node config-node iv-draggable-node ${selected === 'config:config' ? 'selected' : ''}" style="left:${configPos.x}px;top:${configPos.y}px" onpointerdown="startIvNodeDrag(event,'${wfId}','config','config')">
      <div class="iv-flow-card status-${getIvNodeStatus(board, 'config', 'config')}">
        <div class="iv-node-head">
          <span class="iv-node-index">1</span>
          <strong>Image2Image 生图</strong>
          ${renderIvNodeState(board, 'config', 'config')}
          <span class="iv-node-grip">••</span>
        </div>
        <div class="iv-node-body">
          <div class="iv-node-row"><span>模型</span><span class="iv-node-pill">Image2</span></div>
          <div class="iv-node-row"><span>风格</span><span class="iv-node-pill">${escapeHtml(styleLabel || '电影感')}</span></div>
          <div class="iv-node-row"><span>提示词</span><span class="iv-node-pill">${escapeHtml(summarizePrompt(prompt))}</span></div>
          <div class="iv-node-row"><span>尺寸</span><span class="iv-node-pill">${escapeHtml(ratio)}</span></div>
        </div>
      </div>
      ${renderIvPort(wfId, 'config', 'config', 'out')}
    </div>
  `;

  const shotNodes = board.shots.map((shot, index) => {
    const asset = board.assets.find(item => item.id === shot.assetId);
    if (!asset) return '';
    return `
      <div class="iv-shot-node iv-draggable-node ${selected === 'shot:' + shot.id ? 'selected' : ''}" style="left:${shot.x}px;top:${shot.y}px" onpointerdown="startIvNodeDrag(event,'${wfId}','shot','${shot.id}')">
        ${renderIvPort(wfId, 'shot', shot.id, 'in')}
        <div class="iv-shot-card status-${getIvNodeStatus(board, 'shot', shot.id)}">
          <div class="iv-node-head">
            <span class="iv-node-index">${index + 2}</span>
            <strong>生成图片</strong>
            ${renderIvNodeState(board, 'shot', shot.id)}
            <span class="iv-node-grip">••</span>
          </div>
          <div class="iv-shot-preview" data-scene="${escapeHtml(asset.title)}" style="background:${asset.bg}"></div>
          <div class="iv-shot-body">
            <div class="iv-shot-title">镜头 ${index + 1}</div>
            <div class="iv-shot-meta">${escapeHtml(shot.duration)}s · ${escapeHtml(shot.motion)}</div>
            <div class="iv-shot-actions">
              <button class="iv-mini-btn" onclick="editIvShotNode(event,'${wfId}','${shot.id}')">参数</button>
              <button class="iv-mini-btn" onclick="removeIvShot('${wfId}','${shot.id}')">移除</button>
              <button class="iv-mini-btn" onclick="duplicateIvShot('${wfId}','${shot.id}')">复制</button>
            </div>
          </div>
        </div>
        ${renderIvPort(wfId, 'shot', shot.id, 'out')}
      </div>
    `;
  }).join('');

  const videoNode = `
    <div class="iv-flow-node video-node iv-draggable-node ${selected === 'video:video' ? 'selected' : ''}" style="left:${videoPos.x}px;top:${videoPos.y}px" onpointerdown="startIvNodeDrag(event,'${wfId}','video','video')">
      ${renderIvPort(wfId, 'video', 'video', 'in')}
      <div class="iv-flow-card video status-${getIvNodeStatus(board, 'video', 'video')}">
        <div class="iv-node-head">
          <span class="iv-node-index">${board.shots.length + 2}</span>
          <strong>Grok Video-3 生视频</strong>
          ${renderIvNodeState(board, 'video', 'video')}
          <span class="iv-node-grip">••</span>
        </div>
        <div class="iv-node-body">
          <div class="iv-node-row"><span>模型</span><span class="iv-node-pill">Grok Video-3</span></div>
          <div class="iv-node-row"><span>输入图像</span><span class="iv-node-pill">${board.shots.length} 张关键帧</span></div>
          <div class="iv-node-row"><span>提示词</span><span class="iv-node-pill">${escapeHtml(videoPrompt)}</span></div>
          <div class="iv-node-row"><span>时长</span><span class="iv-node-pill">${board.video ? escapeHtml(board.video.duration + 's') : '待生成'}</span></div>
          <div class="iv-node-row"><span>分辨率</span><span class="iv-node-pill">${escapeHtml(ratio === '16:9' ? '1280 x 720' : ratio === '1:1' ? '1024 x 1024' : '720 x 1280')}</span></div>
          <button class="iv-mini-btn" onclick="editIvVideoNode(event,'${wfId}')">编辑视频参数</button>
        </div>
      </div>
      ${renderIvPort(wfId, 'video', 'video', 'out')}
    </div>
  `;

  const outputAsset = board.video ? (board.assets.find(item => item.id === board.video.firstAssetId) || firstAsset) : null;
  const outputNode = board.video ? `
      <div class="iv-flow-node output-node iv-draggable-node ${selected === 'output:output' ? 'selected' : ''}" style="left:${outputPos.x}px;top:${outputPos.y}px" onpointerdown="startIvNodeDrag(event,'${wfId}','output','output')">
        ${renderIvPort(wfId, 'output', 'output', 'in')}
        <div class="iv-flow-card output status-${getIvNodeStatus(board, 'output', 'output')}">
          <div class="iv-node-head">
            <span class="iv-node-index">${board.shots.length + 3}</span>
            <strong>视频输出</strong>
            ${renderIvNodeState(board, 'output', 'output')}
            <span class="iv-node-grip">••</span>
          </div>
          <div class="iv-shot-preview" data-scene="${escapeHtml(outputAsset ? outputAsset.title : '视频预览')}" style="background:${outputAsset ? outputAsset.bg : 'linear-gradient(135deg,#0F0F0E,#1A5D3A)'}"></div>
          <div class="iv-node-body">
            <div class="iv-node-row"><span>格式</span><span class="iv-node-pill">MP4 预览</span></div>
            <div class="iv-node-row"><span>时长</span><span class="iv-node-pill">${escapeHtml(board.video.duration)}s</span></div>
            <div class="iv-node-row"><span>比例</span><span class="iv-node-pill">${escapeHtml(board.video.ratio)}</span></div>
          </div>
        </div>
      </div>
    ` : '';

  const noteNodes = (board.notes || []).map((note, index) => `
    <div class="iv-flow-node note-node iv-draggable-node ${selected === 'note:' + note.id ? 'selected' : ''}" style="left:${note.x}px;top:${note.y}px" onpointerdown="startIvNodeDrag(event,'${wfId}','note','${note.id}')">
      <div class="iv-flow-card">
        <div class="iv-node-head">
          <span class="iv-node-index">T</span>
          <strong>文字备注</strong>
          <button class="iv-mini-btn" onclick="removeIvNote('${wfId}','${note.id}')">删</button>
        </div>
        <div class="iv-node-body">
          <div class="iv-node-row" style="display:block;color:var(--ink-2);line-height:1.55">${escapeHtml(note.text)}</div>
        </div>
      </div>
    </div>
  `).join('');

  const dropHint = !board.shots.length ? `
    <div class="iv-drop-hint">
      <i class="fas fa-images"></i>
      把右侧生成图拖到这里<br>
      或直接从电脑拖入图片文件
    </div>
  ` : '';

  canvas.innerHTML = `
    <div class="iv-canvas-content" id="iv-canvas-content-${wfId}" style="transform:scale(${board.zoom})">
      <svg class="iv-link-layer" id="iv-links-${wfId}" viewBox="0 0 ${IV_CANVAS.width} ${IV_CANVAS.height}" aria-hidden="true">
        ${renderIvLinkSvg(wfId)}
      </svg>
      ${configNode}
      ${shotNodes}
      ${videoNode}
      ${outputNode}
      ${noteNodes}
      ${dropHint}
    </div>
  `;
  syncIvCanvasControls(wfId);
  updateIvMinimap(wfId);
  renderImageVideoPreviewBox(wfId);
}

function editIvShotNode(event, wfId, shotId) {
  event.preventDefault();
  event.stopPropagation();
  const board = getImageVideoBoard(wfId);
  const shot = board.shots.find(item => item.id === shotId);
  if (!shot) return;
  const index = board.shots.findIndex(item => item.id === shotId) + 1;
  openModal(`
    <div style="padding:24px;max-width:460px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:800">镜头 ${index} 参数</h2>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <div class="runner-two" style="margin-bottom:12px">
        <div class="runner-field">
          <label>时长 / 秒</label>
          <input class="runner-input" id="iv-shot-duration-${shot.id}" type="number" min="0.5" max="12" step="0.5" value="${escapeHtml(shot.duration)}">
        </div>
        <div class="runner-field">
          <label>运动方式</label>
          <select class="runner-select" id="iv-shot-motion-${shot.id}">
            ${['push in', 'pull out', 'pan left', 'pan right', 'match cut', 'orbit', 'static'].map(item => `<option value="${escapeHtml(item)}" ${shot.motion === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="runner-field" style="margin-bottom:16px">
        <label>镜头备注</label>
        <textarea class="runner-textarea" id="iv-shot-note-${shot.id}" placeholder="给这个镜头补充动作、景别或情绪">${escapeHtml(shot.note || '')}</textarea>
      </div>
      <button class="runner-primary" onclick="applyIvShotSettings('${wfId}','${shot.id}')">保存参数</button>
    </div>
  `);
}

function applyIvShotSettings(wfId, shotId) {
  const board = getImageVideoBoard(wfId);
  const shot = board.shots.find(item => item.id === shotId);
  if (!shot) return;
  const duration = Number(document.getElementById('iv-shot-duration-' + shotId)?.value || shot.duration || 2);
  const motion = document.getElementById('iv-shot-motion-' + shotId)?.value || shot.motion || 'match cut';
  const note = document.getElementById('iv-shot-note-' + shotId)?.value || '';
  if (!Number.isFinite(duration) || duration < 0.5 || duration > 12) return showToast('镜头时长需要在 0.5 到 12 秒之间', true);
  pushIvHistory(wfId);
  shot.duration = Number(duration.toFixed(1));
  shot.motion = motion;
  shot.note = note.trim();
  resetImageVideoPreview(wfId);
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  closeModal();
  showToast('镜头参数已保存');
}

function editIvVideoNode(event, wfId) {
  event.preventDefault();
  event.stopPropagation();
  const board = getImageVideoBoard(wfId);
  openModal(`
    <div style="padding:24px;max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:800">Grok Video-3 参数</h2>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <div class="runner-field" style="margin-bottom:16px">
        <label>动态提示词</label>
        <textarea class="runner-textarea" id="iv-video-prompt-${wfId}" placeholder="描述镜头如何运动、主体如何保持一致、光线如何变化">${escapeHtml(board.videoSettings.prompt)}</textarea>
      </div>
      <button class="runner-primary" onclick="applyIvVideoSettings('${wfId}')">保存视频参数</button>
    </div>
  `);
}

function applyIvVideoSettings(wfId) {
  const board = getImageVideoBoard(wfId);
  const prompt = (document.getElementById('iv-video-prompt-' + wfId)?.value || '').trim();
  if (prompt.length < 6) return showToast('视频提示词太短', true);
  pushIvHistory(wfId);
  board.videoSettings.prompt = prompt;
  resetImageVideoPreview(wfId);
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  closeModal();
  showToast('视频参数已保存');
}

function duplicateIvShot(wfId, shotId) {
  const board = getImageVideoBoard(wfId);
  const shot = board.shots.find(item => item.id === shotId);
  if (!shot) return;
  pushIvHistory(wfId);
  resetImageVideoPreview(wfId);
  board.shots.push({
    ...JSON.parse(JSON.stringify(shot)),
    id: 'shot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    x: shot.x + 42,
    y: shot.y + 42
  });
  syncIvWorkflowConnections(board, { force: true });
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('镜头已复制');
}

function addIvTextNote(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.notes.push({
    id: 'note_' + Date.now(),
    text: '在这里写镜头说明或素材要求',
    x: 360 + board.notes.length * 34,
    y: 650 + board.notes.length * 26
  });
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('已添加文字备注');
}

function removeIvNote(wfId, noteId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.notes = board.notes.filter(note => note.id !== noteId);
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
}

function setIvCanvasTool(wfId, tool) {
  const board = getImageVideoBoard(wfId);
  board.tool = tool;
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast(tool === 'pan' ? '可拖动画布滚动查看' : '已切换为选择工具');
}

function syncIvCanvasControls(wfId) {
  const board = getImageVideoBoard(wfId);
  const canvas = document.getElementById('iv-canvas-' + wfId);
  if (canvas) {
    canvas.classList.toggle('no-grid', !board.grid);
    canvas.classList.toggle('iv-canvas-locked', board.locked);
    canvas.classList.toggle('pan-mode', board.tool === 'pan');
  }
  const zoomLabel = document.getElementById('iv-zoom-label-' + wfId);
  if (zoomLabel) zoomLabel.textContent = Math.round((board.zoom || 1) * 100) + '%';
  const gridBtn = document.getElementById('iv-grid-' + wfId);
  if (gridBtn) gridBtn.classList.toggle('active', board.grid);
  const lockBtn = document.getElementById('iv-lock-' + wfId);
  if (lockBtn) {
    lockBtn.classList.toggle('active', board.locked);
    lockBtn.innerHTML = `<i class="fas ${board.locked ? 'fa-lock' : 'fa-lock-open'}"></i> 锁定`;
  }
  ['select', 'pan'].forEach(tool => {
    const rail = document.getElementById('iv-rail-' + tool + '-' + wfId);
    if (rail) rail.classList.toggle('active', board.tool === tool);
  });
  const selectBtn = document.getElementById('iv-toolbar-select-' + wfId);
  if (selectBtn) selectBtn.classList.toggle('active', board.tool === 'select');
  const content = document.getElementById('iv-canvas-content-' + wfId);
  if (content) content.style.transform = `scale(${board.zoom || 1})`;
}

function toggleIvGrid(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.grid = !board.grid;
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast(board.grid ? '网格已打开' : '网格已关闭');
}

function toggleIvLock(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.locked = !board.locked;
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast(board.locked ? '画布已锁定' : '画布已解锁');
}

function zoomIvCanvas(wfId, delta) {
  const board = getImageVideoBoard(wfId);
  board.zoom = Math.max(0.55, Math.min(1.35, Number((board.zoom + delta).toFixed(2))));
  syncIvCanvasControls(wfId);
  persistIvBoard(wfId, { silent: true });
}

function fitIvCanvas(wfId) {
  const board = getImageVideoBoard(wfId);
  board.zoom = 0.86;
  syncIvCanvasControls(wfId);
  const canvas = document.getElementById('iv-canvas-' + wfId);
  if (canvas) {
    canvas.scrollLeft = 0;
    canvas.scrollTop = 0;
  }
  persistIvBoard(wfId, { silent: true });
  showToast('已适配视图');
}

function alignIvCanvasNodes(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  const y = 300;
  board.nodePositions.config.y = y + 18;
  board.shots.forEach((shot, index) => { shot.y = y - 42 + (index % 2) * 10; });
  board.nodePositions.video.y = y;
  board.nodePositions.output.y = y - 10;
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('节点已对齐');
}

function autoLayoutIvCanvas(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.nodePositions.config = { x: 100, y: 318 };
  board.shots.forEach((shot, index) => {
    shot.x = 350 + index * 234;
    shot.y = 262 + (index % 2) * 34;
  });
  reflowIvSystemNodesForShots(board, board.shots.length);
  board.nodePositions.video.y = 296;
  board.nodePositions.output.y = 286;
  renderImageVideoCanvas(wfId);
  persistIvBoard(wfId, { silent: true });
  showToast('已自动布局');
}

function updateIvMinimap(wfId) {
  const board = getImageVideoBoard(wfId);
  const track = document.querySelector('#iv-studio-' + wfId + ' .iv-minimap-track');
  if (!track) return;
  const nodes = [
    { ...board.nodePositions.config, type: 'config' },
    ...board.shots.map(shot => ({ x: shot.x, y: shot.y, type: 'shot' })),
    { ...board.nodePositions.video, type: 'video' }
  ];
  if (board.video) nodes.push({ ...board.nodePositions.output, type: 'output' });
  track.innerHTML = nodes.map(node => {
    const left = Math.max(4, Math.min(178, node.x / IV_CANVAS.width * 196));
    const top = Math.max(4, Math.min(68, node.y / IV_CANVAS.height * 78));
    const color = node.type === 'video' || node.type === 'output' ? 'rgba(26,93,58,0.26)' : 'rgba(91,63,168,0.25)';
    return `<span class="iv-mini-node" style="left:${left}px;top:${top}px;width:34px;height:24px;background:${color}"></span>`;
  }).join('');
}

function showIvLayerList(wfId) {
  const board = getImageVideoBoard(wfId);
  const layers = [
    'Image2Image 生图',
    ...board.shots.map((shot, index) => `镜头 ${index + 1}`),
    'Grok Video-3 生视频',
    ...(board.video ? ['视频输出'] : []),
    ...board.notes.map((note, index) => `文字备注 ${index + 1}`)
  ];
  openModal(`
    <div style="padding:24px;max-width:420px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:800">画布图层</h2>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <div style="display:grid;gap:8px">
        ${layers.map((layer, index) => `<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--ink-2)">${index + 1}. ${escapeHtml(layer)}</div>`).join('')}
      </div>
    </div>
  `);
}

function shareIvWorkflow(wfId) {
  const url = location.origin + location.pathname + '#run=' + encodeURIComponent(wfId);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast('分享链接已复制')).catch(() => showToast('复制失败,请手动复制', true));
  } else {
    showToast('当前浏览器不支持自动复制', true);
  }
}

function favoriteIvWorkflow(wfId) {
  const data = getData();
  data._favorites = data._favorites || [];
  if (!data._favorites.includes(wfId)) data._favorites.push(wfId);
  saveData(data);
  showToast('已收藏工作流');
}

function publishIvWorkflow(wfId) {
  const board = getImageVideoBoard(wfId);
  openModal(`
    <div style="padding:24px;max-width:460px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h2 style="font-size:18px;font-weight:800">发布工作流</h2>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <p style="font-size:13px;color:var(--ink-2);line-height:1.7;margin-bottom:16px">当前 demo 会把画布结构保存为发布草稿。真实版本可在这里接审核、版本号、权限和 API 配置。</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div class="sql-meta-card"><span>镜头</span><strong>${board.shots.length}</strong></div>
        <div class="sql-meta-card"><span>素材</span><strong>${board.assets.length}</strong></div>
      </div>
      <button class="runner-primary" onclick="closeModal(); showToast('工作流草稿已保存')">保存发布草稿</button>
    </div>
  `);
}

function hasIvConnection(board, fromType, fromId, toType, toId) {
  return (board.connections || []).some(conn =>
    conn.from.type === fromType &&
    conn.from.id === fromId &&
    conn.to.type === toType &&
    conn.to.id === toId
  );
}

function setIvConnectionStatus(board, fromType, fromId, toType, toId, status) {
  const conn = (board.connections || []).find(item =>
    item.from.type === fromType &&
    item.from.id === fromId &&
    item.to.type === toType &&
    item.to.id === toId
  );
  if (conn) conn.status = status;
}

function getIvExecutionPlan(board) {
  const plan = [{ type: 'config', id: 'config', label: 'Image2Image 生图' }];
  board.shots.forEach((shot, index) => {
    plan.push({ type: 'shot', id: shot.id, label: `镜头 ${index + 1}` });
  });
  plan.push({ type: 'video', id: 'video', label: 'Grok Video-3 生视频' });
  return plan;
}

function validateIvWorkflowGraph(board) {
  if (board.shots.length < 2) return '至少需要 2 个镜头才能运行视频工作流';
  const first = board.shots[0];
  if (!hasIvConnection(board, 'config', 'config', 'shot', first.id)) return 'Image2Image 节点还没有连接到第一个镜头';
  for (let i = 0; i < board.shots.length - 1; i++) {
    const current = board.shots[i];
    const next = board.shots[i + 1];
    if (!hasIvConnection(board, 'shot', current.id, 'shot', next.id)) return `镜头 ${i + 1} 还没有连接到镜头 ${i + 2}`;
  }
  const last = board.shots[board.shots.length - 1];
  if (!hasIvConnection(board, 'shot', last.id, 'video', 'video')) return '最后一个镜头还没有连接到 Grok Video-3 节点';
  return '';
}

function renderIvExecutionBox(wfId, plan, activeIndex) {
  const videoBox = document.getElementById('iv-video-' + wfId);
  if (!videoBox) return;
  const current = Math.min(activeIndex + 1, plan.length);
  const steps = plan.map((node, index) => {
    const cls = index < activeIndex ? 'done' : index === activeIndex ? 'running' : '';
    const icon = index < activeIndex ? '✓' : index === activeIndex ? '•' : '';
    return `<div class="iv-run-step ${cls}"><i>${icon}</i><span>${escapeHtml(node.label)}</span></div>`;
  }).join('');
  videoBox.innerHTML = `
    <div class="iv-run-progress">
      <strong>正在运行工作流 ${current}/${plan.length}</strong>
      <div class="iv-run-steps">${steps}</div>
    </div>
  `;
}

function repairIvWorkflowConnections(wfId) {
  const board = getImageVideoBoard(wfId);
  pushIvHistory(wfId);
  board.video = null;
  resetIvExecutionState(board);
  syncIvWorkflowConnections(board, { force: true });
  renderImageVideoCanvas(wfId);
  renderImageVideoAssets(wfId);
  renderImageVideoPreviewBox(wfId, { empty: true });
  persistIvBoard(wfId, { silent: true });
  closeModal();
  showToast('已按镜头顺序重建默认连接');
}

function showIvWorkflowInspector(wfId) {
  const board = getImageVideoBoard(wfId);
  const validation = validateIvWorkflowGraph(board);
  const plan = getIvExecutionPlan(board);
  const connectionRows = (board.connections || []).map(conn => `
    <div class="iv-report-row">
      <span>${escapeHtml(conn.status || 'idle')}</span>
      <strong>${escapeHtml(getIvNodeDisplayName(board, conn.from.type, conn.from.id))} → ${escapeHtml(getIvNodeDisplayName(board, conn.to.type, conn.to.id))}</strong>
    </div>
  `).join('');
  openModal(`
    <div style="padding:24px;max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:800">工作流检查</h2>
        <button class="modal-close" onclick="closeModal()"><i class="fas fa-times" style="font-size:11px"></i></button>
      </div>
      <div class="sql-meta-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">
        <div class="sql-meta-card"><span>素材</span><strong>${board.assets.length}</strong></div>
        <div class="sql-meta-card"><span>镜头</span><strong>${board.shots.length}</strong></div>
        <div class="sql-meta-card"><span>连接</span><strong>${board.connections.length}</strong></div>
        <div class="sql-meta-card"><span>输出</span><strong>${board.video ? '已生成' : '待生成'}</strong></div>
      </div>
      <div class="iv-report-row" style="border-color:${validation ? 'rgba(180,35,24,0.24)' : 'rgba(26,93,58,0.24)'};margin-bottom:12px">
        <span>${validation ? 'blocked' : 'ready'}</span>
        <strong>${escapeHtml(validation || '链路完整,可以运行')}</strong>
      </div>
      <div class="iv-report-list">
        <div class="iv-report-row"><span>执行顺序</span><strong>${plan.map(item => escapeHtml(item.label)).join(' → ')}</strong></div>
        ${connectionRows || '<div class="iv-report-row"><span>连接</span><strong>暂无连接</strong></div>'}
      </div>
      <div class="try-actions" style="margin-top:16px">
        <button class="try-btn" onclick="repairIvWorkflowConnections('${wfId}')">重建默认连接</button>
        <button class="try-btn primary" onclick="closeModal(); runIvWorkflow('${wfId}')">运行工作流</button>
      </div>
    </div>
  `);
}

function waitIv(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIvWorkflow(wfId) {
  const board = getImageVideoBoard(wfId);
  const videoBox = document.getElementById('iv-video-' + wfId);
  if (!videoBox) return;
  if (board.running) return showToast('工作流正在运行中', true);
  const validation = validateIvWorkflowGraph(board);
  if (validation) return showToast(validation, true);

  pushIvHistory(wfId);
  board.running = true;
  board.video = null;
  board.nodeStates = {};
  (board.connections || []).forEach(conn => { conn.status = 'idle'; });
  appendIvMessage(wfId, 'bot', '已开始按画布连接顺序运行: Image2 → 镜头链路 → Grok Video-3 → 视频输出。');
  recordWorkflowClick(getData(), wfId, { source: 'video3_generation' });

  const plan = getIvExecutionPlan(board);
  renderIvExecutionBox(wfId, plan, 0);
  try {
    for (let i = 0; i < plan.length; i++) {
      const node = plan[i];
      const prev = plan[i - 1];
      if (prev) setIvConnectionStatus(board, prev.type, prev.id, node.type, node.id, 'running');
      setIvNodeStatus(board, node.type, node.id, 'running');
      renderImageVideoCanvas(wfId);
      renderIvExecutionBox(wfId, plan, i);
      await waitIv(node.type === 'video' ? 420 : 220);
      setIvNodeStatus(board, node.type, node.id, 'done');
      if (prev) setIvConnectionStatus(board, prev.type, prev.id, node.type, node.id, 'done');
      renderImageVideoCanvas(wfId);
      renderIvExecutionBox(wfId, plan, i + 1);
    }

    const duration = board.shots.reduce((sum, shot) => sum + Number(shot.duration || 2), 0).toFixed(1);
    const firstAsset = board.assets.find(item => item.id === board.shots[0].assetId);
    const ratio = getRunnerValue('iv-ratio-' + wfId, '9:16');
    board.video = {
      id: 'video_' + Date.now(),
      duration,
      ratio,
      firstAssetId: firstAsset ? firstAsset.id : '',
      engine: 'Grok Video-3',
      prompt: board.videoSettings.prompt,
      created_at: new Date().toISOString()
    };
    const outputConn = makeIvConnection('video', 'video', 'output', 'output', 'done');
    board.connections = board.connections.filter(conn => conn.id !== outputConn.id);
    board.connections.push(outputConn);
    setIvNodeStatus(board, 'output', 'output', 'done');
    board.running = false;
    renderImageVideoPreviewBox(wfId, { empty: true });
    renderImageVideoCanvas(wfId);
    appendIvMessage(wfId, 'bot', `运行完成: ${board.shots.length} 个镜头已进入 Grok Video-3,生成 ${duration}s 视频输出。`);
    renderImageVideoAssets(wfId);

    const data = getData();
    data.inline_runs = data.inline_runs || [];
    data.inline_runs.unshift({
      id: 'run_' + Date.now(),
      workflow_id: wfId,
      input: {
        shots: board.shots.length,
        engine: 'image2 + video3',
        ratio,
        prompt: board.videoSettings.prompt,
        connections: board.connections.length
      },
      output: 'video_preview_demo',
      created_at: new Date().toISOString()
    });
    data.inline_runs = data.inline_runs.slice(0, 20);
    saveData(data);
    persistIvBoard(wfId, { silent: true });
    showToast('工作流运行完成');
  } catch (err) {
    board.running = false;
    setIvNodeStatus(board, 'video', 'video', 'error');
    renderImageVideoCanvas(wfId);
    persistIvBoard(wfId, { silent: true });
    showToast('工作流运行失败', true);
  }
}

function generateVideo3Preview(wfId) {
  return runIvWorkflow(wfId);
}

const SQL_PRESETS = {
  gmv: {
    question: '查询近 30 天每个店铺 GMV、订单数和客单价,按 GMV 降序取前 20',
    schema: 'orders(order_id, shop_id, user_id, paid_amount, paid_at, status)\nshops(shop_id, shop_name, category)',
    output: 'analysis'
  },
  retention: {
    question: '统计 5 月新注册用户的次日留存、7 日留存和 30 日留存',
    schema: 'users(user_id, created_at, channel)\nevents(user_id, event_name, event_time)',
    output: 'dashboard'
  },
  sku: {
    question: '查询近 7 天每个 SKU 的销量、销售额和库存周转率,过滤销量为 0 的商品',
    schema: 'order_items(order_id, sku_id, quantity, item_amount, created_at)\nproducts(sku_id, sku_name, category, stock_qty)',
    output: 'analysis'
  }
};

let _sqlResultCache = {};

function applySqlPreset(wfId, presetId) {
  const preset = SQL_PRESETS[presetId];
  if (!preset) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('sql-question-' + wfId, preset.question);
  set('sql-schema-' + wfId, preset.schema);
  set('sql-output-' + wfId, preset.output);
  showToast('已填入 SQL 样例');
}

function getSqlDateExpr(dialect, days) {
  if (dialect === 'mysql') return `CURRENT_DATE - INTERVAL ${days} DAY`;
  if (dialect === 'bigquery') return `DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
  return `CURRENT_DATE - INTERVAL '${days} days'`;
}

function buildSqlResult(input) {
  const q = input.question.toLowerCase();
  const date30 = getSqlDateExpr(input.dialect, 30);
  const date7 = getSqlDateExpr(input.dialect, 7);

  if (q.includes('留存') || q.includes('retention')) {
    return {
      title: '用户留存查询',
      risk: '只读查询',
      complexity: '中',
      sql: `WITH cohort AS (
  SELECT
    user_id,
    DATE(created_at) AS signup_date
  FROM users
  WHERE created_at >= DATE '2026-05-01'
    AND created_at < DATE '2026-06-01'
),
activity AS (
  SELECT
    c.user_id,
    c.signup_date,
    DATE(e.event_time) - c.signup_date AS day_offset
  FROM cohort c
  LEFT JOIN events e
    ON e.user_id = c.user_id
   AND e.event_time >= c.signup_date
   AND e.event_time < c.signup_date + INTERVAL '31 days'
)
SELECT
  signup_date,
  COUNT(DISTINCT user_id) AS new_users,
  COUNT(DISTINCT CASE WHEN day_offset = 1 THEN user_id END) AS d1_retained,
  COUNT(DISTINCT CASE WHEN day_offset = 7 THEN user_id END) AS d7_retained,
  COUNT(DISTINCT CASE WHEN day_offset = 30 THEN user_id END) AS d30_retained,
  ROUND(COUNT(DISTINCT CASE WHEN day_offset = 1 THEN user_id END)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 4) AS d1_rate
FROM activity
GROUP BY signup_date
ORDER BY signup_date;`,
      explain: [
        '先用 cohort 固定新用户口径,避免后续 join 扩大样本。',
        'activity 只统计注册后 31 天内行为,减少扫描成本。',
        'NULLIF 防止某天没有新用户时除零。'
      ],
      optimize: '如果 events 表很大,建议给 (user_id, event_time) 建复合索引,或按 event_time 分区。'
    };
  }

  if (q.includes('sku') || q.includes('库存') || q.includes('销量')) {
    return {
      title: 'SKU 动销查询',
      risk: '只读查询',
      complexity: '低',
      sql: `SELECT
  p.sku_id,
  p.sku_name,
  p.category,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.item_amount) AS sales_amount,
  ROUND(SUM(oi.quantity)::numeric / NULLIF(p.stock_qty, 0), 4) AS turnover_rate
FROM order_items oi
JOIN products p
  ON p.sku_id = oi.sku_id
WHERE oi.created_at >= ${date7}
GROUP BY p.sku_id, p.sku_name, p.category, p.stock_qty
HAVING SUM(oi.quantity) > 0
ORDER BY sales_amount DESC;`,
      explain: [
        '以 order_items 为事实表聚合 SKU 销量和销售额。',
        'HAVING 过滤 0 销量商品,适合看动销表现。',
        '库存周转率使用销量 / 当前库存做近似指标。'
      ],
      optimize: '建议给 order_items(created_at, sku_id) 建索引,产品维表保持 sku_id 唯一。'
    };
  }

  return {
    title: '店铺 GMV 排行查询',
    risk: '只读查询',
    complexity: '低',
    sql: `SELECT
  s.shop_id,
  s.shop_name,
  s.category,
  COUNT(DISTINCT o.order_id) AS order_count,
  SUM(o.paid_amount) AS gmv,
  ROUND(SUM(o.paid_amount) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) AS avg_order_value
FROM orders o
JOIN shops s
  ON s.shop_id = o.shop_id
WHERE o.status = 'paid'
  AND o.paid_at >= ${date30}
GROUP BY s.shop_id, s.shop_name, s.category
ORDER BY gmv DESC
LIMIT 20;`,
    explain: [
      'orders 作为交易事实表,shops 补充店铺名称和分类。',
      '只统计已支付订单,避免未支付和取消订单污染 GMV。',
      '客单价使用 GMV / 订单数,并用 NULLIF 防止除零。'
    ],
    optimize: '建议给 orders(status, paid_at, shop_id) 建复合索引,大表可以按 paid_at 分区。'
  };
}

function runSqlWorkflow(wfId) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf) return;

  const output = document.getElementById('sql-output-box-' + wfId);
  const runBtn = document.getElementById('sql-run-' + wfId);
  if (!output) return;

  const input = {
    question: getRunnerValue('sql-question-' + wfId, SQL_PRESETS.gmv.question),
    schema: getRunnerValue('sql-schema-' + wfId, SQL_PRESETS.gmv.schema),
    dialect: getRunnerValue('sql-dialect-' + wfId, 'postgres'),
    output: getRunnerValue('sql-output-' + wfId, 'analysis'),
    safe: !!document.getElementById('sql-safe-' + wfId)?.checked
  };

  if (!input.question || input.question.length < 6) {
    showToast('业务问题太短,请再写具体一点', true);
    return;
  }

  output.classList.add('loading');
  output.innerHTML = '<div class="runner-empty"><div><i class="fas fa-database"></i>正在生成 SQL 查询</div></div>';
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中';
  }

  recordWorkflowClick(data, wfId, { source: 'inline_execution' });

  setTimeout(() => {
    const result = buildSqlResult(input);
    _sqlResultCache[wfId] = result.sql;

    const runRecordData = getData();
    runRecordData.inline_runs = runRecordData.inline_runs || [];
    runRecordData.inline_runs.unshift({
      id: 'run_' + Date.now(),
      workflow_id: wfId,
      input,
      output: result.sql,
      created_at: new Date().toISOString()
    });
    runRecordData.inline_runs = runRecordData.inline_runs.slice(0, 20);
    saveData(runRecordData);

    output.classList.remove('loading');
    output.innerHTML = `
      <div class="ps-result">
        <div class="sql-meta-grid">
          <div class="sql-meta-card"><span>类型</span><strong>${escapeHtml(result.title)}</strong></div>
          <div class="sql-meta-card"><span>风险</span><strong>${escapeHtml(input.safe ? result.risk : '未启用安全限制')}</strong></div>
          <div class="sql-meta-card"><span>复杂度</span><strong>${escapeHtml(result.complexity)}</strong></div>
        </div>
        <pre class="sql-code">${escapeHtml(result.sql)}</pre>
        <div class="ps-result-block">
          <h5>生成解释</h5>
          <ul>${result.explain.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
        <div class="ps-result-block">
          <h5>优化建议</h5>
          <p>${escapeHtml(result.optimize)}</p>
          <div class="try-actions">
            <button class="try-btn primary" onclick="copySqlResult('${wfId}')"><i class="fas fa-copy"></i> 复制 SQL</button>
            <button class="try-btn" onclick="runSqlWorkflow('${wfId}')">重新生成</button>
          </div>
        </div>
      </div>
    `;
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '<i class="fas fa-play"></i> 重新生成';
    }
    showToast('SQL 查询已生成');
  }, 700);
}

function copySqlResult(wfId) {
  const sql = _sqlResultCache[wfId];
  if (!sql) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(sql)
      .then(() => showToast('SQL 已复制'))
      .catch(() => showToast('复制失败,可手动选中文本', true));
  } else {
    showToast('当前浏览器不支持自动复制', true);
  }
}

const PICSPARK_PRESETS = {
  skincare: {
    product: '玻尿酸精华瓶',
    selling: '补水修护,敏感肌可用,清爽不黏腻',
    scene: 'kitchen',
    style: 'tmall'
  },
  coffee: {
    product: '精品挂耳咖啡礼盒',
    selling: '深烘坚果香,办公室下午茶,送礼有质感',
    scene: 'desk',
    style: 'xhs'
  },
  pet: {
    product: '冻干鸡肉宠物零食',
    selling: '高蛋白,无谷配方,适合猫狗训练奖励',
    scene: 'outdoor',
    style: 'real'
  }
};

const PICSPARK_SCENES = {
  kitchen: {
    label: '温暖厨房',
    bg: 'linear-gradient(135deg, #EAF4E6 0%, #FFD7AD 100%)',
    prompt: '自然晨光,温暖家庭厨房,新鲜水果和浅色木质台面',
    tip: '适合食品、母婴、护肤等需要亲近感的商品'
  },
  festival: {
    label: '红金节日',
    bg: 'linear-gradient(135deg, #7D1222 0%, #D99B43 100%)',
    prompt: '春节红金主题,灯笼、金色纸屑、促销氛围,预留标题区域',
    tip: '适合大促主图、节日海报和直播间封面'
  },
  desk: {
    label: '木质桌面',
    bg: 'linear-gradient(135deg, #EBD8C0 0%, #8A6A4E 100%)',
    prompt: '木质桌面,咖啡杯、笔记本和柔和侧光,生活方式摄影',
    tip: '适合礼盒、数码配件、家居小物和内容种草'
  },
  studio: {
    label: '极简棚拍',
    bg: 'linear-gradient(135deg, #EDECE8 0%, #B8BBB6 100%)',
    prompt: '高级灰背景,柔光棚拍,干净阴影,商业摄影质感',
    tip: '适合主图、详情页首屏和品牌升级素材'
  },
  outdoor: {
    label: '自然绿植',
    bg: 'linear-gradient(135deg, #DCEEDB 0%, #6EA27B 100%)',
    prompt: '户外自然光,绿植、石材和清新空气感,浅景深',
    tip: '适合宠物、运动、健康和户外生活方式商品'
  }
};

const PICSPARK_STYLES = {
  tmall: {
    label: '天猫主图',
    copy: '三秒看懂卖点,主体居中,文字区清晰克制',
    cta: '主图转化'
  },
  xhs: {
    label: '小红书种草',
    copy: '生活化构图,弱营销感,适合笔记封面和收藏传播',
    cta: '内容种草'
  },
  real: {
    label: '真实摄影',
    copy: '少文字,保留真实光影和材质细节,像实拍图',
    cta: '品牌质感'
  },
  crossborder: {
    label: '跨境独立站',
    copy: '英文留白,高级生活方式视觉,适合 Shopify 首屏',
    cta: 'DTC 落地页'
  }
};

let _picsparkPromptCache = {};

function getRunnerValue(id, fallback) {
  const el = document.getElementById(id);
  return el ? String(el.value || '').trim() || fallback : fallback;
}

function setRunnerInput(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

let _toolResultCache = {};
let _ocrPreviewUrls = {};

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / 1024 / 1024).toFixed(1) + ' MB';
}

function previewOcrImage(wfId) {
  const input = document.getElementById('ocr-file-' + wfId);
  const preview = document.getElementById('ocr-preview-' + wfId);
  const file = input?.files?.[0];
  if (!preview) return;

  if (_ocrPreviewUrls[wfId]) {
    URL.revokeObjectURL(_ocrPreviewUrls[wfId]);
    delete _ocrPreviewUrls[wfId];
  }

  if (!file) {
    preview.classList.remove('has-image');
    preview.innerHTML = `
      <div class="ocr-preview-empty">
        <i class="fas fa-image"></i>
        选择图片后会在这里显示预览
      </div>
    `;
    return;
  }

  if (!file.type.startsWith('image/')) {
    preview.classList.remove('has-image');
    preview.innerHTML = `
      <div class="ocr-preview-empty">
        <i class="fas fa-triangle-exclamation"></i>
        当前文件不是图片,请重新选择
      </div>
    `;
    return;
  }

  const url = URL.createObjectURL(file);
  _ocrPreviewUrls[wfId] = url;
  preview.classList.add('has-image');
  preview.innerHTML = `
    <img src="${url}" alt="待识别图片预览" id="ocr-preview-img-${wfId}">
    <div class="ocr-preview-meta">
      <span>${escapeHtml(file.name)}</span>
      <span>${formatFileSize(file.size)}</span>
    </div>
  `;

  const image = document.getElementById('ocr-preview-img-' + wfId);
  if (image) {
    image.onload = () => {
      const meta = preview.querySelector('.ocr-preview-meta');
      if (meta && image.naturalWidth && image.naturalHeight) {
        meta.innerHTML = `
          <span>${escapeHtml(file.name)}</span>
          <span>${image.naturalWidth}x${image.naturalHeight} · ${formatFileSize(file.size)}</span>
        `;
      }
    };
  }
}

function getApiError(json, fallback = '工具执行失败') {
  return json?.error?.message || json?.message || fallback;
}

function setToolLoading(outputId, icon, text) {
  const output = document.getElementById(outputId);
  if (!output) return;
  output.classList.add('loading');
  output.innerHTML = `<div class="runner-empty"><div><i class="fas ${icon}"></i>${escapeHtml(text)}</div></div>`;
}

function setToolButtonLoading(btnId, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.originalHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${escapeHtml(loadingText)}`;
}

function resetToolButton(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = false;
  if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
}

function renderToolError(outputId, message) {
  const output = document.getElementById(outputId);
  if (!output) return;
  output.classList.remove('loading');
  output.innerHTML = `
    <div class="tool-error">
      <strong>执行失败</strong><br>
      ${escapeHtml(message)}
    </div>
  `;
}

function renderMarkdownToolResult(wfId, outputId, result) {
  const output = document.getElementById(outputId);
  if (!output) return;
  const markdown = result.markdown || result.text || '';
  _toolResultCache[wfId] = markdown;
  output.classList.remove('loading');
  output.innerHTML = `
    <div class="ps-result">
      <div class="ps-result-block">
        <h5>${escapeHtml(result.title || result.file_name || '转换结果')}</h5>
        <div class="tool-meta">
          ${result.engine ? `<span>${escapeHtml(result.engine)}</span>` : ''}
          ${result.word_count !== undefined ? `<span>${Number(result.word_count || 0).toLocaleString()} 字/词</span>` : ''}
          ${result.pages ? `<span>${Number(result.pages).toLocaleString()} 页</span>` : ''}
          ${result.confidence !== undefined ? `<span>置信度 ${escapeHtml(result.confidence)}%</span>` : ''}
        </div>
        ${result.excerpt ? `<p>${escapeHtml(result.excerpt)}</p>` : ''}
        ${(result.warnings || []).length ? `<p style="color:var(--warn)">提示:${escapeHtml(result.warnings.join('; '))}</p>` : ''}
      </div>
      <pre class="tool-markdown">${escapeHtml(markdown || '没有识别到可用内容')}</pre>
      <div class="try-actions">
        <button class="try-btn primary" onclick="copyToolResult('${wfId}')"><i class="fas fa-copy"></i> 复制结果</button>
        <button class="try-btn" onclick="downloadToolResult('${wfId}', '${escapeHtml((result.title || result.file_name || 'flowhub-result').replace(/'/g, ''))}')"><i class="fas fa-download"></i> 下载 Markdown</button>
      </div>
    </div>
  `;
}

function saveToolRun(wfId, input, output) {
  const data = getData();
  data.inline_runs = data.inline_runs || [];
  data.inline_runs.unshift({
    id: 'run_' + Date.now(),
    workflow_id: wfId,
    input,
    output,
    created_at: new Date().toISOString()
  });
  data.inline_runs = data.inline_runs.slice(0, 20);
  saveData(data);
}

function copyToolResult(wfId) {
  const text = _toolResultCache[wfId];
  if (!text) return showToast('没有可复制的结果', true);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('结果已复制'))
      .catch(() => showToast('复制失败,可手动选中文本', true));
  } else {
    showToast('当前浏览器不支持自动复制', true);
  }
}

function downloadToolResult(wfId, filename) {
  const text = _toolResultCache[wfId];
  if (!text) return showToast('没有可下载的结果', true);
  const safeName = (filename || 'flowhub-result').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = safeName + '.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function runDocumentMarkdownWorkflow(wfId) {
  const fileInput = document.getElementById('doc-file-' + wfId);
  const file = fileInput?.files?.[0];
  if (!file) return showToast('请先选择一个文档文件', true);
  const data = getData();
  recordWorkflowClick(data, wfId, { source: 'inline_execution' });
  setToolLoading('doc-output-' + wfId, 'fa-file-lines', '正在上传并转换文档...');
  setToolButtonLoading('doc-run-' + wfId, '转换中');
  try {
    const form = new FormData();
    form.append('file', file);
    const json = await apiForm('/tools/document-markdown', form);
    if (!json.ok) throw new Error(getApiError(json, '文档转换失败'));
    renderMarkdownToolResult(wfId, 'doc-output-' + wfId, json.data);
    saveToolRun(wfId, { file_name: file.name, file_size: file.size }, json.data.markdown);
    showToast('文档已转换为 Markdown');
  } catch (err) {
    renderToolError('doc-output-' + wfId, err.message);
    showToast(err.message, true);
  } finally {
    resetToolButton('doc-run-' + wfId);
  }
}

async function runWebpageMarkdownWorkflow(wfId) {
  const url = getRunnerValue('web-url-' + wfId, '');
  if (!/^https?:\/\//i.test(url)) return showToast('请输入 http/https 开头的网址', true);
  const data = getData();
  recordWorkflowClick(data, wfId, { source: 'inline_execution' });
  setToolLoading('web-output-' + wfId, 'fa-globe', '正在抓取网页并提取正文...');
  setToolButtonLoading('web-run-' + wfId, '抓取中');
  try {
    const json = await apiPost('/tools/webpage-markdown', { url });
    if (!json.ok) throw new Error(getApiError(json, '网页转换失败'));
    renderMarkdownToolResult(wfId, 'web-output-' + wfId, json.data);
    saveToolRun(wfId, { url }, json.data.markdown);
    showToast('网页已转换为 Markdown');
  } catch (err) {
    renderToolError('web-output-' + wfId, err.message);
    showToast(err.message, true);
  } finally {
    resetToolButton('web-run-' + wfId);
  }
}

async function runImageOcrWorkflow(wfId) {
  const fileInput = document.getElementById('ocr-file-' + wfId);
  const file = fileInput?.files?.[0];
  if (!file) return showToast('请先选择一张图片', true);
  const lang = getRunnerValue('ocr-lang-' + wfId, 'chi_sim+eng');
  const data = getData();
  recordWorkflowClick(data, wfId, { source: 'inline_execution' });
  setToolLoading('ocr-output-' + wfId, 'fa-eye', '正在识别图片文字,首次加载语言模型会稍慢...');
  setToolButtonLoading('ocr-run-' + wfId, '识别中');
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('lang', lang);
    const json = await apiForm('/tools/image-ocr', form);
    if (!json.ok) throw new Error(getApiError(json, '图片 OCR 失败'));
    renderMarkdownToolResult(wfId, 'ocr-output-' + wfId, json.data);
    saveToolRun(wfId, { file_name: file.name, file_size: file.size, lang }, json.data.text);
    showToast('图片文字已识别');
  } catch (err) {
    renderToolError('ocr-output-' + wfId, err.message);
    showToast(err.message, true);
  } finally {
    resetToolButton('ocr-run-' + wfId);
  }
}

function appendFitnessIngredient(wfId, ingredient) {
  const textarea = document.getElementById('meal-ingredients-' + wfId);
  if (!textarea) return;
  const lines = String(textarea.value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.includes(ingredient)) lines.push(ingredient);
  textarea.value = lines.join('\n');
  textarea.focus();
}

function applyFitnessMealPreset(wfId, presetId) {
  const presets = {
    cut: {
      ingredients: '鸡胸肉 200g\n米饭 120g\n西兰花 150g\n鸡蛋 1个\n橄榄油 5g',
      goal: 'fat_loss',
      meal: 'dinner',
      servings: 1
    },
    bulk: {
      ingredients: '牛肉 200g\n米饭 250g\n鸡蛋 2个\n番茄 100g\n牛油果 80g',
      goal: 'muscle_gain',
      meal: 'lunch',
      servings: 1
    },
    breakfast: {
      ingredients: '燕麦 60g\n牛奶 250ml\n香蕉 1根\n鸡蛋 2个\n希腊酸奶 150g',
      goal: 'balanced',
      meal: 'breakfast',
      servings: 1
    }
  };
  const preset = presets[presetId];
  if (!preset) return;
  setRunnerInput('meal-ingredients-' + wfId, preset.ingredients);
  setRunnerInput('meal-goal-' + wfId, preset.goal);
  setRunnerInput('meal-type-' + wfId, preset.meal);
  setRunnerInput('meal-servings-' + wfId, String(preset.servings));
}

function renderFitnessMealResult(wfId, result) {
  const output = document.getElementById('meal-output-' + wfId);
  if (!output) return;
  _toolResultCache[wfId] = result.markdown || '';
  const total = result.total || {};
  const per = result.per_serving || {};
  output.classList.remove('loading');
  output.innerHTML = `
    <div class="ps-result meal-result">
      <div class="meal-result-hero">
        <div>
          <h5>${escapeHtml(result.title || '健身餐菜谱')}</h5>
          <div class="tool-meta">
            <span>${escapeHtml(result.goal || '均衡')}</span>
            <span>${escapeHtml(result.meal_type || '正餐')}</span>
            <span>${Number(result.servings || 1)} 份</span>
            <span>${escapeHtml(result.engine || 'Nutrition rules')}</span>
          </div>
        </div>
        <div class="meal-kcal-hero">
          <span>每份热量</span>
          <strong>${escapeHtml(per.kcal ?? 0)}</strong>
          <em>kcal</em>
          <small>总计 ${escapeHtml(total.kcal ?? per.kcal ?? 0)} kcal</small>
        </div>
      </div>
      <div class="ps-result-block">
        <h5>营养概览</h5>
        <div class="meal-summary-grid">
          <div class="meal-macro-card"><span>每份热量</span><strong>${escapeHtml(per.kcal ?? 0)}</strong> kcal</div>
          <div class="meal-macro-card"><span>蛋白质</span><strong>${escapeHtml(per.protein ?? 0)}</strong> g</div>
          <div class="meal-macro-card"><span>碳水</span><strong>${escapeHtml(per.carbs ?? 0)}</strong> g</div>
          <div class="meal-macro-card"><span>脂肪</span><strong>${escapeHtml(per.fat ?? 0)}</strong> g</div>
        </div>
      </div>
      <div class="ps-result-block">
        <h5>食材营养明细</h5>
        <div class="meal-ingredient-list">
          ${(result.ingredients || []).map(item => `
            <div class="meal-ingredient-row">
              <strong>${escapeHtml(item.name)} ${escapeHtml(item.grams)}g</strong>
              <span>${escapeHtml(item.kcal)} kcal</span>
              <span>P ${escapeHtml(item.protein)}g / C ${escapeHtml(item.carbs)}g / F ${escapeHtml(item.fat)}g</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="ps-result-block">
        <h5>怎么做这份菜谱</h5>
        <ol class="meal-steps">
          ${(result.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </div>
      <div class="ps-result-block">
        <h5>食用建议</h5>
        <div class="meal-tips">
          ${(result.tips || ['按目标调整主食和油脂用量。']).map(tip => `<div class="meal-tip">${escapeHtml(tip)}</div>`).join('')}
          <div class="meal-tip">营养值为估算值,会因品牌、烹饪方式和熟重/生重差异变化。</div>
        </div>
      </div>
      ${(result.warnings || []).length ? `
        <div class="tool-error" style="color:var(--ad);border-color:rgba(184,92,0,0.22);background:rgba(184,92,0,0.08)">
          ${result.warnings.map(item => escapeHtml(item)).join('<br>')}
        </div>
      ` : ''}
      <div class="try-actions">
        <button class="try-btn primary" onclick="copyToolResult('${wfId}')"><i class="fas fa-copy"></i> 复制菜谱</button>
        <button class="try-btn" onclick="downloadToolResult('${wfId}', '${escapeHtml((result.title || 'fitness-meal').replace(/'/g, ''))}')"><i class="fas fa-download"></i> 下载 Markdown</button>
      </div>
      <details class="meal-markdown-details">
        <summary>查看 Markdown 原文</summary>
        <pre class="tool-markdown">${escapeHtml(result.markdown || '')}</pre>
      </details>
    </div>
  `;
}

async function runFitnessMealWorkflow(wfId) {
  const ingredients = getRunnerValue('meal-ingredients-' + wfId, '');
  if (!ingredients || ingredients.length < 4) return showToast('请先输入食材和重量', true);
  const goal = getRunnerValue('meal-goal-' + wfId, 'fat_loss');
  const mealType = getRunnerValue('meal-type-' + wfId, 'dinner');
  const servings = getRunnerValue('meal-servings-' + wfId, '1');
  const data = getData();
  recordWorkflowClick(data, wfId, { source: 'inline_execution' });
  setToolLoading('meal-output-' + wfId, 'fa-utensils', '正在生成菜谱并计算营养...');
  setToolButtonLoading('meal-run-' + wfId, '生成中');
  try {
    const json = await apiPost('/tools/fitness-meal', { ingredients, goal, meal_type: mealType, servings });
    if (!json.ok) throw new Error(getApiError(json, '健身餐生成失败'));
    renderFitnessMealResult(wfId, json.data);
    saveToolRun(wfId, { ingredients, goal, meal_type: mealType, servings }, json.data.markdown);
    showToast('健身餐菜谱已生成');
  } catch (err) {
    renderToolError('meal-output-' + wfId, err.message);
    showToast(err.message, true);
  } finally {
    resetToolButton('meal-run-' + wfId);
  }
}

function applyPicsparkPreset(wfId, presetId) {
  const preset = PICSPARK_PRESETS[presetId];
  if (!preset) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('picspark-product-' + wfId, preset.product);
  set('picspark-selling-' + wfId, preset.selling);
  set('picspark-scene-' + wfId, preset.scene);
  set('picspark-style-' + wfId, preset.style);
  showToast('已填入样例参数');
}

function buildPicsparkPrompt(input, scene, style) {
  const lockText = input.lockProduct
    ? '严格保持商品主体、包装形状、Logo 位置和颜色不变'
    : '允许轻微优化商品光影和材质质感';
  return [
    `为「${input.product}」生成一张电商商品图。`,
    lockText + '。',
    `场景:${scene.prompt}。`,
    `画幅:${input.ratio}, 风格:${style.label}, 目标:${style.copy}。`,
    `核心卖点:${input.selling}。`,
    '要求:主体清晰、边缘自然、背景真实、中文文字不要变形、预留可读文案区域。'
  ].join('\n');
}

function runPicsparkWorkflow(wfId) {
  const data = getData();
  const wf = data.workflows.find(w => w.id === wfId);
  if (!wf) return;

  const output = document.getElementById('picspark-output-' + wfId);
  const runBtn = document.getElementById('picspark-run-' + wfId);
  if (!output) return;

  const input = {
    product: getRunnerValue('picspark-product-' + wfId, '玻尿酸精华瓶'),
    scene: getRunnerValue('picspark-scene-' + wfId, 'kitchen'),
    ratio: getRunnerValue('picspark-ratio-' + wfId, '1:1'),
    style: getRunnerValue('picspark-style-' + wfId, 'tmall'),
    selling: getRunnerValue('picspark-selling-' + wfId, '补水修护,敏感肌可用,清爽不黏腻'),
    lockProduct: !!document.getElementById('picspark-lock-' + wfId)?.checked
  };
  const scene = PICSPARK_SCENES[input.scene] || PICSPARK_SCENES.kitchen;
  const style = PICSPARK_STYLES[input.style] || PICSPARK_STYLES.tmall;
  const prompt = buildPicsparkPrompt(input, scene, style);
  const label = input.product.length > 8 ? input.product.slice(0, 8) : input.product;

  output.classList.add('loading');
  output.innerHTML = '<div class="runner-empty"><div><i class="fas fa-wand-magic-sparkles"></i>正在生成商品图方向</div></div>';
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中';
  }

  recordWorkflowClick(data, wfId, { source: 'inline_execution' });

  setTimeout(() => {
    _picsparkPromptCache[wfId] = prompt;
    const runRecordData = getData();
    runRecordData.inline_runs = runRecordData.inline_runs || [];
    runRecordData.inline_runs.unshift({
      id: 'run_' + Date.now(),
      workflow_id: wfId,
      input,
      prompt,
      created_at: new Date().toISOString()
    });
    runRecordData.inline_runs = runRecordData.inline_runs.slice(0, 20);
    saveData(runRecordData);

    output.classList.remove('loading');
    output.innerHTML = `
      <div class="ps-result">
        <div class="ps-preview" style="background:${scene.bg}">
          <span class="ps-scene-chip">${escapeHtml(scene.label)} · ${escapeHtml(style.cta)}</span>
          <div class="ps-product" data-label="${escapeHtml(label)}"></div>
          <div class="ps-preview-copy">
            <span>${escapeHtml(input.ratio)}</span>
            <span>${escapeHtml(input.lockProduct ? 'LOCK PRODUCT' : 'LIGHT RETOUCH')}</span>
          </div>
        </div>
        <div class="ps-result-copy">
          <div class="ps-result-block">
            <h5>生成方向</h5>
            <p>${escapeHtml(input.product)} 放在「${escapeHtml(scene.label)}」中,保留主体识别度,用「${escapeHtml(style.label)}」表达 ${escapeHtml(input.selling)}。</p>
          </div>
          <div class="ps-result-block">
            <h5>投放建议</h5>
            <ul>
              <li>${escapeHtml(scene.tip)}</li>
              <li>${escapeHtml(style.copy)}</li>
              <li>建议同时生成 3 张变体:纯主图、带卖点版、详情页首屏版。</li>
            </ul>
          </div>
          <div class="ps-result-block">
            <h5>PicSpark 提示词</h5>
            <p>${escapeHtml(prompt)}</p>
            <div class="try-actions">
              <button class="try-btn primary" onclick="copyPicsparkPrompt('${wfId}')"><i class="fas fa-copy"></i> 复制提示词</button>
              <button class="try-btn" onclick="openExternalWorkflow('${wfId}')">去 PicSpark 高清生成</button>
            </div>
          </div>
        </div>
      </div>
    `;
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> 重新生成';
    }
    showToast('PicSpark 演示结果已生成');
  }, 900);
}

function copyPicsparkPrompt(wfId) {
  const prompt = _picsparkPromptCache[wfId];
  if (!prompt) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prompt)
      .then(() => showToast('提示词已复制'))
      .catch(() => showToast('复制失败,可手动选中文本', true));
  } else {
    showToast('当前浏览器不支持自动复制', true);
  }
}

// 数字闪烁动画
function flashNum(el) {
  if (!el) return;
  el.classList.remove('num-flash');
  void el.offsetWidth; // 重启动画
  el.classList.add('num-flash');
}

console.log('FlowHub Demo · 全部加载完成 · 可以开始使用了');
