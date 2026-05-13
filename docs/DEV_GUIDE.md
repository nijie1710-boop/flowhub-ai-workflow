# FlowHub 开发者文档

> 版本:v1.0 · 2026 年 5 月
> 适用对象:全栈开发 / 前端 / 后端 / Claude Code

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [数据模型](#4-数据模型)
5. [API 设计](#5-api-设计)
6. [核心业务流程](#6-核心业务流程)
7. [前端规范](#7-前端规范)
8. [部署架构](#8-部署架构)
9. [开发里程碑](#9-开发里程碑)
10. [常见问题](#10-常见问题)

---

## 1. 项目概述

### 1.1 一句话定位
FlowHub 是一个 **AI 工作流市场平台**,商业模式类似「App Store + Apple Music」 —— 用户付月费订阅,解锁全场自营工作流;同时第三方品牌可购买推荐位。

### 1.2 三方角色

```
┌─────────────────────────────────────────────────┐
│             FlowHub 平台(运营方)                │
└─────────────────────────────────────────────────┘
         ↑                                ↑
         │ 70%分账                         │ CPC/包位费
         │                                │
┌────────┴───────┐              ┌────────┴─────────┐
│  创作者         │              │   广告主          │
│  (上架工作流)   │              │  (购买推荐位)     │
└────────────────┘              └──────────────────┘
         ↓ 提供服务                      ↓ 引流
         │                              │
         └────────┐         ┌───────────┘
                  ↓         ↓
              ┌─────────────────┐
              │   C 端用户        │
              │  (¥39/月订阅)    │
              └─────────────────┘
```

### 1.3 商业模式

| 收入来源 | 占比预估 | 计算方式 |
|---|---|---|
| Pro 会员订阅 | 70% | ¥39 × 月活会员数 |
| 推广位 CPC | 20% | ¥0.8-2 × 点击次数 |
| 推广位包位 | 10% | ¥3000-8000 × 包位数 |

### 1.4 关键指标

| 指标 | 目标(第一年) | 衡量频率 |
|---|---|---|
| Pro 月活会员数 | 1000+ | 每月 |
| 月调用次数 | 100,000+ | 每日 |
| 创作者数 | 30+ | 每月 |
| 月留存(订阅续费率) | >70% | 每月 |
| LTV/CAC | >3 | 每季 |

---

## 2. 技术栈

### 2.1 前端

| 类别 | 技术 | 理由 |
|---|---|---|
| 框架 | **Next.js 14** (App Router) | SSR + 路由 + API + 部署一体化 |
| 语言 | **TypeScript** | 类型安全 |
| UI 库 | **Tailwind CSS** + **shadcn/ui** | 设计 token + 现成组件 |
| 状态管理 | **Zustand** | 比 Redux 简单 |
| 表单 | **React Hook Form** + **Zod** | 验证 + 类型 |
| 图表 | **Recharts** | 数据可视化 |
| 富文本 | **Tiptap** | 工作流描述编辑 |
| 国际化 | **next-intl** | 中英双语 |

### 2.2 后端

| 类别 | 技术 | 理由 |
|---|---|---|
| BaaS | **Supabase** | Postgres + Auth + Storage + Realtime 一站式 |
| 数据库 | **PostgreSQL** | Supabase 自带 |
| 文件存储 | **Supabase Storage** | 用户上传 / 工作流封面 |
| 边缘函数 | **Supabase Edge Functions** (Deno) | 处理 Webhook、AI 调用 |
| 短信 | **阿里云短信** / **Twilio** | 验证码 |
| 邮件 | **Resend** | 交易邮件 / 营销邮件 |
| 缓存 | **Upstash Redis** | API 限流 / 排行榜 |

### 2.3 第三方服务

| 服务 | 用途 |
|---|---|
| **Replicate / OpenAI** | AI 工作流执行(图像 / 文本) |
| **Stripe** + **微信支付** + **支付宝** | 支付 |
| **Cloudflare** | CDN + DDoS 防护 |
| **Sentry** | 错误监控 |
| **PostHog** / **Vercel Analytics** | 用户行为分析 |
| **Crisp** / **Intercom** | 客服(替代 demo 里的 AI 客服) |

### 2.4 部署

| 服务 | 用途 |
|---|---|
| **Vercel** | Next.js 前端部署(全球 CDN) |
| **Supabase Cloud** | 后端托管(新加坡 / 东京区) |
| **Cloudflare** | DNS + CDN(可选) |

---

## 3. 项目结构

### 3.1 推荐 monorepo 结构

```
flowhub/
├── apps/
│   ├── web/                  # Next.js 主站
│   │   ├── app/              # App Router 页面
│   │   │   ├── (marketing)/  # 营销页面(未登录可访问)
│   │   │   │   ├── page.tsx
│   │   │   │   └── pricing/
│   │   │   ├── market/       # 工作流市场
│   │   │   ├── workflow/[id]/
│   │   │   ├── me/           # 个人中心
│   │   │   ├── admin/        # 管理后台
│   │   │   ├── creator/      # 创作者后台
│   │   │   ├── advertiser/   # 广告主入驻
│   │   │   ├── wizard/       # 接入向导
│   │   │   ├── api/          # API Routes
│   │   │   │   ├── workflows/
│   │   │   │   ├── clicks/
│   │   │   │   ├── reviews/
│   │   │   │   ├── webhook/  # 第三方回调
│   │   │   │   └── payment/
│   │   │   └── layout.tsx
│   │   ├── components/       # React 组件
│   │   │   ├── ui/           # shadcn 基础组件
│   │   │   ├── workflow/     # 工作流相关
│   │   │   ├── nav/          # 导航
│   │   │   └── ...
│   │   ├── lib/              # 工具函数
│   │   │   ├── supabase/
│   │   │   ├── stripe/
│   │   │   └── utils/
│   │   ├── styles/
│   │   └── public/
│   └── admin/                # (可选) 独立的管理后台
├── packages/
│   ├── ui/                   # 共享 UI 组件库
│   ├── db/                   # Supabase 类型定义
│   ├── config/               # ESLint / TS 配置
│   └── types/                # 共享类型
├── supabase/
│   ├── migrations/           # 数据库迁移
│   ├── seed.sql              # 种子数据
│   └── functions/            # Edge Functions
│       ├── webhook-attribution/
│       └── ai-execute/
├── docs/                     # 文档
├── package.json
├── pnpm-workspace.yaml
└── turbo.json                # Turborepo 配置
```

### 3.2 简化版结构(单仓库,适合 MVP)

```
flowhub/
├── app/
├── components/
├── lib/
├── styles/
├── public/
├── supabase/
│   ├── migrations/
│   └── functions/
└── package.json
```

MVP 阶段先用简化版,后期再拆 monorepo。

---

## 4. 数据模型

### 4.1 表结构

```sql
-- ========== 用户系统 ==========

-- 用户(继承 Supabase Auth 的 auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
  invite_code TEXT UNIQUE,           -- FH + 后6位
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_invite_code ON users(invite_code);

-- 订阅
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly','yearly','team')),
  status TEXT NOT NULL CHECK (status IN ('active','cancelled','expired','trialing')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id TEXT,
  wechatpay_subscription_id TEXT,
  alipay_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ========== 工作流系统 ==========

-- 工作流
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),

  -- 基本信息
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,         -- URL 友好的标识
  tagline TEXT,                       -- 一句话简介
  description TEXT,                   -- Markdown 详细描述
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cover_color TEXT DEFAULT '#1A5D3A',
  cover_image_url TEXT,
  gallery JSONB,                      -- [{label, title, image_url}]

  -- 类型
  type TEXT NOT NULL CHECK (type IN ('self','ad')),
  external_url TEXT,                  -- 推荐位才有
  webhook_url TEXT,                   -- 推荐位回调

  -- 状态
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','reviewing','active','rejected','archived')),
  rejected_reason TEXT,

  -- 指标
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  click_count_30d INTEGER DEFAULT 0,  -- 缓存的 30 天调用数

  -- 定价
  is_free BOOLEAN DEFAULT FALSE,
  pro_only BOOLEAN DEFAULT FALSE,
  cost_per_call INTEGER DEFAULT 1,    -- 消耗多少调用次数

  -- 元信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_type ON workflows(type);
CREATE INDEX idx_workflows_creator ON workflows(creator_id);
CREATE INDEX idx_workflows_slug ON workflows(slug);

-- 调用记录
CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- 上下文
  source TEXT,                       -- 'market' | 'search' | 'detail' | 'recommend'
  search_query TEXT,
  referrer_url TEXT,

  -- 归因(给第三方)
  attribution JSONB,                 -- {fh_uid, wf_id, ts, sig}

  -- 客户端信息
  user_agent TEXT,
  ip_country TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clicks_workflow ON clicks(workflow_id);
CREATE INDEX idx_clicks_user ON clicks(user_id);
CREATE INDEX idx_clicks_created ON clicks(created_at);

-- 评价
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  helpful_count INTEGER DEFAULT 0,
  reply TEXT,                        -- 创作者回复
  reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, user_id)       -- 一个用户对一个工作流只能评一次
);

CREATE INDEX idx_reviews_workflow ON reviews(workflow_id);

-- ========== 广告系统 ==========

-- 推广位定义
CREATE TABLE ad_slots (
  id TEXT PRIMARY KEY,               -- 'hero', 'featured', ...
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  pricing_type TEXT CHECK (pricing_type IN ('cpc','package')),
  base_price DECIMAL,
  max_workflows INTEGER DEFAULT 1,
  description TEXT
);

INSERT INTO ad_slots (id, name, position, pricing_type, base_price, description) VALUES
('hero', '首页 Hero', 'home_hero', 'package', 8000, '首页最显眼大卡,每月包位'),
('featured', '本周精选', 'home_featured', 'cpc', 2.00, '首页精选区,按点击计费'),
('category-top', '分类顶部', 'category_top', 'cpc', 1.50, '分类页顶部位置'),
('category-mid', '分类腰部', 'category_mid', 'cpc', 0.80, '分类页中部位置'),
('detail-side', '详情页侧栏', 'detail_sidebar', 'package', 3000, '工作流详情页侧栏推荐');

-- 推广位申请
CREATE TABLE ad_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES users(id),
  advertiser_name TEXT NOT NULL,
  contact TEXT NOT NULL,

  workflow_id UUID REFERENCES workflows(id), -- 可能是创建新的
  workflow_name TEXT,
  workflow_url TEXT,
  workflow_desc TEXT,

  slot_id TEXT NOT NULL REFERENCES ad_slots(id),
  budget DECIMAL NOT NULL,
  expected_duration_days INTEGER,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','active','expired')),
  rejection_reason TEXT,

  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  active_from TIMESTAMPTZ,
  active_to TIMESTAMPTZ
);

-- ========== 归因系统(第三方工作流) ==========

CREATE TABLE attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fh_user_id UUID NOT NULL REFERENCES users(id),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  external_user_id TEXT,             -- 第三方系统的用户 ID

  -- 归因状态
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','signup','purchased','expired')),

  -- 时间
  click_at TIMESTAMPTZ DEFAULT NOW(),
  signup_at TIMESTAMPTZ,
  first_purchase_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- 金额
  attributed_revenue DECIMAL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attributions_user ON attributions(fh_user_id);
CREATE INDEX idx_attributions_workflow ON attributions(workflow_id);
CREATE INDEX idx_attributions_external ON attributions(external_user_id);

-- ========== 分账系统 ==========

CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  workflow_id UUID REFERENCES workflows(id),

  month DATE NOT NULL,               -- 哪个月的结算

  subscription_share DECIMAL DEFAULT 0,
  ad_revenue DECIMAL DEFAULT 0,
  attribution_revenue DECIMAL DEFAULT 0,
  total_revenue DECIMAL GENERATED ALWAYS AS (
    subscription_share + ad_revenue + attribution_revenue
  ) STORED,

  platform_cut DECIMAL DEFAULT 0,    -- 平台抽成
  net_amount DECIMAL DEFAULT 0,      -- 实际到账

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','disputed')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_ref TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earnings_creator ON earnings(creator_id);
CREATE INDEX idx_earnings_month ON earnings(month);

-- ========== 通知 ==========

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                -- 'review' | 'earning' | 'system' | 'workflow_approved'
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  icon TEXT,
  color TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ========== 调用额度跟踪 ==========

CREATE TABLE usage_quotas (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 50,          -- free=50, pro=1000, team=5000
  reset_at TIMESTAMPTZ
);
```

### 4.2 RLS 安全策略

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户:只能看 / 改自己
CREATE POLICY users_self ON users
  FOR ALL USING (auth.uid() = id);

-- 工作流:任何人可读 active
CREATE POLICY workflows_public_read ON workflows
  FOR SELECT USING (status = 'active');

-- 工作流:创作者可读 / 改自己的
CREATE POLICY workflows_creator ON workflows
  FOR ALL USING (auth.uid() = creator_id);

-- 调用:用户只看自己的
CREATE POLICY clicks_user_read ON clicks
  FOR SELECT USING (auth.uid() = user_id);

-- 调用:任何登录用户可创建
CREATE POLICY clicks_insert ON clicks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 评价:任何人可读
CREATE POLICY reviews_public_read ON reviews
  FOR SELECT USING (TRUE);

-- 评价:用户可写自己的
CREATE POLICY reviews_self_write ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 订阅:用户只看自己的
CREATE POLICY subs_self ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 管理员:绕过所有 RLS(用 service_role key)
```

### 4.3 触发器

```sql
-- 自动生成 invite_code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invite_code := 'FH' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_code
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION generate_invite_code();

-- 评价后更新工作流评分
CREATE OR REPLACE FUNCTION update_workflow_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workflows
  SET rating = (SELECT AVG(rating) FROM reviews WHERE workflow_id = NEW.workflow_id),
      review_count = (SELECT COUNT(*) FROM reviews WHERE workflow_id = NEW.workflow_id)
  WHERE id = NEW.workflow_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_workflow_rating();
```

---

## 5. API 设计

### 5.1 API 路由总览

```
GET    /api/workflows                # 列表(分页 / 筛选 / 搜索)
GET    /api/workflows/[slug]         # 详情
POST   /api/workflows                # 创建(需要创作者权限)
PATCH  /api/workflows/[id]           # 更新
DELETE /api/workflows/[id]           # 删除(软删)

POST   /api/workflows/[id]/click     # 记录调用 + 返回跳转 URL
GET    /api/workflows/[id]/reviews   # 评价列表
POST   /api/workflows/[id]/reviews   # 写评价

GET    /api/user/me                  # 当前用户信息
PATCH  /api/user/me                  # 更新自己
GET    /api/user/me/quota            # 调用额度
GET    /api/user/me/notifications    # 通知列表
PATCH  /api/user/me/notifications/[id] # 标记已读

POST   /api/auth/sms-code            # 发短信验证码
POST   /api/auth/verify              # 验证 + 登录

POST   /api/payment/create-checkout  # 创建支付会话
POST   /api/payment/webhook/stripe   # Stripe 回调
POST   /api/payment/webhook/wechat   # 微信支付回调
POST   /api/payment/webhook/alipay   # 支付宝回调

POST   /api/webhook/attribution      # 第三方归因回调

GET    /api/admin/workflows          # 管理员:工作流列表
PATCH  /api/admin/workflows/[id]/status # 管理员:审核
GET    /api/admin/users              # 管理员:用户列表
GET    /api/admin/stats              # 管理员:数据看板

GET    /api/creator/me/earnings      # 创作者:收益
GET    /api/creator/me/workflows     # 创作者:我的工作流
POST   /api/creator/me/withdraw      # 创作者:申请提现
```

### 5.2 关键 API 详解

#### POST /api/workflows/[id]/click

记录用户调用 + 检查额度 + 返回跳转 URL(或站内执行)

```typescript
// Request
{
  workflow_id: string;
  source?: 'market' | 'search' | 'detail';
  search_query?: string;
}

// Response - 第三方推荐位
{
  type: 'redirect';
  url: 'https://www.picspark.cn/?from=flowhub&wf_id=xxx&uid=xxx&ts=...&sig=...';
}

// Response - 自营工作流
{
  type: 'execute';
  execution_id: string;
  workflow_input_schema: {...};  // 让前端展示输入表单
}

// Response - 额度不足
{
  type: 'quota_exceeded';
  used: 50;
  total: 50;
  upgrade_url: '/pricing';
}

// Response - Pro Only
{
  type: 'pro_required';
  message: '此工作流仅限 Pro 会员';
  upgrade_url: '/pricing';
}
```

#### POST /api/webhook/attribution

第三方系统(如 PicSpark)调用,上报归因事件:

```typescript
// Headers
{
  'Content-Type': 'application/json',
  'X-FlowHub-Signature': 'sha256=<HMAC>',
  'X-FlowHub-Timestamp': '1730000000'
}

// Request Body
{
  event_type: 'signup' | 'purchase' | 'renewal';
  fh_uid: string;          // FlowHub 用户 ID
  workflow_id: string;     // 工作流 ID
  external_user_id: string; // 第三方系统的用户 ID
  amount?: number;         // 付费金额(分)
  currency?: 'CNY' | 'USD';
  occurred_at: string;     // ISO timestamp
}

// Response
{
  ok: true,
  attribution_id: string,
  attributed: boolean      // 是否在归因窗口内
}
```

**HMAC 签名算法**:

```javascript
const signature = crypto.createHmac('sha256', SHARED_SECRET)
  .update(timestamp + JSON.stringify(body))
  .digest('hex');
```

#### POST /api/payment/create-checkout

创建支付会话:

```typescript
// Request
{
  plan: 'monthly' | 'yearly' | 'team';
  payment_method: 'stripe' | 'wechat' | 'alipay';
  return_url?: string;
}

// Response - Stripe
{
  type: 'stripe',
  session_url: 'https://checkout.stripe.com/...',
  session_id: 'cs_...'
}

// Response - 微信支付
{
  type: 'wechat',
  qrcode_url: 'weixin://wxpay/bizpayurl?pr=...',
  order_id: '...',
  expires_at: '...'
}
```

---

## 6. 核心业务流程

### 6.1 用户调用工作流流程

```
1. 用户点击 [立即使用] 按钮
   ↓
2. 前端调用 POST /api/workflows/[id]/click
   ↓
3. 后端检查:
   ├─ 用户已登录?           否 → 引导登录
   ├─ Pro Only 但用户是 free? 是 → 返回 pro_required
   ├─ 额度还够?              否 → 返回 quota_exceeded
   └─ ✅ 全部通过
   ↓
4. 记录 clicks 表
   ↓
5. 扣减 usage_quotas.used + 1
   ↓
6. 判断工作流类型:
   ├─ type=ad → 生成带归因参数的 URL,返回 redirect
   └─ type=self → 返回 execution_id 让前端调用 /api/execute
```

### 6.2 第三方归因流程(以 PicSpark 为例)

```
1. 用户在 FlowHub 点击 PicSpark 卡片
   ↓
2. FlowHub 跳转:
   https://www.picspark.cn/?from=flowhub&wf_id=xxx&uid=u_138xxxx&ts=...&sig=...
   ↓
3. PicSpark 落地页 JS 识别参数,存到 localStorage + Cookie:
   {
     fh_uid: 'u_138xxxx',
     wf_id: 'xxx',
     expires_at: now + 30 days
   }
   ↓
4. 用户在 PicSpark 浏览 / 注册
   ↓
5. 用户注册成功,PicSpark 后端关联归因:
   INSERT INTO picspark.attributions (user_id, fh_uid, source)
   ↓
6. 用户付费 ¥99
   ↓
7. PicSpark 后端触发 Webhook 给 FlowHub:
   POST https://api.flowhub.cn/v1/webhook/attribution
   {event_type: 'purchase', fh_uid: '...', amount: 9900, ...}
   ↓
8. FlowHub 验签 + 记录到 attributions 表
   ↓
9. 月底结算时,根据 attributions 给创作者分账
```

### 6.3 创作者上架工作流流程

```
1. 创作者注册 + 实名认证(可选 KYC)
   ↓
2. 创作者后台 → 新建工作流
   ↓
3. 填写:
   - 名称 / Tagline / 详细描述(Markdown)
   - 分类 / 标签
   - 封面颜色 / 封面图 / 大图轮播
   - 类型(self / ad)
   - 定价(free / pro_only / 消耗次数)
   - 自营:执行 schema(输入参数 / 输出格式)
   - 推荐位:external_url / webhook_url
   ↓
4. 提交审核(status: 'reviewing')
   ↓
5. 平台审核(1-2 工作日):
   ├─ 通过 → status: 'active' + 发通知
   └─ 拒绝 → status: 'rejected' + rejected_reason + 发通知
   ↓
6. active 后即在市场可见
```

---

## 7. 前端规范

### 7.1 设计 token

```css
:root {
  /* 颜色 */
  --ink: #0F0F0E;
  --ink-2: #3A3935;
  --ink-3: #6B6963;
  --ink-4: #A5A39C;

  --bg: #FAFAF7;
  --bg-elev: #FFFFFF;
  --bg-soft: #F2F1ED;

  --line: rgba(15,15,14,0.08);
  --line-strong: rgba(15,15,14,0.16);

  --self: #1A5D3A;
  --self-bg: rgba(26,93,58,0.08);

  --ad: #B85C00;
  --ad-bg: rgba(184,92,0,0.08);

  --pro: #5B3FA8;

  /* 字体 */
  --font-serif: 'Noto Serif SC', serif;
  --font-sans: 'Manrope', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* 半径 */
  --radius: 8px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}

[data-theme="dark"] {
  --ink: #FAFAF7;
  --bg: #0E0E0D;
  --bg-elev: #1A1A18;
  --bg-soft: #242422;
  /* ... */
}
```

### 7.2 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 组件文件 | PascalCase | `WorkflowCard.tsx` |
| 工具函数 | camelCase | `formatPrice.ts` |
| Hook | `use` 开头 | `useWorkflows.ts` |
| 类型 | PascalCase | `Workflow`, `User` |
| 常量 | UPPER_SNAKE | `MAX_QUOTA` |
| CSS 变量 | `--` 前缀 | `--ink-2` |

### 7.3 推荐组件结构

```tsx
// components/workflow/WorkflowCard.tsx
import { Workflow } from '@/types';
import { cn } from '@/lib/utils';
import { Star, Bolt } from 'lucide-react';

interface WorkflowCardProps {
  workflow: Workflow;
  variant?: 'default' | 'compact' | 'featured';
  onClick?: () => void;
}

export function WorkflowCard({ workflow, variant = 'default', onClick }: WorkflowCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 cursor-pointer transition-all",
        "hover:-translate-y-1 hover:shadow-md",
        variant === 'compact' && "p-3"
      )}
      onClick={onClick}
    >
      {/* ... */}
    </article>
  );
}
```

---

## 8. 部署架构

### 8.1 推荐架构图

```
┌──────────────┐
│  Cloudflare  │  DNS + CDN
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
┌──┴──┐  ┌─┴──────────────┐
│Vercel│  │ Vercel Edge    │
│Static│  │ (API Routes)   │
└──────┘  └─┬──────────────┘
            │
            ↓
   ┌────────────────────┐
   │  Supabase          │
   │  ├─ Postgres       │
   │  ├─ Auth           │
   │  ├─ Storage        │
   │  └─ Edge Functions │
   └────────┬───────────┘
            │
            ↓
   ┌────────────────────┐
   │  外部服务           │
   │  ├─ Stripe         │
   │  ├─ Replicate      │
   │  ├─ Resend (邮件)   │
   │  └─ 阿里云短信       │
   └────────────────────┘
```

### 8.2 环境变量清单

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # 只在服务端用,千万别暴露

# 支付
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
WECHATPAY_MCH_ID=...
WECHATPAY_API_KEY=...
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...

# AI 调用
REPLICATE_API_TOKEN=r8_...
OPENAI_API_KEY=sk-...

# 短信(阿里云)
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...
ALIYUN_SMS_TEMPLATE_CODE=...

# 邮件
RESEND_API_KEY=re_...

# 监控
SENTRY_DSN=https://...
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# 归因
ATTRIBUTION_WEBHOOK_SECRET=<随机 32 位字符串,用于 HMAC>

# 网站
NEXT_PUBLIC_SITE_URL=https://flowhub.cn
```

### 8.3 ICP 备案(国内访问必备)

| 步骤 | 时间 | 备注 |
|---|---|---|
| 注册主体准备(营业执照) | 1 天 | 个人 / 公司 均可 |
| 域名实名认证 | 1 天 | 阿里云 / 腾讯云控制台 |
| 提交备案申请 | 1 天 | 选择服务商(阿里云推荐) |
| 服务商审核 | 1-3 天 | |
| 管局审核 | 7-20 天 | 各地速度不同 |
| **总计** | **2-4 周** | |

**重要**:备案期间用海外服务器 + 海外域名先跑

---

## 9. 开发里程碑

### 9.1 MVP(6-8 周)

| 周次 | 目标 | 交付物 |
|---|---|---|
| W1 | 项目初始化 + UI 组件库搭建 | 可访问的空 Next.js 应用 |
| W2 | 数据库 + Auth + 用户系统 | 注册 / 登录 / 个人中心 |
| W3 | 工作流市场 + 详情页 | 浏览 / 搜索 / 评价 |
| W4 | 支付集成(Stripe 优先) | 月付 / 年付 / 取消订阅 |
| W5 | 管理后台 + 创作者后台 | 审核 / 上架 / 收益 |
| W6 | 第一个真实工作流 | PicSpark 完整跑通 |
| W7 | 测试 + Bug 修复 | 内部测试版 |
| W8 | 上线准备 + 备案 | 公开访问 |

### 9.2 验收标准

**MVP 完成的标志**:
- 真实用户能完成「注册 → 订阅 → 调用工作流 → 续费 / 退订」全流程
- 至少 5 个真实工作流上架
- 至少 1 个第三方推广位上架并跑通归因
- 管理员能审核 + 看数据 + 处理结算
- 移动端 / 桌面端体验完整
- Lighthouse 评分:Performance > 80, Accessibility > 90

---

## 10. 常见问题

### Q1: 为什么选 Supabase 不选自建后端?
- MVP 阶段开发速度快(快 3-5 倍)
- 自带 Auth / Storage / Realtime
- 价格:免费 → ¥150/月 → 按量
- 如果后期需要,**可以平滑迁移到自建** Postgres

### Q2: 国内访问 Supabase 慢怎么办?
- Supabase 新加坡 / 东京区:中国大陆访问延迟 100-300ms,可接受
- 严重时:在国内部署 Edge 反向代理(阿里云 / 腾讯云函数)
- 或迁移到 PolarDB / 阿里云 RDS

### Q3: AI 调用成本怎么控制?
- 给每个工作流定义 `cost_per_call`,不同工作流消耗不同次数
- 后端记录真实消耗,如果超过预算,前端显示「正在排队」
- 设置每日上限,达到上限暂停服务避免破产

### Q4: 怎么防止刷量(虚假调用骗分账)?
- **每次调用必须登录用户**
- **同 IP / 同账户 30 秒内重复调用同一工作流不重复计费**
- **凌晨 3-5 点的调用打折计算**(机器人时间)
- **创作者不能调用自己的工作流**(后端拦截)

### Q5: 创作者结算什么时候到账?
- 每月 1 号自动生成上月账单(`earnings` 表)
- 创作者在 5-10 号可以申请提现
- 平台审核 1-3 天
- 15 号统一打款

### Q6: 怎么处理退款 / 退订?
- 用户在订阅周期内退订:本周期可继续使用,周期结束后自动转 free
- 用户要求退款:7 天内可全额退,7 天后不退(平台政策)
- 退款会触发 earnings 表的 dispute(影响创作者已发放收益)

### Q7: 数据怎么备份?
- Supabase 默认每日备份(免费版保留 7 天,付费版 30 天)
- 重要数据(`users`, `subscriptions`, `earnings`)用 cron 每天导出到 S3
- 灾难恢复演练:每季度模拟一次「从备份完整恢复」

---

## 联系 / 协作

- 项目维护者:[你的名字]
- 设计稿:flowhub-starter 项目 index.html 即是设计稿
- 文档反馈:在 docs/ 目录提 issue

---

**文档版本历史**

| 版本 | 日期 | 修改人 | 改动 |
|---|---|---|---|
| v1.0 | 2026-05-12 | Claude | 初稿 |
