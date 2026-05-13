# FlowHub 开发者文档

> 最后更新: 2026-05-12  
> 版本: v1.0-beta

---

## 1. 项目概览

FlowHub 是一个 **AI 工作流聚合市场平台**，模式类似 App Store + Apple Music。

### 1.1 商业模式

| 角色 | 说明 |
|------|------|
| **C 端用户** | 付费 ¥39/月订阅，解锁全场自营工作流 |
| **创作者** | 上架自研工作流，收益分账 70/30 |
| **广告主** | 第三方工作流通过推荐位收 CPC / 包位费 |

### 1.2 订阅层级

| 层级 | 价格 | 月调用额度 | 权限 |
|------|------|-----------|------|
| Free | 免费 | 50 次 | 仅免费工作流 |
| Pro | ¥39/月 | 1,000 次 | 全场工作流 + 优先支持 |
| Team | ¥99/人/月 | 5,000 次 | 团队协作 |

---

## 2. 技术架构

```
                    ┌──────────────┐
                    │   用户浏览器   │
                    └──────┬───────┘
                           │ HTTP :8080
                    ┌──────┴───────┐
                    │    Nginx     │
                    │ (反向代理+SPA) │
                    └──┬───────┬───┘
           静态文件 /   │       │  /api/*
    ┌──────────────┐   │  ┌────┴──────────┐
    │ flowhub-web/ │   │  │  Express API  │
    │  index.html  │   │  │  :3001 (PM2)  │
    └──────────────┘   │  └───────┬───────┘
                       │          │
                       │  ┌───────┴───────┐
                       │  │  PostgreSQL   │
                       │  │  :5432        │
                       │  └───────────────┘
                       │
                       │  ┌───────────────┐
                       │  │  QQ SMTP      │
                       │  │ (验证码邮件)    │
                       │  └───────────────┘
```

### 2.1 服务器环境

| 项目 | 值 |
|------|-----|
| 服务器 | 腾讯云香港 <server-ip> |
| 操作系统 | Ubuntu |
| Node.js | v20.20.2 |
| PostgreSQL | 14 |
| 进程管理 | PM2 (进程名: flowhub-api, ID: 3) |
| Web 服务 | Nginx :8080 |
| API 端口 | :3001 |

### 2.2 目录结构

**服务器端:**
```
/home/ubuntu/flowhub-web/     ← Nginx web root (前端)
    index.html                ← 单文件前端应用 (~9500 行)

/home/ubuntu/flowhub-api/     ← API 服务
    index.js                  ← Express 主文件 (~600 行)
    db.js                     ← PostgreSQL 连接池
    package.json              ← 依赖清单
    node_modules/
```

**本地开发:**
```
/Users/nijie/Downloads/ai工作流/
    index.html                ← 前端源码
    CLAUDE.md                 ← Claude Code 项目配置
    DEV_GUIDE.md              ← 本文档
    HANDOVER.md               ← 交接文档
    server/
        index.js              ← API 源码
        db.js                 ← 数据库连接
        package.json
```

---

## 3. 前端架构 (index.html)

### 3.1 技术栈

- **纯 HTML + CSS + 原生 JavaScript**，无框架、无构建工具
- 数据缓存: `localStorage` key = `flowhub_full_v1`
- API 数据缓存: 内存变量 `_apiCache`, `_clickStats`, `_reviewsCache`

### 3.2 核心配色

```css
--ink: #0F0F0E        /* 主文字 */
--bg: #FAFAF7         /* 主背景 */
--self: #1A5D3A       /* 自营色 - 绿 */
--ad: #B85C00         /* 推荐色 - 橙 */
--pro: #5B3FA8        /* Pro 紫 */
```

字体: `Noto Serif SC`(中文标题) + `Manrope`(西文) + `JetBrains Mono`(数字/代码)

### 3.3 路由系统

采用 History API 单页路由，由 `switchView(view)` 驱动:

