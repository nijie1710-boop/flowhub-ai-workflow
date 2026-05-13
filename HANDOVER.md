# FlowHub 项目交接文档

> 交接日期: 2026-05-12  
> 当前版本: v1.0-beta (单文件 HTML + Express API + PostgreSQL)

---

## 一、项目现状

### 已完成功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 卡片市场 | ✅ 完成 | 分类筛选、搜索、排序、15 个种子工作流 |
| 工作流详情 | ✅ 完成 | 大图轮播、介绍、示例输出、评价、推荐关联 |
| 邮箱验证码登录 | ✅ 完成 | QQ SMTP 真实发送、6 位验证码、5 分钟过期 |
| 用户会话持久化 | ✅ 完成 | Token 认证、刷新恢复 |
| 个人中心 | ✅ 完成 | 使用统计、推荐、邀请、账单 |
| 管理员后台 | ✅ 完成 | 总览统计、工作流管理、推广位审核、用户列表 |
| 创作者后台 | ✅ 完成 | 收益面板、趋势图、结算记录 |
| 广告主入驻 | ✅ 完成 | 5 个推广位、申请表单、审核流程 |
| PicSpark 接入向导 | ✅ 完成 | 4 步向导 + 代码示例 |
| AI 客服 | ✅ 完成 | 智能回复、指令跳转 |
| 暗色模式 | ✅ 完成 | 全站适配 |
| 移动端适配 | ✅ 完成 | 底部 Tab 栏 + 抽屉菜单 |
| 通知中心 | ✅ 完成 | 铃铛徽标、通知列表 |
| URL 路由 | ✅ 完成 | History API + 直接 URL 访问支持 |
| 数据库 | ✅ 完成 | PostgreSQL 9 张表、触发器、索引 |
| API 服务 | ✅ 完成 | 20+ 端点、Express + PM2 |
| 分级加载 | ✅ 完成 | 工作流优先 → 统计异步 → 评价懒加载 |

### 未完成 / 模拟的功能

| 功能 | 当前状态 | 需要做的 |
|------|---------|---------|
| 真实支付 | 模拟 (doSubscribe) | 接入支付宝/微信支付/Stripe |
| 工作流站内执行 | 仅 PicSpark 有向导 | 需要接入真实 AI API |
| 创作者 API Key 管理 | 前端 UI 有但无后端 | 实现密钥生成、存储、鉴权 |
| 邀请返利 | 前端 UI 有但无后端 | 实现邀请码归因、自动发放 |
| 用量统计 | 表已建但未使用 | usage_quotas 表需接入调用扣减逻辑 |
| 订阅管理 | 表已建但未使用 | subscriptions 表需接入支付回调 |
| 团队协作 | 未开始 | 数据模型 + 权限体系 |
| 多语言 | 未开始 | i18n 方案选型 |
| UGC 案例市集 | 未开始 | 用户上传、审核、展示 |

---

## 二、关键凭证

> ⚠️ 正式交接后请立即更换所有凭证

| 凭证 | 值 | 位置 |
|------|-----|------|
| 服务器 SSH | `ubuntu@<server-ip>` (密钥登录) | ~/.ssh/ |
| 数据库密码 | `<db-password>` | server/db.js |
| 数据库用户 | `flowhub_app` | server/db.js |
| QQ SMTP 邮箱 | `<smtp-user>` | server/index.js |
| QQ SMTP 授权码 | `<smtp-auth-code>` | server/index.js |

---

## 三、日常运维

### 3.1 查看服务状态

```bash
ssh ubuntu@<server-ip>

# API 进程状态
pm2 list

# API 日志 (最近 20 行)
pm2 logs flowhub-api --lines 20 --nostream

# API 错误日志
pm2 logs flowhub-api --err --lines 20

# 数据库连接测试
PGPASSWORD=<db-password> psql -U flowhub_app -d flowhub -h 127.0.0.1 -c "SELECT 1"

# 健康检查
curl http://localhost:3001/api/health
```

### 3.2 紧急重启

```bash
# 重启 API
pm2 restart flowhub-api

# 重启 Nginx
sudo systemctl restart nginx

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3.3 数据库操作

```bash
# 连接数据库
PGPASSWORD=<db-password> psql -U flowhub_app -d flowhub -h 127.0.0.1

