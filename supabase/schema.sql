-- FlowHub 数据库建表脚本
-- 目标: PostgreSQL 14+ on 腾讯云香港服务器

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== 用户系统 ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
  token TEXT,
  token_created_at TIMESTAMPTZ,
  invite_code TEXT UNIQUE,
  invited_by UUID REFERENCES users(id),
  is_creator BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_token ON users(token) WHERE token IS NOT NULL;

-- ========== 订阅 ==========
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly','yearly','team')),
  status TEXT NOT NULL CHECK (status IN ('active','cancelled','expired','trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ========== 工作流 ==========
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  tagline TEXT,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  cover_color TEXT DEFAULT '#1A5D3A',
  cover_image_url TEXT,
  gallery JSONB,
  type TEXT NOT NULL CHECK (type IN ('self','ad','recommend')),
  target_url TEXT,
  external_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','reviewing','active','rejected','archived')),
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  seed_clicks INTEGER DEFAULT 0,
  seed_clicks_7d INTEGER DEFAULT 0,
  price_model TEXT DEFAULT 'pro',
  price_amount DECIMAL DEFAULT 0,
  is_free BOOLEAN DEFAULT FALSE,
  pro_only BOOLEAN DEFAULT FALSE,
  cost_per_call INTEGER DEFAULT 1,
  examples JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type);

-- ========== 调用记录 ==========
CREATE TABLE IF NOT EXISTS clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source TEXT,
  search_query TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_workflow ON clicks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_clicks_user ON clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);

-- ========== 评价 ==========
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  avatar TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  helpful_count INTEGER DEFAULT 0,
  reply TEXT,
  reply_at TIMESTAMPTZ,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_workflow ON reviews(workflow_id);

-- ========== 推广位定义 ==========
CREATE TABLE IF NOT EXISTS ad_slots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  daily_impressions INTEGER DEFAULT 0,
  ctr_baseline TEXT,
  package_price DECIMAL DEFAULT 0,
  package_unit TEXT DEFAULT 'week',
  cpc_min DECIMAL DEFAULT 0
);

-- ========== 推广位申请 ==========
CREATE TABLE IF NOT EXISTS ad_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  advertiser_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  workflow_name TEXT,
  workflow_url TEXT,
  workflow_desc TEXT,
  slot TEXT NOT NULL,
  price_model TEXT,
  price DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','active','expired')),
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 通知 ==========
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  icon TEXT,
  color TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ========== 调用额度 ==========
CREATE TABLE IF NOT EXISTS usage_quotas (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  used INTEGER DEFAULT 0,
  total INTEGER DEFAULT 50
);

-- ========== 触发器: 评价后更新评分 ==========
CREATE OR REPLACE FUNCTION update_workflow_rating()
RETURNS TRIGGER AS $$
DECLARE
  affected_workflow_id TEXT;
BEGIN
  affected_workflow_id := COALESCE(NEW.workflow_id, OLD.workflow_id);

  UPDATE workflows
  SET rating = COALESCE(ROUND((SELECT AVG(rating) FROM reviews WHERE workflow_id = affected_workflow_id)::NUMERIC, 1), 0),
      review_count = (SELECT COUNT(*) FROM reviews WHERE workflow_id = affected_workflow_id)
  WHERE id = affected_workflow_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rating_on_review ON reviews;
CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_workflow_rating();