| 路由 | view 名 | 渲染函数 | 说明 |
|------|---------|---------|------|
| `/` | market | `renderMarket()` | 首页市场 |
| `/detail` | detail | `renderDetail()` | 工作流详情 |
| `/me` | me | `renderMe()` | 个人中心 |
| `/admin` | admin | `renderAdmin()` | 管理员后台 |
| `/creator` | creator | `renderCreator()` | 创作者后台 |
| `/advertiser` | advertiser | `renderAdvertiser()` | 广告主入驻 |
| `/wizard` | wizard | `renderWizard()` | PicSpark 接入向导 |

**路由初始化**: 页面加载时解析 `location.pathname` 恢复正确视图 (支持直接 URL 访问)。

### 3.4 数据加载策略 (分级异步)

```
页面加载 → loadDataFromAPI()
             │
             ├─ [P0 同步] GET /api/workflows    → 渲染市场卡片
             │
             ├─ [P1 异步] loadClickStatsAsync()  → 补充点击数据
             │           GET /api/clicks/stats
             │
             ├─ [P1 异步] loadAdDataAsync()       → 补充推广位数据
             │           GET /api/ad-applications
             │           GET /api/ad-slots
             │
             └─ [P2 懒加载] loadReviewsForWorkflow(id)  → 进详情页才加载
                           GET /api/workflows/:id/reviews
```

### 3.5 关键代码位置 (Ctrl+F 搜索)

| 区块 | 搜索关键字 |
|------|----------|
| 配色变量 | `:root {` |
| 暗色模式 | `[data-theme="dark"]` |
| 种子数据 | `const SEED_DATA` |
| 工作流卡片 | `function renderWfCard` |
| 缩略图生成 | `function getThumbSvg` |
| 大图轮播 | `function getGallerySlides` |
| 市场首页 | `function renderMarket` |
| 详情页 | `function renderDetail` |
| 个人中心 | `function renderMe` |
| 管理员后台 | `function renderAdmin` |
| 创作者后台 | `function renderCreator` |
| 广告主入驻 | `function renderAdvertiser` |
| 接入向导 | `function renderWizard` |
| AI 客服 | `function getChatReply` |
| 邮箱验证码 | `function sendEmailCode` |
| 认证流程 | `function doAuth` |
| 会话恢复 | `function restoreSession` |
| 路由切换 | `function switchView` |
| 路由初始化 | `function initRoute` |

### 3.6 认证流程

```
用户输入邮箱 → sendEmailCode()
               │
               ├─ POST /api/auth/send-code { email }
               │  → 服务器生成 6 位验证码
               │  → QQ SMTP 发送邮件
               │  → 内存存储 (5分钟过期, 60秒防刷)
               │
               └─ 用户输入验证码 → doAuth('login'|'register')
                                   │
                                   ├─ POST /api/auth/login { email, code }
                                   │  → 校验验证码 → 查询用户 → 生成 token
                                   │
                                   └─ POST /api/auth/register { email, code, name }
                                      → 校验验证码 → 创建用户 → 生成 token

登录成功 → token 存 localStorage('flowhub_token')
        → 用户信息存 localStorage('flowhub_full_v1').user
        → 页面刷新时 restoreSession() 用 token 恢复
```

---

## 4. 后端 API

### 4.1 依赖

```json
{
  "cors": "^2.8.5",
  "express": "^4.21.0",
  "nodemailer": "^6.9.0",
  "pg": "^8.13.0"
}
```

### 4.2 API 端点清单

#### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/send-code` | 发送邮箱验证码 | 无 |
| POST | `/api/auth/login` | 邮箱 + 验证码登录 | 无 |
| POST | `/api/auth/register` | 邮箱 + 验证码注册 | 无 |
| GET | `/api/auth/me` | 获取当前用户信息 | Bearer token |

