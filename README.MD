# SSO 认证授权中心

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Koa.js](https://img.shields.io/badge/Koa.js-2.15+-lightgrey.svg)](https://koajs.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

🔐 一个基于 OAuth 2.0 + PKCE 标准构建的单点登录(SSO)认证授权中心，提供身份认证和授权服务。

## ✨ 核心特性

### 🚀 认证授权

- **OAuth 2.0 授权码流程** - 实现标准 OAuth 2.0 Authorization Code Flow
- **PKCE 安全增强** - 使用 PKCE (Proof Key for Code Exchange) 防止授权码劫持
- **JWT 令牌系统** - 支持 Access Token 和 Refresh Token 的生命周期管理
- **无密码邮箱认证** - 基于邮箱验证码的无密码注册和登录系统

### 🔧 技术架构

- **高性能后端** - 基于 Koa.js 构建的轻量级 Node.js 服务
- **类型安全** - 使用 TypeScript 开发，提供类型检查和代码提示
- **数据库抽象** - 使用 Prisma ORM，支持 MySQL、PostgreSQL、SQLite 等数据库
- **Redis 缓存** - 基于 Redis 的会话管理和数据缓存
- **日志系统** - 集成 Winston 日志系统，支持文件和控制台输出

### 🛡️ 安全保障

- **无密码认证** - 基于邮箱验证码的无密码登录
- **会话安全** - 基于 Redis 的分布式会话管理，支持会话过期和销毁
- **频率限制** - 针对邮件发送和 IP 请求的多层频率限制，防止滥用攻击
- **CORS 保护** - 跨域资源共享配置，防止恶意请求
- **重定向白名单** - 重定向 URI 白名单验证机制
- **令牌验证** - JWT 令牌签名验证和过期检查

## 🏗️ 技术栈

| 分类           | 技术选型   | 版本  | 说明                                      |
| -------------- | ---------- | ----- | ----------------------------------------- |
| **运行时**     | Node.js    | 20+   | JavaScript 运行环境                       |
| **开发语言**   | TypeScript | 5.0+  | 类型安全的 JavaScript 超集                |
| **Web 框架**   | Koa.js     | 2.15+ | 轻量级 Node.js Web 框架                   |
| **数据库 ORM** | Prisma     | 6.8+  | 现代化数据库工具包                        |
| **数据库**     | MySQL      | 8.0+  | 关系型数据库（也支持 PostgreSQL、SQLite） |
| **缓存/会话**  | Redis      | 6.0+  | 高性能键值存储数据库                      |
| **认证机制**   | JWT        | 9.0+  | JSON Web Token 令牌系统                   |
| **日志系统**   | Winston    | 3.15+ | 日志记录库                                |
| **邮件服务**   | Nodemailer | 7.0+  | Node.js 邮件发送库                        |

## 📋 环境要求

在开始之前，请确保您的开发环境中安装了以下软件：

- [Node.js](https://nodejs.org/) (建议 v20.x 或更高版本)
- [pnpm](https://pnpm.io/) (推荐) 或 npm/yarn
- [Redis](https://redis.io/) (v6.0 或更高版本)
- [MySQL](https://www.mysql.com/) (v8.0 或更高版本) 或其他 Prisma 支持的数据库

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zby909/sso-auth.git
cd sso-auth
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 环境配置

在项目根目录创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库连接 (MySQL 示例)
DATABASE_URL="mysql://username:password@localhost:3306/sso_auth"

# Redis 配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 安全密钥 (请使用强随机字符串)
JWT_SECRET="your_super_secret_jwt_key_here"
REFRESH_SECRET="your_super_secret_refresh_key_here"
SESSION_SECRET="your_super_secret_session_key_here"

# CORS 配置
FRONTEND_URL="http://localhost:8080"

# SMTP 邮件配置 (可选，用于验证码发送)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 频率限制配置
RATE_LIMIT_EMAIL_WINDOW_MS=60000
RATE_LIMIT_EMAIL_MAX_REQUESTS=2
RATE_LIMIT_IP_WINDOW_MS=60000
RATE_LIMIT_IP_MAX_REQUESTS=200
```

### 4. 数据库初始化

```bash
# 生成 Prisma 客户端
pnpm prisma generate

# 执行数据库迁移
pnpm prisma migrate dev --name init

# (可选) 查看数据库
pnpm prisma studio
```

### 5. 启动服务

```bash
# 开发模式 (支持热重载)
pnpm dev

# 生产模式
pnpm build && pnpm start
```

服务将在 `http://localhost:3000` 启动 🎉

## 📚 OAuth 2.0 + PKCE 认证流程

本系统实现了 OAuth 2.0 授权码流程，并使用 PKCE 增强安全性：

### 🎭 系统角色说明

在完整的SSO认证体系中，包含以下关键角色：

| 角色                   | 说明               | 职责                                            |
| ---------------------- | ------------------ | ----------------------------------------------- |
| **️ 客户端应用前端**   | 业务应用的前端部分 | 发起认证请求、处理授权码、存储令牌、调用业务API |
| **🌐 SSO前端登录中心** | SSO系统的用户界面  | 提供登录页面、收集用户凭证、处理认证交互        |
| **🔐 SSO后端认证中心** | SSO系统的核心服务  | 验证用户身份、颁发授权码和令牌、管理会话        |
| **🏢 客户端应用后端**  | 业务应用的后端服务 | 验证SSO令牌、提供业务API、管理业务数据和资源    |

> 💡 **注意**：本项目实现的是 **SSO后端认证中心** 部分，为其他系统提供认证授权服务。

### 🔄 认证流程图

```mermaid
sequenceDiagram
    participant ClientFE as 🖥️ 客户端应用前端
    participant SSOFE as 🌐 SSO前端登录中心
    participant SSOBE as 🔐 SSO后端认证中心
    participant ClientBE as 🏢 客户端应用后端

    Note over ClientFE, SSOBE: 1. 准备 PKCE 参数
    ClientFE->>ClientFE: 生成 code_verifier
    ClientFE->>ClientFE: 计算 code_challenge = SHA256(code_verifier)
    ClientFE->>ClientFE: 生成 state 参数

    Note over ClientFE, SSOFE: 2. 重定向到SSO登录中心
    ClientFE->>ClientFE: 检测需要认证
    ClientFE->>SSOFE: 重定向到SSO登录页面<br/>(带code_challenge和redirect_uri)
    SSOFE->>SSOFE: 显示登录页面

    Note over SSOFE, SSOBE: 3. 用户认证（无密码）
    SSOFE->>SSOFE: 用户输入邮箱地址
    SSOFE->>SSOBE: 请求发送验证码
    SSOBE->>SSOFE: 发送邮箱验证码
    SSOFE->>SSOFE: 用户输入验证码
    SSOFE->>SSOBE: 提交验证码登录
    SSOBE->>SSOBE: 验证码校验成功

    Note over SSOBE, ClientFE: 4. 授权码返回
    SSOBE->>SSOFE: 登录成功，生成授权码
    SSOFE->>ClientFE: 重定向回客户端(带授权码code)
    ClientFE->>ClientFE: 接收授权码

    Note over ClientFE, SSOBE: 5. 客户端获取令牌
    ClientFE->>SSOBE: POST /auth/token<br/>{code, code_verifier}
    SSOBE->>SSOBE: 验证 code 和 PKCE
    SSOBE->>ClientFE: 返回 access_token + refresh_token
    ClientFE->>ClientFE: 存储令牌

    Note over ClientFE, ClientBE: 6. 访问业务资源
    ClientFE->>ClientBE: 请求业务接口<br/>Authorization: Bearer access_token
    ClientBE->>ClientBE: 验证JWT令牌
    ClientBE->>ClientFE: 返回业务响应

    Note over ClientFE, SSOBE: 7. 令牌刷新（可选）
    ClientFE->>SSOBE: POST /auth/refresh<br/>{refresh_token, access_token}
    SSOBE->>ClientFE: 返回新的 token 对
```

### 📝 详细步骤说明

#### 第 1 步：客户端前端准备 PKCE 参数

客户端应用前端在发起授权请求前，需要生成 PKCE 相关参数：

```javascript
// 生成 code_verifier (43-128 字符的随机字符串)
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// 生成 code_challenge
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

// 生成 state 参数防止 CSRF 攻击
const state = 'state_' + Date.now();
```

#### 第 2 步：重定向到SSO登录中心

当客户端前端检测到需要认证时：

```javascript
// 客户端前端重定向到SSO登录中心
const authUrl =
  `https://sso.example.com/login?` +
  `redirect_uri=${encodeURIComponent(clientRedirectUri)}&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

window.location.href = authUrl;
```

#### 第 3 步：SSO前端处理用户认证

SSO前端登录中心处理用户认证（无密码登录）：

```bash
# SSO前端请求发送验证码
POST /auth/verification/send
{
  "email": "user@example.com",
  "purpose": "login"
}

# SSO前端提交验证码登录
POST /auth/login
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### 第 4 步：SSO返回授权码

用户登录成功后，SSO后端生成授权码并通过前端重定向返回：

```bash
# SSO后端授权接口
GET /auth/authorize?redirect_uri=http://localhost:8080&state=state_123&code_challenge=xyz&code_challenge_method=S256
```

**SSO前端重定向响应：**

```
HTTP/1.1 302 Found
Location: http://localhost:8080?code=auth_code_abc123&state=state_123
```

#### 第 5 步：客户端前端交换访问令牌

客户端前端接收授权码后，直接与SSO后端交换令牌：

```bash
POST /auth/token
{
  "code": "auth_code_abc123",
  "code_verifier": "original_code_verifier"
}
```

**响应示例：**

```json
{
  "code": 200,
  "msg": "令牌获取成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

#### 第 6 步：访问客户端业务资源

客户端前端携带访问令牌请求自己的后端服务：

```bash
# 客户端前端请求自己的后端API
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

客户端后端验证令牌并处理业务逻辑：

```javascript
// 客户端后端验证JWT令牌（本地验证）
const jwt = require('jsonwebtoken');
try {
  const decoded = jwt.verify(token, SSO_PUBLIC_KEY);
  // 令牌有效，继续处理业务逻辑，返回业务数据
  const userProfile = await getUserProfile(decoded.id);
  res.json(userProfile);
} catch (error) {
  // 令牌无效，返回401
  res.status(401).json({ error: 'Invalid token' });
}
```

#### 第 7 步：令牌刷新

当访问令牌过期时，客户端前端使用刷新令牌获取新的令牌对：

```bash
POST /auth/refresh
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 📖 API 文档

### 🔐 认证相关接口

| 接口                      | 方法 | 描述               | 认证要求 |
| ------------------------- | ---- | ------------------ | -------- |
| `/auth/verification/send` | POST | 发送邮箱验证码     | 无       |
| `/auth/register`          | POST | 用户注册（无密码） | 无       |
| `/auth/login`             | POST | 用户登录（无密码） | 无       |
| `/auth/logout/center`     | POST | 注销登录中心       | Session  |

### 🎫 OAuth 2.0 接口

| 接口                 | 方法 | 描述         | 认证要求 |
| -------------------- | ---- | ------------ | -------- |
| `/auth/authorize`    | GET  | 获取授权码   | Session  |
| `/auth/token`        | POST | 获取访问令牌 | 无       |
| `/auth/refresh`      | POST | 刷新访问令牌 | 无       |
| `/auth/logout/token` | POST | 注销令牌     | 无       |

### 错误响应说明

#### 频率限制错误 (429)

当触发频率限制时，服务器返回：

```json
{
  "code": 429,
  "msg": "请求过于频繁，请稍后再试",
  "data": null
}
```

#### 常见错误码

- `400` - 请求参数错误
- `401` - 认证失败
- `404` - 资源不存在
- `429` - 请求频率限制
- `500` - 服务器内部错误

> 💡 **完整 API 文档**：查看 [`api-docs`](./api-docs/) 目录获取 OpenAPI 格式的详细文档，可直接导入 Apifox、Postman 等工具。

## 🧪 测试

项目提供了测试脚本来验证 OAuth 2.0 + PKCE 流程：

```bash
# 运行 SSO 测试流程
node test/sso-complete-test.mjs
```

测试流程模拟完整的SSO认证过程：

1. ✅ 发送注册验证码（SSO后端）
2. ✅ 用户注册（SSO后端，无密码）
3. ✅ 发送登录验证码（SSO后端）
4. ✅ 用户登录（SSO后端，无密码）
5. ✅ OAuth 授权获取 code（模拟SSO前端+后端交互）
6. ✅ 使用 code 获取 token（客户端前端与SSO后端）
7. ✅ 刷新 access_token（客户端前端与SSO后端）
8. ✅ 注销 token（客户端前端与SSO后端）
9. ✅ 注销登录中心（SSO前端与后端）

> 📝 **说明**：测试脚本主要验证SSO后端认证中心的功能，模拟了客户端前端的请求行为。

## 🛠️ 开发指南

### 项目结构

```
src/
├── app.ts              # Koa 应用配置
├── server.ts           # 服务器启动入口
├── config/
│   ├── env.ts          # 环境变量加载
│   └── whitelist.ts    # 重定向 URI 白名单
├── controllers/        # 控制器层
│   └── authController.ts
├── middlewares/        # 中间件
│   ├── authMiddleware.ts
│   └── errorHandler.ts
├── models/            # 数据模型
│   ├── interfaces.ts  # TypeScript 接口定义
│   └── stores.ts      # Redis 数据存储
├── routes/            # 路由定义
│   ├── authRoutes.ts
│   └── index.ts
├── services/          # 业务逻辑层
│   └── authService.ts
└── utils/             # 工具函数
    ├── emailService.ts # 邮件服务
    ├── logger.ts      # 日志工具
    ├── redis.ts       # Redis 客户端
    └── responseUtil.ts # 响应格式化
```

### 开发脚本

```bash
# 开发模式 (热重载)
pnpm dev

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 数据库操作

```bash
# 查看数据库状态
pnpm prisma migrate status

# 重置数据库 (谨慎使用)
pnpm prisma migrate reset

# 打开数据库管理界面
pnpm prisma studio
```

## 🚀 部署指南

### Docker 部署 (推荐)

1. **创建 Docker Compose 文件**

```yaml
version: '3.8'
services:
  sso-auth:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@mysql:3306/sso_auth
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: sso_auth
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

2. **启动服务**

```bash
docker-compose up -d
```

### 传统部署

1. **服务器环境准备**

   ```bash
   # 安装 Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # 安装 PM2 (进程管理器)
   npm install -g pm2
   ```

2. **部署应用**

   ```bash
   # 克隆代码
   git clone https://github.com/zby909/sso-auth.git
   cd sso-auth

   # 安装依赖
   pnpm install --frozen-lockfile

   # 构建应用
   pnpm build

   # 数据库迁移
   pnpm prisma migrate deploy

   # 启动服务
   pm2 start ecosystem.config.js
   ```

## 🔧 配置说明

### 环境变量详细说明

| 变量名           | 类型   | 默认值      | 说明                              |
| ---------------- | ------ | ----------- | --------------------------------- |
| `NODE_ENV`       | string | development | 运行环境 (development/production) |
| `PORT`           | number | 3000        | 服务端口号                        |
| `DATABASE_URL`   | string | -           | 数据库连接字符串                  |
| `REDIS_HOST`     | string | 127.0.0.1   | Redis 主机地址                    |
| `REDIS_PORT`     | number | 6379        | Redis 端口                        |
| `REDIS_PASSWORD` | string | -           | Redis 密码 (可选)                 |
| `JWT_SECRET`     | string | -           | JWT 签名密钥                      |
| `REFRESH_SECRET` | string | -           | Refresh Token 签名密钥            |
| `SESSION_SECRET` | string | -           | Session 签名密钥                  |
| `FRONTEND_URL`   | string | -           | 前端应用 URL (CORS)               |
| `SMTP_HOST`      | string | -           | SMTP 服务器地址                   |
| `SMTP_USER`      | string | -           | SMTP 用户名                       |
| `SMTP_PASS`      | string | -           | SMTP 密码/应用密码                |

### 频率限制配置说明

为防止恶意攻击和资源滥用，系统实现了两层频率限制：

#### 邮箱验证码频率限制

- **目的**：防止恶意发送大量验证码邮件
- **配置项**：
  - `RATE_LIMIT_EMAIL_WINDOW_MS`：时间窗口（毫秒），默认60秒
  - `RATE_LIMIT_EMAIL_MAX_REQUESTS`：窗口内最大请求次数，默认2次
- **规则**：同一邮箱在60秒内最多只能请求2次验证码

#### IP 全局频率限制

- **目的**：防止单个IP的恶意请求攻击
- **配置项**：
  - `RATE_LIMIT_IP_WINDOW_MS`：时间窗口（毫秒），默认60秒
  - `RATE_LIMIT_IP_MAX_REQUESTS`：窗口内最大请求次数，默认200次
- **规则**：单个IP在60秒内最多发起200次请求

> ⚠️ **注意**：超过频率限制时，服务器将返回429状态码，客户端应实现适当的重试机制。

### 安全配置建议

1. **生成强密钥**

   ```bash
   # 生成 32 字节随机密钥
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **数据库安全**

   - 使用专用数据库用户，仅授予必要权限
   - 启用 SSL 连接 (生产环境)
   - 定期备份数据库

3. **Redis 安全**
   - 设置强密码
   - 禁用危险命令 (FLUSHDB, FLUSHALL)
   - 配置防火墙规则

## 🔍 监控与运维

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/health

# 查看应用日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

### 性能监控

```bash
# PM2 监控
pm2 monit

# 查看应用状态
pm2 status

# 重启应用
pm2 restart sso-auth
```

## 🛡️ 安全最佳实践

### 1. HTTPS 配置

- 生产环境必须使用 HTTPS
- 配置 HSTS 头
- 使用有效的 SSL 证书

### 2. 安全头配置

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // ... 其他 CSP 配置
      },
    },
  }),
);
```

### 3. 限流配置

```javascript
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 限制每个 IP 100 次请求
  }),
);
```

### 4. 日志审计

- 记录所有认证相关操作
- 监控异常登录行为
- 定期审查访问日志

## 🤝 贡献指南

欢迎大家贡献代码和建议！

### 开发流程

1. **Fork 项目**
2. **创建功能分支**
   ```bash
   git checkout -b feature/new-feature
   ```
3. **提交更改**
   ```bash
   git commit -m "feat: add new feature"
   ```
4. **推送分支**
   ```bash
   git push origin feature/new-feature
   ```
5. **创建 Pull Request**

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 编写单元测试
- 添加适当的类型注解
- 更新相关文档

## 📄 许可证

本项目基于 [ISC License](LICENSE) 开源协议发布。

## 🙏 致谢

感谢以下开源项目：

- [Koa.js](https://koajs.com/) - 轻量级 Node.js Web 框架
- [Prisma](https://www.prisma.io/) - 现代化数据库工具包
- [Redis](https://redis.io/) - 高性能键值存储
- [Winston](https://github.com/winstonjs/winston) - 日志库

## 📞 支持与联系

- **Issues**: [GitHub Issues](https://github.com/zby909/sso-auth/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zby909/sso-auth/discussions)
- **邮箱**: your-email@example.com

---

<div align="center">

**⭐ 如果这个项目对您有帮助，欢迎给个 Star！⭐**

Made with ❤️ by [zby909](https://github.com/zby909)

</div>