# 常用查询
SELECT COUNT(*) FROM users;                          -- 用户总数
SELECT COUNT(*) FROM users WHERE tier = 'pro';       -- Pro 用户数
SELECT COUNT(*) FROM clicks WHERE clicked_at > NOW() - INTERVAL '1 day'; -- 今日点击
SELECT * FROM users ORDER BY created_at DESC LIMIT 5; -- 最近注册用户
```

### 3.4 给用户设置管理员

```sql
UPDATE users SET is_admin = true WHERE email = 'xxx@qq.com';
```

### 3.5 给用户设置创作者

```sql
UPDATE users SET is_creator = true WHERE email = 'xxx@qq.com';
```

---

## 四、代码修改指南

### 4.1 新增一个 API 端点

在 `server/index.js` 中对应的模块区域 (搜索注释分隔线) 添加:

```javascript
app.get('/api/your-endpoint', async (req, res) => {
  try {
    const result = await pool.query('SELECT ...');
    res.json(ok({ ... }));
  } catch (err) {
    console.error('GET /api/your-endpoint error:', err.message);
    res.status(500).json(fail('SERVER_ERROR', '服务器错误'));
  }
});
```

### 4.2 新增前端页面

1. 在 `index.html` 中添加渲染函数 `function renderXxx() { ... }`
2. 在 `function render()` 中添加对应分支
3. 在 `VIEW_TITLES` 中添加标题
4. 在 `switchView` 的 `initRoute` 中添加合法路由
5. 暗色模式: 检查所有新颜色是否在 `[data-theme="dark"]` 中覆盖
6. 响应式: 检查 1024px / 768px 两档断点

### 4.3 新增种子工作流

在 `index.html` 中找到 `const SEED_DATA`，按格式添加:

```javascript
{
  id: 'wf_seed_xxx',
  name: '工作流名称',
  slug: 'xxx',
  tagline: '一句话介绍',
  description: '详细描述',
  category: '分类名',      // 必须匹配现有分类
  tags: ['标签1', '标签2'],
  type: 'self',            // self=自营, recommend=推荐
  cover_color: '#1A5D3A',
  rating: '4.5',
  review_count: 10,
  seed_clicks: 500,
  seed_clicks_7d: 60,
  is_free: false,
  pro_only: false,
  price_model: 'pro',
  examples: [
    { label: '示例', text: '输入文本', output: '输出文本' }
  ],
  status: 'active',
  created_at: '2026-05-12'
}
```

然后同步到数据库:
```sql
INSERT INTO workflows (id, name, slug, ...) VALUES (...);
```

### 4.4 修改缩略图

搜索 `function getThumbSvg`，按工作流名称/分类添加条件分支。每个缩略图是一个内联 SVG，viewBox 为 `0 0 320 200`。

---

## 五、推荐的迁移路径

### 短期 (1-2 周)

1. **安全加固**
   - 凭证迁移到环境变量 (`process.env.DB_PASSWORD` 等)
   - 加 express-rate-limit 防刷
   - CORS 限制为实际域名
   - Token 加过期时间

2. **代码拆分**
   - 把 9500 行 index.html 拆成模块 (至少 CSS 独立文件)
   - API 路由拆成独立文件 (auth.js, workflows.js, admin.js 等)

### 中期 (1-2 月)

3. **前端框架迁移**
   - 推荐: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
   - 逐页迁移，先做市场页和详情页

4. **真实支付**
   - 国内: 微信支付 + 支付宝
   - 海外: Stripe
   - 接入 subscriptions 表和 usage_quotas 表

5. **工作流执行**
   - 设计统一的工作流调用 SDK
   - 接入第一批 AI API (OpenAI / Claude / 本地模型)

### 长期 (3+ 月)

6. **基础设施**
   - 部署: Vercel (前端) + Supabase Cloud (后端) 或 Docker 化
   - CDN: 静态资源上 CDN
   - 监控: 接入 Sentry 错误追踪

7. **业务扩展**
   - 创作者 API Key 管理
   - 邀请返利真实到账
   - 团队协作
   - 多语言支持
   - UGC 案例市集

---

## 六、已知问题

| 问题 | 严重度 | 说明 |
|------|--------|------|
| 控制台偶现 SyntaxError | 低 | API 响应偶尔为空，resp.json() 失败，不影响功能 |
| 验证码重启丢失 | 中 | 存内存 Map，PM2 重启后正在等待验证的用户需重新获取 |
| Token 无过期 | 中 | 登录后 token 永久有效，安全风险 |
| 管理员/创作者权限 | 低 | 前端判断 role，后端 API 无中间件鉴权 |
| 单文件体积大 | 低 | index.html 约 310KB / 9500 行，首次加载较慢 |

---

## 七、联系与资源

| 项目 | 说明 |
|------|------|
| 项目文件位置 (本地) | `/Users/nijie/Downloads/ai工作流/` |
| 服务器 Web 目录 | `/home/ubuntu/flowhub-web/` |
| 服务器 API 目录 | `/home/ubuntu/flowhub-api/` |
| 线上地址 | `http://<server-ip>:8080/` |
| 开发者文档 | `DEV_GUIDE.md` (同目录) |
| Claude Code 配置 | `CLAUDE.md` (同目录) |