#### 工作流

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/api/workflows` | 分页查询工作流 | category, type, search, sort, page, limit |
| GET | `/api/workflows/:id` | 获取单个工作流详情 | id 或 slug |
| POST | `/api/workflows/:id/click` | 记录点击/调用 | source, search_query, user_id |
| GET | `/api/workflows/:id/reviews` | 获取工作流评价 | sort, page, limit |
| POST | `/api/workflows/:id/reviews` | 提交评价 | user_name, avatar, rating, text |

#### 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clicks/stats` | 所有工作流点击统计 (总量 + 7天) |

#### 推广位

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ad-slots` | 获取所有推广位 |
| GET | `/api/ad-applications` | 获取推广位申请列表 |
| POST | `/api/ad-applications` | 提交推广位申请 |
| PATCH | `/api/ad-applications/:id/status` | 更新申请状态 |

#### 管理后台

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 管理后台总览统计 |
| GET | `/api/admin/workflows` | 管理全部工作流 |
| PATCH | `/api/admin/workflows/:id/status` | 更新工作流状态 |

#### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| GET | `/api/data` | 全量数据 (兼容旧前端) |
| GET | `/api/health` | 健康检查 |

### 4.3 统一响应格式

```javascript
// 成功
{ "ok": true, "data": { ... } }

// 失败
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "描述" } }
```

常用错误码:
- `INVALID_PARAMS` — 参数校验失败
- `UNAUTHORIZED` — 未登录或 token 失效
- `USER_NOT_FOUND` — 用户不存在
- `USER_EXISTS` — 用户已注册
- `INVALID_CODE` — 验证码错误或过期
- `RATE_LIMIT` — 发送过于频繁
- `SERVER_ERROR` — 服务器内部错误

### 4.4 邮箱验证码配置

```javascript
// SMTP (QQ 邮箱)
host: 'smtp.qq.com'
port: 465 (SSL)
user: '<smtp-user>'
pass: '<smtp-auth-code>'   // QQ 邮箱授权码

// 验证码规则
长度: 6 位数字
有效期: 5 分钟
防刷: 同一邮箱 60 秒内不能重复发送
存储: 内存 Map (服务重启会清空)
```

---

## 5. 数据库 (PostgreSQL)

### 5.1 连接信息

```
host: 127.0.0.1
port: 5432
database: flowhub
user: flowhub_app
password: <db-password>
```

### 5.2 表结构总览

```
users               ← 用户表 (UUID PK)
  ├─ workflows      ← 工作流表 (creator_id FK)
  ├─ clicks         ← 点击/调用记录
  ├─ reviews        ← 评价表 (有触发器自动更新 rating)
  ├─ subscriptions  ← 订阅记录
  ├─ usage_quotas   ← 月度使用额度
  └─ notifications  ← 通知

ad_slots            ← 推广位配置 (独立)
ad_applications     ← 推广位申请 (独立)
```

### 5.3 核心表字段

#### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键, 自动生成 |
| email | TEXT | 登录邮箱 (UNIQUE) |
| phone | TEXT | 手机号 (已废弃, 保留兼容) |
| name | TEXT | 昵称 |
| tier | TEXT | free / pro / team |
| token | TEXT | 登录 token (crypto.randomBytes) |
| is_admin | BOOLEAN | 管理员标记 |
| is_creator | BOOLEAN | 创作者标记 |
| created_at | TIMESTAMPTZ | 注册时间 |

#### workflows
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 (如 wf_seed_picspark) |
| name | TEXT | 工作流名称 |
| slug | TEXT | URL 友好名 (UNIQUE) |
| category | TEXT | 分类 (设计·海报 / 编程·开发 等) |
| type | TEXT | self=自营 / recommend=推荐(第三方) |
| status | TEXT | draft / reviewing / active / rejected / archived |
| rating | NUMERIC(2,1) | 平均评分 (触发器自动更新) |
| review_count | INT | 评价数 (触发器自动更新) |
| seed_clicks | INT | 种子点击数 (演示数据) |
| is_free | BOOLEAN | 是否免费 |
| pro_only | BOOLEAN | 是否仅 Pro 可用 |
| price_model | TEXT | pro=会员 / cpc=按点击 |
| examples | JSONB | 示例输入输出 |
| target_url | TEXT | 第三方跳转 URL |

#### reviews (带触发器)
| 触发器 | 时机 | 作用 |
|--------|------|------|
| update_rating_on_review | INSERT/UPDATE/DELETE | 自动更新 workflows.rating 和 review_count |

### 5.4 种子数据

数据库中有 **15 个种子工作流**:

**自营 (9 个)**:
1. PicSpark · 商品图 AI (设计·海报)
2. 小红书爆款笔记生成 (写作·文案)
3. 品牌色板生成 (设计·海报)
4. 数据清洗助手 (数据·分析)
5. 节日海报生成器 (设计·海报)
6. 代码 Review 助手 (编程·开发)
7. SQL 查询生成器 (编程·开发)
8. 多语言翻译大师 (效率·办公)
9. 会议纪要提取 (效率·办公)

**推荐/合作方 (6 个)**:
1. 邮件模板工厂 (效率·办公)
2. 合同风险审查 (效率·办公)
3. 竞品监控周报 (数据·分析)
4. 简历优化助手 (其他)
5. 社媒排期管家 (营销·增长)
6. SEO 文章优化器 (营销·增长)

---

## 6. 部署流程

### 6.1 部署命令 (从本地)

```bash
# 1. 上传前端
scp index.html ubuntu@<server-ip>:/home/ubuntu/flowhub-web/index.html

