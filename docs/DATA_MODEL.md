# FlowHub 数据模型

## 当前 localStorage 结构

```typescript
interface AppData {
  workflows: Workflow[];
  clicks: Click[];
  reviews: Review[];
  ad_applications: AdApplication[];
  ad_slots: AdSlot[];
  user: User | null;
  _notifs: Notification[];
}
```

## 各模型详细字段

### Workflow(工作流)
```typescript
interface Workflow {
  id: string;                    // 'wf_seed_picspark'
  name: string;                  // 'PicSpark · 商品图 AI'
  tagline: string;               // '电商商品图 AI 生成'
  description: string;           // 详细介绍 200-500 字
  category: string;              // '电商设计' | '内容营销' | '简历求职' ...
  tags: string[];                // ['商品图', '换背景', 'AI']
  type: 'self' | 'ad';          // 自营 vs 第三方推荐
  cover_color: string;           // '#1A5D3A'
  rating: number;                // 4.8
  review_count: number;          // 156
  status: 'active' | 'draft';    // 上下架
  external_url?: string;         // 推荐位才有跳转 URL
  examples?: Example[];          // 输入输出示例
  created_at: string;            // ISO 时间
  pricing?: {
    is_free: boolean;
    pro_only: boolean;
  };
}
```

### Click(调用记录)
```typescript
interface Click {
  id: string;
  workflow_id: string;
  user_id: string;
  timestamp: string;
  source?: 'market' | 'search' | 'recommendation';
}
```

### Review(评价)
```typescript
interface Review {
  id: string;
  workflow_id: string;
  user_name: string;
  avatar: string;       // 单字头像
  rating: number;       // 1-5
  text: string;
  date: string;
}
```

### AdApplication(推广位申请)
```typescript
interface AdApplication {
  id: string;
  advertiser_name: string;
  contact: string;
  workflow_name: string;
  workflow_url: string;
  workflow_desc: string;
  slot: 'hero' | 'featured' | 'category-top' | 'category-mid' | 'detail-side';
  budget: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}
```

### User(用户)
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  tier: 'free' | 'pro' | 'team';
  joined_at: string;
  subscription?: {
    next_renewal: string;
    plan: 'monthly' | 'yearly';
  };
}
```

## 推荐 Supabase 表结构

```sql
-- 用户
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  phone TEXT UNIQUE,
  name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  next_renewal TIMESTAMPTZ
);

-- 工作流
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT,
  tags TEXT[],
  type TEXT CHECK (type IN ('self','ad')),
  cover_color TEXT,
  rating DECIMAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('active','draft','rejected')),
  external_url TEXT,
  examples JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pro_only BOOLEAN DEFAULT false
);

CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_type ON workflows(type);

-- 调用记录
CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  user_id UUID REFERENCES users(id),
  source TEXT,
  attribution JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clicks_workflow ON clicks(workflow_id);
CREATE INDEX idx_clicks_user ON clicks(user_id);
CREATE INDEX idx_clicks_created ON clicks(created_at);

-- 评价
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan TEXT CHECK (plan IN ('monthly','yearly')),
  status TEXT CHECK (status IN ('active','cancelled','expired')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT
);

-- 推广位申请
CREATE TABLE ad_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_name TEXT,
  contact TEXT,
  workflow_name TEXT,
  workflow_url TEXT,
  workflow_desc TEXT,
  slot TEXT,
  budget DECIMAL,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

-- 归因 (PicSpark 等第三方)
CREATE TABLE attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fh_uid UUID REFERENCES users(id),
  external_user_id TEXT,
  workflow_id UUID REFERENCES workflows(id),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 分账记录
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  workflow_id UUID REFERENCES workflows(id),
  month DATE,
  subscription_share DECIMAL,
  ad_revenue DECIMAL,
  platform_cut DECIMAL,
  net_amount DECIMAL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','disputed')),
  paid_at TIMESTAMPTZ
);
```

## RLS 策略示例

```sql
-- 用户只能看自己的数据
CREATE POLICY users_self ON users
  FOR ALL USING (auth.uid() = id);

-- 任何人可读 active 工作流
CREATE POLICY workflows_public_read ON workflows
  FOR SELECT USING (status = 'active');

-- 创作者管理自己的工作流
CREATE POLICY workflows_creator_write ON workflows
  FOR ALL USING (auth.uid() = creator_id);

-- 用户只看自己的调用记录
CREATE POLICY clicks_user ON clicks
  FOR SELECT USING (auth.uid() = user_id);
```
