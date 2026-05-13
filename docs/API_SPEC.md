# FlowHub API 接口文档

> 版本:v1.0
> 基础 URL:`https://api.flowhub.cn/v1`
> 认证:Supabase JWT Token(Header: `Authorization: Bearer <token>`)

---

## 通用规范

### 请求格式

```http
Content-Type: application/json
Authorization: Bearer <token>
```

### 响应格式

**成功**:

```json
{
  "ok": true,
  "data": { ... }
}
```

**失败**:

```json
{
  "ok": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "本月调用额度已用完",
    "details": { "used": 50, "total": 50 }
  }
}
```

### HTTP 状态码

| 码 | 含义 |
|---|---|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突(如重复评价) |
| 422 | 业务逻辑错误(如额度不足) |
| 429 | 频率限制 |
| 500 | 服务器错误 |

### 错误码

| code | 含义 |
|---|---|
| `AUTH_REQUIRED` | 需要登录 |
| `INSUFFICIENT_PERMISSION` | 权限不足 |
| `RESOURCE_NOT_FOUND` | 资源不存在 |
| `QUOTA_EXCEEDED` | 额度不足 |
| `PRO_REQUIRED` | 需要 Pro 会员 |
| `ALREADY_REVIEWED` | 已经评价过 |
| `INVALID_SIGNATURE` | 签名无效(Webhook) |
| `RATE_LIMITED` | 触发频率限制 |

---

## 1. 用户与认证

### POST /api/auth/sms-code
发送短信验证码

**Request**:

```json
{
  "phone": "13800138000",
  "scene": "login"
}
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "expires_in": 60
  }
}
```

---

### POST /api/auth/verify
验证码登录 / 注册

**Request**:

```json
{
  "phone": "13800138000",
  "code": "1234",
  "name": "张三",
  "invite_code": "FH...."
}
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "u_xxx",
      "phone": "13800138000",
      "name": "张三",
      "tier": "free",
      "invite_code": "FHA1B2C3"
    },
    "session": {
      "access_token": "eyJ...",
      "refresh_token": "...",
      "expires_at": "..."
    }
  }
}
```

---

### GET /api/user/me
获取当前用户信息

**Response**:

```json
{
  "ok": true,
  "data": {
    "id": "u_xxx",
    "phone": "13800138000",
    "name": "张三",
    "avatar_url": "https://...",
    "tier": "pro",
    "invite_code": "FHA1B2C3",
    "is_creator": false,
    "subscription": {
      "plan": "monthly",
      "status": "active",
      "current_period_end": "2026-06-11T00:00:00Z",
      "cancel_at_period_end": false
    },
    "quota": {
      "used": 153,
      "total": 1000,
      "reset_at": "2026-06-01T00:00:00Z"
    }
  }
}
```

---

### PATCH /api/user/me
更新用户信息

**Request**:

```json
{
  "name": "新名字",
  "avatar_url": "https://..."
}
```

---

## 2. 工作流

### GET /api/workflows
工作流列表

**Query**:

```
?category=电商设计
&type=self
&search=商品图
&sort=popular
&page=1
&limit=20
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "workflows": [
      {
        "id": "wf_xxx",
        "slug": "picspark-product-photo",
        "name": "PicSpark · 商品图 AI",
        "tagline": "电商商品图 AI 生成",
        "category": "电商设计",
        "tags": ["商品图", "换背景"],
        "type": "self",
        "cover_color": "#1A5D3A",
        "rating": 4.8,
        "review_count": 156,
        "click_count_30d": 8432,
        "is_free": false,
        "pro_only": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "has_more": true
    }
  }
}
```

---

### GET /api/workflows/:slug
工作流详情

**Response**:

```json
{
  "ok": true,
  "data": {
    "workflow": {
      "id": "wf_xxx",
      "slug": "picspark-product-photo",
      "name": "PicSpark · 商品图 AI",
      "description": "# 关于这个工作流\n...",
      "gallery": [
        {
          "label": "场景 1 · 主图换背景",
          "title": "从白底到温馨厨房场景",
          "image_url": "https://..."
        }
      ],
      "input_schema": {
        "type": "object",
        "properties": {
          "image": { "type": "string", "format": "binary" },
          "scene": { "type": "string", "enum": ["kitchen", "festival", "model"] }
        },
        "required": ["image", "scene"]
      },
      "creator": {
        "id": "u_xxx",
        "name": "PicSpark 团队",
        "avatar_url": "..."
      }
    }
  }
}
```

