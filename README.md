# FlowHub Starter

AI 工作流市场平台 - 起步雏形

## 快速预览

直接双击 `index.html` 即可在浏览器打开,无需任何依赖。

## 用 Claude Code 改这个项目

```bash
# 进入项目目录
cd flowhub-starter

# 启动 Claude Code
claude
```

Claude Code 会自动读取 `CLAUDE.md` 了解项目背景。

## 文件结构

```
flowhub-starter/
├── CLAUDE.md          # Claude Code 项目指南(必读)
├── README.md          # 本文件
├── index.html         # 主 demo 文件(单文件 HTML)
├── server/            # Express API 服务
├── supabase/          # PostgreSQL 建表和种子数据脚本
└── docs/              # 文档目录
    ├── DATA_MODEL.md  # 数据模型说明
    ├── BUSINESS.md    # 业务规则
    └── ROADMAP.md     # 开发路线图
```

## 数据存储

当前所有数据存在 localStorage,key = `flowhub_full_v1`。

清除数据:打开浏览器 → DevTools (F12) → Console:
```js
localStorage.clear()
```

或者:点击页面顶部黑色 demo bar 右侧的「重置数据」。

## API 本地启动

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

启动前需要把 `.env` 里的数据库和 SMTP 配置改成真实值。SQL 建表和种子数据在 `supabase/schema.sql`、`supabase/seed.sql`。

## 推荐改造路径

如果你想把这个 demo 改成真实可上线产品,我推荐顺序:

1. **Step 1**:拆分 index.html(单文件太大,Claude Code 改起来累)
2. **Step 2**:接入 Supabase 替换 localStorage
3. **Step 3**:接入真实支付(Stripe 或国内)
4. **Step 4**:部署到 Vercel
5. **Step 5**:加 SEO 落地页

## 联系

如果是基于本 demo 二次开发,记得保留 FlowHub 设计 token 和品牌色板。
