# FlowHub - AI 工作流市场平台

## 项目背景

FlowHub 是一个 AI 工作流聚合平台,模式类似 App Store + Apple Music。

**核心商业模式**:
- 用户付 ¥39/月订阅,解锁全场自营工作流
- 第三方工作流通过推荐位收 CPC / 包位费
- 自营工作流分账:创作者 70% / 平台 30%

**三层定位**:
- 平台方(运营)
- 创作者(自研工作流 + 第三方上架)
- C 端用户(订阅)

## 当前状态

这是一个**完整的单文件 HTML demo**(index.html · 301KB · 8000+ 行),包含:
- 卡片市场 + 工作流详情(含大图轮播)
- 用户中心(订阅 / 邀请 / 账单)
- 管理员后台(总览 / 工作流 / 推广位审核 / 用户)
- 创作者后台(收益 / 趋势 / 结算)
- 广告主入驻(5 个推广位)
- PicSpark 接入向导(4 步带代码示例)
- AI 客服悬浮(智能回复 + 指令跳转)
- 移动端原生体验(底部 Tab 栏 + 抽屉)
- 暗黑模式 / 通知中心 / 欢迎气泡

## 技术栈

**当前**:纯 HTML + CSS + 原生 JS,数据存 localStorage(key=`flowhub_full_v1`)

**推荐迁移到**:
- 前端:Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- 后端:Supabase (Auth + Postgres + Storage)
- 支付:Stripe (海外) / 微信支付 + 支付宝 (国内)
- 部署:Vercel (前端) + Supabase Cloud (后端)

## 核心配色

```css
--ink: #0F0F0E        /* 主文字 */
--bg: #FAFAF7         /* 主背景 */
--self: #1A5D3A       /* 自营色 - 绿 */
--ad: #B85C00         /* 推荐色 - 橙 */
--pro: #5B3FA8        /* Pro 紫 */
```

字体:Noto Serif SC(中文标题) + Manrope(西文) + JetBrains Mono(数字 / 代码)

## 关键代码位置(index.html)

按 Ctrl+F 搜索可定位:

| 区块 | 搜索关键字 |
|---|---|
| 配色变量 | `:root {` |
| 暗色模式 | `[data-theme="dark"]` |
| 种子数据 | `const SEED_DATA` |
| 工作流卡片 | `function renderWfCard` |
| 缩略图生成 | `function getThumbSvg` |
| 大图轮播 | `function renderGallerySlides` / `function getGallerySlides` |
| 市场首页 | `function renderMarket` |
| 详情页 | `function renderDetail` |
| 个人中心 | `function renderMe` |
| 管理员后台 | `function renderAdmin` |
| 创作者后台 | `function renderCreator` |
| 广告主入驻 | `function renderAdvertiser` |
| 接入向导 | `function renderWizard` |
| AI 客服 | `function getChatReply` / `function sendChatMsg` |
| 模拟支付 | `function doSubscribe` |
| 主路由 | `function render()` 和 `function switchView` |

## 数据模型(localStorage 结构)

```typescript
{
  workflows: Workflow[],
  clicks: Click[],
  reviews: Review[],
  ad_applications: AdApplication[],
  ad_slots: AdSlot[],
  user: User | null,
  _notifs: Notification[]
}

interface Workflow {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  type: 'self' | 'ad';     // 自营 vs 推荐
  cover_color: string;
  rating: number;
  review_count: number;
  status: 'active' | 'draft';
  external_url?: string;    // 推荐位才有
  examples?: Example[];
}
```

## 业务规则

1. **免费用户**:每月 50 次调用,只能使用「免费」工作流
2. **Pro 用户**(¥39/月):每月 1000 次,全场工作流 + 优先支持
3. **Team**(¥99/人/月):5000 次 + 团队协作
4. **第三方工作流点击**:外跳 URL + 带归因参数 `?from=flowhub&wf_id=xxx&uid=xxx`
5. **创作者结算**:月结,次月 15 号到账,最低提现 ¥100

## 我希望 Claude Code 帮我做的方向

(按优先级,你想做哪个就让 Claude Code 做哪个)

### 🥇 立即可做
- **R1**:把数据层从 localStorage 迁移到 Supabase
- **F2**:实现「站内执行」第一个工作流(PicSpark 在线试用)
- **B5**:生成完整的开发文档 + SQL 建表脚本

### 🥈 中期
- **R2**:接入支付宝 / Stripe 真实支付
- **F1**:创作者 API Key 管理
- **C1**:扩到 30 个种子工作流

### 🥉 长期
- 多语言支持
- 团队协作
- UGC 案例市集

## 给 Claude Code 的提示

如果你是 Claude Code,**在改这个项目时请遵守**:

1. **保持设计风格** - 不要破坏现有的配色 token 和字体规范
2. **拆分文件** - 现在所有代码都在一个 HTML 里,你的第一步通常是拆分(CSS 抽出 / JS 拆模块)
3. **保留 SEED_DATA** - 5 个种子工作流的内容是核心样本数据,扩充时保留这 5 个
4. **暗色模式必须维护** - 任何新组件都要同时考虑暗色配色
5. **响应式必须维护** - 1024px / 768px 两档断点
6. **数据迁移路径** - 如果接 Supabase,把所有 `getData() / saveData()` 调用替换成 API 调用即可