---

### POST /api/workflows
创建工作流(需要 is_creator=true)

**Request**:

```json
{
  "name": "新工作流",
  "tagline": "一句话简介",
  "description": "## 详细介绍\n...",
  "category": "电商设计",
  "tags": ["商品图"],
  "type": "self",
  "cover_color": "#1A5D3A",
  "is_free": false,
  "pro_only": true,
  "cost_per_call": 1,
  "input_schema": { ... }
}
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "workflow": {
      "id": "wf_new",
      "status": "draft"
    }
  }
}
```

---

### POST /api/workflows/:id/click
记录调用 + 返回跳转地址 / 执行 ID

**Request**:

```json
{
  "source": "market",
  "search_query": "商品图"
}
```

**Response - 第三方推荐**:

```json
{
  "ok": true,
  "data": {
    "type": "redirect",
    "url": "https://www.picspark.cn/?from=flowhub&wf_id=wf_xxx&uid=u_xxx&ts=1730000000&sig=...",
    "expires_in": 3600
  }
}
```

**Response - 自营工作流**:

```json
{
  "ok": true,
  "data": {
    "type": "execute",
    "execution_id": "exec_xxx",
    "quota_after": { "used": 154, "total": 1000 }
  }
}
```

**Response - 额度不足**:

```json
{
  "ok": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "本月调用额度已用完",
    "details": {
      "used": 50,
      "total": 50,
      "reset_at": "2026-06-01T00:00:00Z",
      "upgrade_url": "/pricing"
    }
  }
}
```

---

### POST /api/workflows/:id/execute
执行自营工作流(传入参数,获取结果)

**Request**:

```json
{
  "execution_id": "exec_xxx",
  "input": {
    "image": "data:image/png;base64,...",
    "scene": "kitchen"
  }
}
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "result": {
      "output_image_url": "https://...",
      "metadata": {
        "duration_ms": 4500,
        "model": "stable-diffusion-xl"
      }
    }
  }
}
```

---

## 3. 评价

### GET /api/workflows/:id/reviews
评价列表

**Query**:

```
?sort=helpful
&page=1
&limit=10
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "reviews": [
      {
        "id": "rv_xxx",
        "user": {
          "name": "电商小赵",
          "avatar_url": "..."
        },
        "rating": 5,
        "text": "主图换背景效果非常自然...",
        "helpful_count": 42,
        "reply": "感谢支持!",
        "reply_at": "...",
        "created_at": "..."
      }
    ]
  }
}
```

---

### POST /api/workflows/:id/reviews
提交评价

**Request**:

```json
{
  "rating": 5,
  "text": "非常好用"
}
```

---

## 4. 订阅与支付

### POST /api/payment/create-checkout
创建支付会话

**Request**:

```json
{
  "plan": "monthly",
  "payment_method": "stripe",
  "return_url": "https://flowhub.cn/me?from=checkout"
}
```

**Response - Stripe**:

```json
{
  "ok": true,
  "data": {
    "type": "stripe",
    "session_url": "https://checkout.stripe.com/c/pay/cs_..."
  }
}
```

**Response - 微信**:

```json
{
  "ok": true,
  "data": {
    "type": "wechat",
    "qrcode_url": "weixin://wxpay/bizpayurl?pr=...",
    "order_id": "ord_xxx",
    "expires_at": "..."
  }
}
```

---

### POST /api/payment/cancel-subscription
取消订阅(本周期结束后生效)

**Response**:

```json
{
  "ok": true,
  "data": {
    "cancel_at": "2026-06-11T00:00:00Z",
    "message": "你的订阅将在 2026-06-11 到期后不再续费"
  }
}
```

---

## 5. Webhook(第三方回调)

### POST /api/webhook/attribution
**第三方系统(如 PicSpark)调用,上报归因事件**

**Headers**:

```http
Content-Type: application/json
X-FlowHub-Signature: sha256=<HMAC-SHA256>
X-FlowHub-Timestamp: 1730000000
```

