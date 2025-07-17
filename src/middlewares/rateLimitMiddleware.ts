/*
 * @Description: 频率限制中间件
 * @Author: zby
 * @Date: 2025-07-17
 * @LastEditors: zby
 * @Reference:
 */
import { Context, Next } from 'koa';
import redisClient from '../utils/redis';
import responseUtil from '../utils/responseUtil';
import logger from '../utils/logger';

// 频率限制中间件工厂函数
export const rateLimit = (options: {
  prefix: string; // Redis键前缀
  windowMs: number; // 时间窗口，毫秒
  maxRequests: number; // 窗口内最大请求数
  message?: string; // 限制时的错误消息
  identifierFn?: (ctx: Context) => string | Promise<string>; // 自定义标识符提取函数
}) => {
  const { prefix, windowMs, maxRequests, message = '请求过于频繁，请稍后再试', identifierFn } = options;

  // 转换为秒
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (ctx: Context, next: Next) => {
    // if (process.env.NODE_ENV?.trim() === 'development') {
    //   console.log('开发环境，跳过频率限制');
    //   return next();
    // }

    // 默认使用IP地址作为标识符
    let identifier = ctx.ip;

    // 处理IPv6回环地址
    if (identifier === '::1') {
      identifier = '127.0.0.1'; // 转换为IPv4格式的回环地址
    }

    // 如果是代理转发，尝试获取原始IP
    const realIp = ctx.headers['x-real-ip'] || ctx.headers['x-forwarded-for'];
    if (realIp && typeof realIp === 'string') {
      identifier = realIp.split(',')[0].trim();
    }

    console.log('处理后的IP:', identifier);

    // 如果提供了自定义标识符函数，则使用它
    if (identifierFn) {
      identifier = await identifierFn(ctx);
      if (!identifier) {
        return next(); // 如果标识符无效，跳过限制
      }
    }

    const key = `${prefix}:${identifier}`;

    // 使用Redis的INCR命令增加计数器
    const currentCount = await redisClient.incr(key);

    // 如果是第一次请求，设置过期时间
    if (currentCount === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    // 如果请求数超过限制，返回错误
    if (currentCount > maxRequests) {
      // 获取剩余时间
      const ttl = await redisClient.ttl(key);

      logger.warn(`频率限制触发: ${identifier}, 键: ${key}, 计数: ${currentCount}/${maxRequests}, 剩余时间: ${ttl}秒`);

      ctx.status = 429; // Too Many Requests
      ctx.body = responseUtil.error(message);
      return;
    }

    // 设置响应头，指示剩余的请求配额
    ctx.set('X-RateLimit-Limit', maxRequests.toString());
    ctx.set('X-RateLimit-Remaining', (maxRequests - currentCount).toString());

    await next();
  };
};

// 仅基于邮箱的频率限制（每分钟2次）
export const emailRateLimit = rateLimit({
  prefix: 'rate:email',
  windowMs: parseInt(process.env.RATE_LIMIT_EMAIL_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_EMAIL_MAX_REQUESTS || '2', 10),
  message: '请求验证码过于频繁，请稍后再试',
  identifierFn: async (ctx: Context) => {
    const { email } = ctx.request.body;
    if (!email) return null;
    return email;
  },
});

// IP频率限制中间件 - 适用于一般API
export const ipRateLimit = rateLimit({
  prefix: 'rate:ip',
  windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_IP_MAX_REQUESTS || '200', 10),
  message: '请求过于频繁，请稍后再试',
});
