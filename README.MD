# SSO 认证授权中心

这是一个基于 Koa.js、Prisma 和 TypeScript 构建的单点登录 (SSO) 认证授权中心。它实现了 OAuth 2.0 的授权码流程 (Authorization Code Flow)，并强制使用 PKCE (Proof Key for Code Exchange) 以增强安全性。

## 主要特性

- **用户认证**: 提供用户注册和登录功能。
- **OAuth 2.0 授权码流程**: 作为认证中心，为第三方应用提供标准的授权服务。
- **PKCE 安全增强**: 强制要求客户端在授权流程中使用 PKCE，防止授权码被截获和滥用。
- **令牌管理**: 生成、刷新和吊销 Access Token 和 Refresh Token。
- **会话管理**: 使用 Koa Session 和 Redis 进行高效、可扩展的会话管理。
- **数据库**: 使用 Prisma ORM，可以轻松对接 PostgreSQL, MySQL, SQLite 等多种数据库。
- **技术栈**:
  - 后端框架: Koa.js
  - 数据库 ORM: Prisma
  - 语言: TypeScript
  - 缓存/会话存储: Redis
  - 认证机制: JWT (JSON Web Tokens)

## 环境准备

在开始之前，请确保您的开发环境中安装了以下软件：

- [Node.js](https://nodejs.org/) (建议 v20.x 或更高版本)
- [pnpm](https://pnpm.io/)
- [Redis](https://redis.io/)
- 一个关系型数据库 (例如, [PostgreSQL](https://www.postgresql.org/))

## 安装与配置

1.  **克隆仓库**

    ```bash
    git clone <your-repository-url>
    cd sso-auth
    ```

2.  **安装依赖**

    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    在项目根目录下创建一个 `.env` 文件，并根据 `.env.example` 的格式填写必要的信息。

    ```env
    # 数据库连接字符串
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"

    # Redis 连接信息
    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379
    # REDIS_PASSWORD=your-redis-password # 如果有密码

    # JWT 和 Session 密钥 (请使用强随机字符串)
    JWT_SECRET="your_strong_jwt_secret"
    REFRESH_SECRET="your_strong_refresh_secret"
    SESSION_SECRET="your_strong_session_secret"

    # 前端应用的 URL (用于 CORS)
    FRONTEND_URL="http://localhost:8080"
    ```

4.  **数据库迁移**
    运行 Prisma migrate 来创建数据库表结构。
    ```bash
    pnpm prisma migrate dev --name init
    ```

## 运行项目

- **开发模式** (带文件监听和自动重启):

  ```bash
  pnpm dev
  ```

- **生产模式**:

  ```bash
  # 1. 构建 TypeScript 代码
  pnpm build

  # 2. 启动服务
  pnpm start
  ```

项目默认运行在 `http://localhost:3000`。

## 认证授权流程 (OAuth 2.0 + PKCE)

本项目的核心是提供单点登录和授权服务。以下是标准的授权流程：

### 第 1 步: 客户端生成 Code Verifier 和 Code Challenge

在发起授权请求之前，客户端（例如一个 Web 应用）需要生成一个 `code_verifier` 和一个 `code_challenge`。

- `code_verifier`: 一个高熵的随机字符串。
- `code_challenge`: `BASE64URL-ENCODE(SHA256(code_verifier))`

### 第 2 步: 用户登录认证中心

如果用户尚未登录，客户端应用需要引导用户到认证中心进行登录。

- `POST /auth/login`
  - **Body**: `{ "username": "user@example.com", "password": "password123" }`
  - **说明**: 用户使用用户名/邮箱和密码登录。成功后，认证中心会通过 Cookie 建立一个 Session。

### 第 3 步: 客户端发起授权请求

用户登录后，客户端将用户重定向到认证中心的 `/authorize` 端点以获取授权码。

- `GET /auth/authorize`
  - **Query Parameters**:
    - `redirect_uri`: 客户端用于接收授权码的回调地址（必须在白名单中）。
    - `state`: 一个随机字符串，用于防止 CSRF 攻击，认证中心会原样返回。
    - `code_challenge`: 在第 1 步生成的 `code_challenge`。
    - `code_challenge_method`: 必须为 `S256`。
  - **说明**:
    - 此端点需要用户已登录（通过 Session 验证）。
    - 认证中心验证 `redirect_uri` 和 PKCE 参数。
    - 成功后，不会直接重定向，而是返回一个 JSON 对象，包含授权码 `code` 和重定向所需信息。前端应根据此信息完成重定向。

### 第 4 步: 客户端使用授权码交换令牌

客户端收到授权码后，从后端向认证中心发起请求，用授权码交换 `access_token` 和 `refresh_token`。

- `POST /auth/token`
  - **Body**:
    - `code`: 从上一步获取的授权码。
    - `code_verifier`: 在第 1 步生成的 `code_verifier`。
  - **说明**:
    - 认证中心会验证 `code` 的有效性，并使用 `code_verifier` 和存储的 `code_challenge` 进行 PKCE 校验。
    - 校验成功后，返回 `access_token` 和 `refresh_token`。

### 第 5 步: 客户端使用 Access Token 访问受保护资源

客户端在请求头中携带 `access_token` 来访问受保护的资源服务器。

```
Authorization: Bearer <access_token>
```

### 第 6 步: 刷新令牌

当 `access_token` 过期时，客户端可以使用 `refresh_token` 来获取新的令牌对，无需用户重新登录。

- `POST /auth/refresh`
  - **Body**:
    - `refresh_token`: 长期有效的刷新令牌。
    - `access_token`: 已过期的访问令牌。
  - **说明**: 成功后返回新的 `access_token` 和 `refresh_token`。

## API 端点

### 用户认证

- `POST /auth/register`: 注册新用户。
- `POST /auth/login`: 用户登录。
- `POST /auth/logout/center`: 从认证中心注销（清除 Session）。

### OAuth 2.0

- `GET /auth/authorize`: 授权端点，获取授权码。
- `POST /auth/token`: 令牌端点，交换令牌。
- `POST /auth/refresh`: 刷新令牌。
- `POST /auth/logout/token`: 注销令牌（吊销 Refresh Token）。

## 待完成事项

以下是计划中的功能增强：

### 安全增强

- **邮箱验证码认证**: 为注册和登录流程添加邮箱验证码，提高账户安全性。
  - 注册时通过邮箱验证码确认用户身份
  - 登录时支持邮箱验证码作为双因素认证手段
  - 密码重置流程优化

### 客户端管理

- **完整的客户端（Client）管理系统**:
  - 创建 `clients` 数据表，存储客户端信息（client_id, client_secret 等）
  - 开发客户端注册和管理界面
  - 实现客户端授权范围（scopes）限制
  - 为不同客户端配置不同的重定向 URI 白名单
  - 支持客户端访问统计和监控

### 前端集成

- **SSO登录页面客户端**:

  - 开发一个完整的SSO认证中心前端界面（客户端A）
  - 实现用户友好的登录、注册和账户管理页面
  - 处理其他应用(客户端B)重定向过来的认证请求，提取state、redirect_uri、client_id等参数
  - 用户登录成功后，自动带着code和state重定向回客户端B的redirect_uri
  - 支持记住登录状态，实现真正的单点登录体验

- **第三方应用集成示例**:
  - 开发示例第三方应用(客户端B)，展示如何接入SSO系统
  - 实现完整的OAuth 2.0 + PKCE流程，包括生成code_verifier和code_challenge
  - 演示如何使用返回的code和code_verifier换取access_token和refresh_token
  - 提供令牌管理、自动刷新和登出的完整实现
  - 为开发者提供可复用的集成代码库
