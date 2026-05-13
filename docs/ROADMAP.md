# FlowHub 开发路线图

> 这是从 demo 到上线产品的推荐路径,Claude Code 可以照着做

## Phase 1:技术栈迁移(1-2 周)

### Step 1.1 拆分单文件 HTML
当前 `index.html` 太大(8000+ 行),Claude Code 处理不便。

```
flowhub/
├── src/
│   ├── styles/
│   │   ├── tokens.css     # CSS 变量
│   │   ├── components.css # 组件样式
│   │   └── pages.css      # 页面样式
│   ├── js/
│   │   ├── data.js        # 数据层(localStorage + 种子数据)
│   │   ├── render/        # 各视图渲染
│   │   │   ├── market.js
│   │   │   ├── detail.js
│   │   │   ├── me.js
│   │   │   ├── admin.js
│   │   │   ├── creator.js
│   │   │   └── wizard.js
│   │   ├── components/    # 通用组件
│   │   │   ├── nav.js
│   │   │   ├── chatbot.js
│   │   │   ├── footer.js
│   │   │   └── gallery.js
│   │   └── app.js         # 主入口
│   └── index.html
```

**Claude Code 提示**:`/请把 index.html 按上面结构拆分,保持功能完全一致`

### Step 1.2 迁移到 Next.js
```bash
npx create-next-app@latest flowhub --typescript --tailwind --app
```

把现有 JSX-like 字符串改成真正的 React 组件。

### Step 1.3 接入 Supabase
1. 在 supabase.com 创建项目
2. 运行 `docs/DATA_MODEL.md` 里的 SQL 建表脚本
3. 在 `.env.local` 加:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. 把所有 `getData() / saveData()` 替换成 Supabase 客户端调用

## Phase 2:核心功能(2-4 周)

### Step 2.1 真实登录
- 替换演示登录,接入 Supabase Auth(手机短信 OTP)
- 或者用第三方:微信扫码 / Apple Sign-in

### Step 2.2 真实支付
**国内**:
- 用「环球数科」或「Ping++」等聚合支付,接入微信支付 + 支付宝

**海外**:
- Stripe Checkout / Subscriptions

### Step 2.3 第一个真实工作流
建议先做最简单的「**主图换背景**」:
1. 用户上传产品图
2. 调用图像 API(如 Replicate 上的 Stable Diffusion + ControlNet)
3. 返回换背景后的图

接入路径:
```
用户上传 → Supabase Storage → Edge Function → Replicate API → 结果存 Storage → 返回 URL
```

## Phase 3:运营准备(1-2 周)

### Step 3.1 域名 + 备案
- 买域名(flowhub.cn / flowhub.io 推荐买 .cn 国内访问快)
- 国内域名必须 **ICP 备案**(15-20 天)
- 备案过程中可以先用海外域名 + 海外服务器测试

### Step 3.2 SEO
- 加 sitemap.xml
- 加 robots.txt
- 重要落地页加 meta description 和 og 图

### Step 3.3 监控
- Sentry(错误监控)
- Vercel Analytics(访问数据)
- Plausible(隐私友好分析)

## Phase 4:增长(持续)

### Step 4.1 内容运营
- 写「使用案例」博客(SEO)
- 在小红书 / 即刻发使用截图
- 邀请创作者上架(写邀请话术)

### Step 4.2 产品迭代
按用户反馈优先级:
- 哪些工作流最被需要 → 优先做
- 哪些功能用户用不上 → 删掉

## 时间预算

| 阶段 | 工作量(全职) | 实际(兼职) |
|---|---|---|
| Phase 1 拆分 + 迁移 | 1-2 周 | 3-4 周 |
| Phase 2 核心功能 | 2-4 周 | 6-8 周 |
| Phase 3 运营准备 | 1-2 周 | 2-3 周 |
| **总计**(到能见用户) | **4-8 周** | **3-4 个月** |

## ⚠️ 常见坑

1. **过早优化** - 没用户前不要做复杂功能(团队协作 / API key 等等)
2. **过度抽象** - Next.js 项目不要早期就拆 monorepo / micro-frontends
3. **过早扩品** - 第一阶段就 5 个工作流,验证完再加
4. **忽视成本** - AI API 调用很贵,做好用量监控和定价模型