**Request Body**:

```json
{
  "event_type": "purchase",
  "fh_uid": "u_xxx",
  "workflow_id": "wf_xxx",
  "external_user_id": "ps_user_123",
  "amount": 9900,
  "currency": "CNY",
  "occurred_at": "2026-05-11T10:30:00Z"
}
```

**签名算法**(发送方):

```javascript
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify(body);
const signature = crypto
  .createHmac('sha256', SHARED_SECRET)
  .update(timestamp + payload)
  .digest('hex');

// Header
'X-FlowHub-Signature': `sha256=${signature}`,
'X-FlowHub-Timestamp': timestamp.toString()
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "attribution_id": "attr_xxx",
    "attributed": true,
    "platform_cut": 2970,
    "creator_share": 6930
  }
}
```

---

### POST /api/payment/webhook/stripe
Stripe 支付回调(Stripe 调用,不对外开放)

### POST /api/payment/webhook/wechat
微信支付回调

### POST /api/payment/webhook/alipay
支付宝回调

---

## 6. 管理员 API

### GET /api/admin/workflows
管理员:工作流列表(可看所有状态)

### PATCH /api/admin/workflows/:id/status
审核工作流

**Request**:

```json
{
  "status": "active",
  "rejected_reason": "图片不清晰"
}
```

---

### GET /api/admin/stats
数据看板

**Response**:

```json
{
  "ok": true,
  "data": {
    "users": {
      "total": 4283,
      "pro": 1245,
      "new_today": 32,
      "growth_7d": 0.12
    },
    "revenue": {
      "this_month": 48553,
      "last_month": 38942,
      "growth": 0.246
    },
    "workflows": {
      "active": 156,
      "reviewing": 8,
      "total_calls_today": 8432
    },
    "ad_applications": {
      "pending": 12,
      "approved_this_month": 24
    }
  }
}
```

---

## 7. 创作者 API

### GET /api/creator/me/earnings
我的收益

**Query**:

```
?month=2026-05
```

**Response**:

```json
{
  "ok": true,
  "data": {
    "month": "2026-05",
    "earnings": {
      "subscription_share": 8400,
      "ad_revenue": 1200,
      "attribution_revenue": 6500,
      "total_revenue": 16100,
      "platform_cut": 4830,
      "net_amount": 11270,
      "status": "pending"
    },
    "by_workflow": [
      {
        "workflow_id": "wf_xxx",
        "name": "PicSpark",
        "subscription_share": 8400,
        "calls": 6000
      }
    ]
  }
}
```

---

### POST /api/creator/me/withdraw
申请提现

**Request**:

```json
{
  "amount": 10000,
  "method": "alipay",
  "account": "13800138000"
}
```

---

## 8. 限流策略

| 接口 | 限制 |
|---|---|
| `/api/auth/sms-code` | 1 次/60 秒(单手机号) |
| `/api/auth/verify` | 5 次/分钟(单 IP) |
| `/api/workflows/:id/click` | 30 次/分钟(单用户) |
| `/api/workflows/:id/execute` | 受 quota 限制 |
| `/api/workflows/:id/reviews` POST | 5 次/天(单用户) |
| `/api/webhook/*` | 100 次/秒 |

超出限制时返回 429 + `Retry-After` Header。

---

## 9. SDK / 客户端

### JavaScript / TypeScript

```typescript
import { createClient } from '@flowhub/sdk';

const flowhub = createClient({
  url: 'https://api.flowhub.cn/v1',
  apiKey: process.env.FLOWHUB_API_KEY
});

// 工作流列表
const { data } = await flowhub.workflows.list({
  category: '电商设计',
  type: 'self'
});

// 调用工作流
const result = await flowhub.workflows.execute('picspark', {
  image: file,
  scene: 'kitchen'
});
```

---

## 10. 测试环境

| 环境 | URL | 说明 |
|---|---|---|
| Production | `https://api.flowhub.cn/v1` | 生产环境 |
| Staging | `https://api-staging.flowhub.cn/v1` | 预上线 |
| Dev | `http://localhost:3000/api` | 本地开发 |

测试账号:
- 手机:`13800138000`
- 验证码:`1234`(测试环境固定)
