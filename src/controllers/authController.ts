/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 15:20:27
 * @LastEditors: zby
 * @Reference:
 */
import { Context } from 'koa';
import authService from '../services/authService.ts';
import responseUtil from '../utils/responseUtil.ts';
import logger from '../utils/logger.ts';
import { AuthRequest } from '../models/interfaces';

// 授权端点 - 简化版，无需client_id
const authorize = async (ctx: Context) => {
  const { redirect_uri, state, code_challenge, code_challenge_method } = ctx.query;

  // 强制要求PKCE参数
  if (!code_challenge) {
    logger.warn('授权请求缺少必需的PKCE参数: code_challenge');
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少必需的code_challenge参数，必须使用PKCE');
    return;
  }

  // 验证code_challenge_method
  if (code_challenge_method && !['plain', 'S256', 's256'].includes(code_challenge_method as string)) {
    logger.warn(`无效的code_challenge_method: ${code_challenge_method}`);
    ctx.status = 400;
    ctx.body = responseUtil.error('code_challenge_method必须为plain或S256');
    return;
  }

  // 存储授权请求参数用于后续流程
  if (ctx.session) {
    const authRequest: AuthRequest = {
      redirect_uri: redirect_uri as string,
      state: state as string,
      code_challenge: code_challenge as string,
      code_challenge_method: code_challenge_method as string,
    };
    ctx.session.authRequest = authRequest;
  }

  // 如果用户已登录，则生成授权码
  if (ctx.session?.userId) {
    const code = authService.generateAuthCode(ctx.session.userId, code_challenge as string, code_challenge_method as string);

    logger.info(`已登录用户授权成功: ${ctx.session.userId}`);

    // 不直接重定向，而是返回授权码和重定向信息，由前端处理重定向
    ctx.body = responseUtil.success({
      redirect: true,
      redirect_uri: redirect_uri,
      code: code,
      state: state,
    });
    return;
  }

  // 用户未登录，返回需要登录的信息
  logger.info('用户需要登录以完成授权');
  ctx.body = responseUtil.success(
    {
      needLogin: true,
      authRequest: { redirect_uri, state, code_challenge, code_challenge_method },
    },
    '需要登录',
    401,
  );
};

const register = async (ctx: Context) => {
  const { email, password, name } = ctx.request.body;
  if (!password || !name) {
    ctx.status = 400;
    ctx.body = responseUtil.error('用户名和密码是必填项');
    return;
  }
  try {
    const userId = await authService.register({ email, password, name });
    logger.info(`用户注册成功: ${userId}`);
    ctx.status = 201;
    ctx.body = responseUtil.success({ id: userId }, '注册成功', 201);
  } catch (error) {
    logger.warn(`用户注册失败: ${error.message}`);
    ctx.status = 400;
    ctx.body = responseUtil.error(error.message);
  }
};

const login = async (ctx: Context) => {
  const { username, password } = ctx.request.body; // 支持用户名或邮箱
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = responseUtil.error('用户名/邮箱和密码是必填项');
    return;
  }

  try {
    const userId = await authService.login(username, password);

    // 将用户ID存储在会话中
    if (ctx.session) {
      ctx.session.userId = userId;
    }

    // 如果有待处理的授权请求，生成授权码返回
    if (ctx.session?.authRequest) {
      const { redirect_uri, state, code_challenge, code_challenge_method } = ctx.session.authRequest;
      const code = authService.generateAuthCode(userId, code_challenge, code_challenge_method);

      logger.info(`用户登录成功，生成授权码: ${userId}`);

      // 返回授权信息，由前端处理重定向
      ctx.body = responseUtil.success(
        {
          userId,
          hasAuthRequest: true,
          redirect_uri,
          code,
          state,
        },
        '登录成功',
      );
      return;
    }

    logger.info(`用户登录成功: ${userId}`);
    ctx.body = responseUtil.success({ userId }, '登录成功');
  } catch (error) {
    logger.warn(`登录失败: ${error.message}`);
    ctx.status = 401;
    ctx.body = responseUtil.error(error.message || '无效的凭据', 401);
  }
};

// 使用授权码获取访问令牌
const token = async (ctx: Context) => {
  const { code, code_verifier } = ctx.request.body;

  if (!code) {
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少授权码');
    return;
  }

  try {
    const tokenResponse = await authService.exchangeCodeForToken(code, code_verifier);
    logger.info(`成功交换授权码为令牌`);
    ctx.body = responseUtil.success(tokenResponse);
  } catch (error) {
    logger.warn(`授权码交换失败: ${error.message}`);
    ctx.status = 400;
    ctx.body = responseUtil.error(error.message);
  }
};

// 刷新访问令牌 - 需要同时提供刷新令牌和访问令牌
const refreshToken = async (ctx: Context) => {
  const { refresh_token, access_token } = ctx.request.body;

  if (!refresh_token || !access_token) {
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少刷新令牌或访问令牌');
    return;
  }

  try {
    const tokenResponse = await authService.refreshAccessToken(refresh_token, access_token);
    logger.info('成功刷新访问令牌');
    ctx.body = responseUtil.success(tokenResponse);
  } catch (error) {
    logger.warn(`刷新令牌失败: ${error.message}`);
    ctx.status = 401;
    ctx.body = responseUtil.error(error.message, 401);
  }
};

// 全局注销
const logout = async (ctx: Context) => {
  const { refresh_token } = ctx.request.body;

  // 清除会话
  if (ctx.session) {
    ctx.session = null;
  }

  if (!refresh_token) {
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少刷新令牌');
    return;
  }

  // 吊销刷新令牌
  const success = authService.revokeRefreshToken(refresh_token);

  if (success) {
    logger.info('用户成功注销');
    ctx.body = responseUtil.success(null, '成功注销');
  } else {
    logger.warn('注销失败: 无效的刷新令牌');
    ctx.status = 400;
    ctx.body = responseUtil.error('无效的刷新令牌');
  }
};

export default {
  login,
  register,
  authorize,
  token,
  refreshToken,
  logout,
};