# 2. 上传后端
scp server/index.js ubuntu@<server-ip>:/home/ubuntu/flowhub-api/index.js
scp server/package.json ubuntu@<server-ip>:/home/ubuntu/flowhub-api/package.json

# 3. 安装新依赖 (如果 package.json 变更)
ssh ubuntu@<server-ip> "cd /home/ubuntu/flowhub-api && npm install"

# 4. 重启 API
ssh ubuntu@<server-ip> "pm2 restart flowhub-api"

# 5. 检查日志
ssh ubuntu@<server-ip> "pm2 logs flowhub-api --lines 10 --nostream"
```

### 6.2 PM2 常用命令

```bash
pm2 list                              # 查看所有进程
pm2 restart flowhub-api               # 重启
pm2 logs flowhub-api --lines 20       # 查看日志
pm2 logs flowhub-api --err --lines 20 # 仅错误日志
pm2 monit                             # 实时监控
```

### 6.3 Nginx 配置

配置文件: `/etc/nginx/sites-enabled/flowhub`

```nginx
server {
    listen 8080;
    root /home/ubuntu/flowhub-web;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;  # SPA 路由支持
    }
}
```

修改后执行:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. 本地开发

### 7.1 启动 API

```bash
cd server/
npm install
node index.js
# 或者: npm start
# API 运行在 http://localhost:3001
```

> 注意: 本地 `db.js` 连接远程数据库 (127.0.0.1:5432)，需通过 SSH 隧道或修改为远程 IP。

### 7.2 前端开发

直接在浏览器打开 `index.html` 即可。

API 地址切换: 搜索 `API_BASE` 变量，修改为本地或远程地址:
```javascript
const API_BASE = 'http://<server-ip>:8080/api';  // 远程
// const API_BASE = 'http://localhost:3001/api';     // 本地
```

### 7.3 暗色模式

通过 `[data-theme="dark"]` CSS 变量覆盖实现，所有新组件必须同时考虑暗色配色。

### 7.4 响应式断点

```css
@media (max-width: 1024px) { ... }  /* 平板 */
@media (max-width: 768px)  { ... }  /* 手机 */
```

移动端有底部 Tab 栏 + 抽屉菜单。

---

## 8. 安全注意事项

- Token 存储在 `localStorage`，无过期机制 (建议后续加 JWT + refresh token)
- 邮箱验证码存内存 Map，PM2 重启会丢失
- SMTP 授权码硬编码在 index.js (建议迁移到环境变量)
- 数据库密码硬编码在 db.js (建议迁移到环境变量)
- API 无速率限制 (建议加 express-rate-limit)
- CORS 完全开放 (建议限制 origin)
