/*
 * @Description: 身份验证中间件
 * @Author: zby
 * @Date: 2024-06-24
 * @LastEditors: zby
 * @Reference:
 */
import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import responseUtil from '../utils/responseUtil';
import logger from '../utils/logger';

/**
 * 验证用户是否已登录
 * 检查会话中是否存在userId
 */
export const requireLogin = async (ctx: Context, next: Next) => {
  if (!ctx.session?.userId) {
    logger.info('访问受限资源，用户未登录');
    ctx.status = 401;
    ctx.body = responseUtil.error('未授权，请先登录', 401);
    return;
  }

  logger.info(`已登录用户访问: ${ctx.session.userId}`);
  await next();
};

/**
 * 验证JWT令牌
 * 从Authorization标头中提取并验证Bearer令牌
 */
export const verifyJWT = (secret: string) => {
  return async (ctx: Context, next: Next) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info('JWT验证失败: 缺少Bearer令牌');
      ctx.status = 401;
      ctx.body = responseUtil.error('未授权，需要Bearer令牌', 401);
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, secret);
      // 将解码后的用户信息添加到上下文中
      ctx.state.user = decoded;
      logger.info(`JWT令牌验证成功，用户ID: ${decoded.id}`);
      await next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.info('JWT令牌已过期');
        ctx.status = 401;
        ctx.body = responseUtil.error('令牌已过期', 401);
        return;
      }

      logger.info(`JWT令牌验证错误: ${error.message}`);
      ctx.status = 401;
      ctx.body = responseUtil.error('无效的令牌', 401);
    }
  };
};

/**
 * 重定向URL白名单验证
 */
export const validateRedirectUri = (whitelist: string[]) => {
  return async (ctx: Context, next: Next) => {
    const { redirect_uri } = ctx.query;

    if (!redirect_uri) {
      logger.info('重定向验证失败: 缺少redirect_uri参数');
      ctx.status = 400;
      ctx.body = responseUtil.error('缺少redirect_uri参数');
      return;
    }

    // 验证重定向URL是否在白名单中
    if (!whitelist.includes(redirect_uri as string)) {
      logger.info(`重定向验证失败: 无效的URI - ${redirect_uri}`);
      ctx.status = 400;
      ctx.body = responseUtil.error('无效的重定向URI');
      return;
    }

    logger.info(`重定向URI验证通过: ${redirect_uri}`);
    await next();
  };
};
