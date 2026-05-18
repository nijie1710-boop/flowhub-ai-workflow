# FlowHub AI Workflow

FlowHub 是一个中文 AI 工作流市场平台 demo，当前定位是 App Store 式的 AI 工作流聚合站：用户可以浏览、搜索、运行自营工作流，也可以访问外部工具；管理员可以审核工具提交和查看平台统计。

## 当前技术栈

- 前端：Vite + React
- 样式：原有 CSS 设计 token，保留 FlowHub 既有视觉
- 后端：Express
- 数据库：PostgreSQL，建表脚本在 `supabase/schema.sql`
- 部署：Vercel 静态前端 + Vercel Serverless API

## 目录结构

```txt
flowhub-ai-workflow/
├── index.html                 # Vite 入口 HTML
├── src/
│   ├── main.jsx               # React 启动入口
│   ├── App.jsx                # 应用壳
│   ├── pages/                 # 页面容器
│   │   ├── Market.jsx
│   │   ├── Search.jsx
│   │   ├── Detail.jsx
│   │   ├── Run.jsx
│   │   ├── Admin.jsx
│   │   ├── Creator.jsx
│   │   ├── Advertiser.jsx
│   │   ├── Wizard.jsx
│   │   └── Me.jsx
│   ├── components/            # 共享 UI 组件
│   ├── lib/
│   │   ├── api.js             # 前端 API 封装
│   │   ├── auth.js            # token / theme 本地状态
│   │   ├── seedData.js        # API 不可用时的种子数据
│   │   └── workflowUtils.js   # 工作流展示工具函数
│   └── styles/main.css        # 原有视觉样式
├── public/assets/             # Vite 静态资源
├── server/
│   ├── app.js                 # Express app
│   ├── index.js               # 本地 API 启动入口
│   ├── db.js                  # PostgreSQL 连接
│   ├── middleware/            # 鉴权和限流
│   └── routes/                # auth/workflows/clicks/reviews/submissions/admin/tools
├── api/[...path].js           # Vercel API 入口
├── supabase/schema.sql        # PostgreSQL 建表脚本
└── vercel.json                # Vercel 构建和路由配置
```

## 本地开发

安装前端依赖：

```bash
npm install
```

安装后端依赖：

```bash
cd server
npm install
```

启动前端：

```bash
npm run dev
```

启动 API：

```bash
cd server
cp .env.example .env
npm run dev
```

API 默认运行在 `http://127.0.0.1:3001`，前端默认运行在 `http://127.0.0.1:8000`。

## 数据和登录

前端已经不再把主要业务数据写入 localStorage。当前只保留：

- `flowhub_token`：登录 token
- `flowhub_theme`：主题偏好

工作流、点击、评价、提交审核、后台统计等数据走 Express API + PostgreSQL。数据库连接通过 `server/.env` 配置。

登录默认使用邮箱 + 密码；忘记密码时可以切换到邮箱验证码登录。验证码发送依赖 SMTP 环境变量。

后端 token 默认 7 天过期，可通过环境变量调整：

```bash
AUTH_TOKEN_TTL_DAYS=7
```

## 后端安全

已启用：

- token 鉴权：登录后通过 `Authorization: Bearer <token>` 调用需要登录的接口
- token 过期校验：默认 7 天
- CORS 白名单：只允许本地开发域名和正式 Vercel 域名
- express-rate-limit：
  - auth
  - click
  - review
  - admin

## 构建和部署

本地构建：

```bash
npm run build
```

Vercel 使用：

- `installCommand`: `npm ci && cd server && npm ci`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `/api/*` rewrite 到 `api/[...path].js`

正式域名：

[https://flowhub-ai-workflow.vercel.app](https://flowhub-ai-workflow.vercel.app)

## 迁移说明

当前 React 迁移采用分阶段方式：

1. `Market / Search / Detail / Run / Me / Admin / Creator / Advertiser / Wizard` 已由 React 组件真实渲染。
2. 现有 Vite 构建直接输出 `dist`，不再用单文件 HTML 或 LegacyRuntime 接管主页面。
3. 搜索页保留关键词、分类、类型筛选，并区分“立即使用 / 访问官网 / 推广”状态。
4. 运行页已经迁移健身餐、图片 OCR、文档转 Markdown、网页转 Markdown、Image2Video 分镜画布入口。
5. 管理后台已接入统计接口、pending 工具审核和基础产品信息编辑。
6. 广告主入驻页面已接入推广位申请接口。
7. 后续可以继续把更细的工作流执行器拆成独立 React 组件和后端任务接口。
