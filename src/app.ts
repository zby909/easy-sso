/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 11:40:59
 * @LastEditors: zby
 * @Reference:
 */
// src/app.js
import Koa from 'koa';
import bodyParser from '@koa/bodyparser';
import koaLogger from 'koa-logger';
import cors from '@koa/cors';
import session from 'koa-session';
import redisStore from 'koa-redis';
import router from './routes/index.ts';
import errorHandler from './middlewares/errorHandler';
import { ipRateLimit } from './middlewares/rateLimitMiddleware';
import logger from './utils/logger';
import redisClient from './utils/redis';

export default (app: Koa) => {
  // 配置会话
  app.keys = [process.env.SESSION_SECRET || 'default_secret_key909908'];

  // CORS配置 - 允许前端Vue应用访问
  app.use(
    cors({
      origin: ctx => {
        const allowedOrigins = [
          'http://localhost:8080', // Vue开发服务器默认端口
          'http://localhost:5173', // Vite默认端口
          process.env.FRONTEND_URL, // 生产环境前端URL
        ];
        const requestOrigin = ctx.headers.origin;
        if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
          return requestOrigin;
        }
        return '';
      },
      credentials: true, // 允许跨域请求携带Cookie
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      maxAge: 86400, // 预检请求有效期（秒）
    }),
  );

  // 中间件
  app.use(bodyParser());
  app.use(koaLogger());

  // 全局频率限制中间件
  app.use(ipRateLimit);
  app.use(
    session(
      {
        key: 'sso_sess', // Cookie的名称 (去掉冒号避免与Redis命名空间冲突)
        maxAge: 86400000, // Cookie的有效期为24小时
        httpOnly: true, // 禁止客户端JavaScript访问
        sameSite: 'lax', // 跨站点请求设置
        secure: false, // 开发环境允许HTTP
        overwrite: true, // 允许覆盖
        signed: true, // 签名cookie
        store: redisStore({
          client: redisClient, // 使用预先创建的Redis客户端
        }),
      },
      app,
    ),
  );

  // 为了在路由文件中也能使用，将Redis客户端挂载到app.context上
  app.context.redis = redisClient;

  // 全局错误处理中间件
  app.use(errorHandler);

  // 路由
  app.use(router.routes());
  app.use(router.allowedMethods());

  logger.info('应用程序初始化完成，已配置Redis作为会话和数据存储');
};
