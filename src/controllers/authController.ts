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
  if (code_challenge_method && !['S256', 's256'].includes(code_challenge_method as string)) {
    logger.warn(`无效的code_challenge_method: ${code_challenge_method}`);
    ctx.status = 400;
    // ctx.body = responseUtil.error('code_challenge_method必须为plain或S256');
    ctx.body = responseUtil.error('code_challenge_method必须为S256');
    return;
  }

  // 如果用户已登录，则生成授权码
  if (ctx.session?.userId) {
    const code = await authService.generateAuthCode(ctx.session.userId, code_challenge as string, code_challenge_method as string);

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

//注销登录中心
const logoutSSO = async (ctx: Context) => {
  // 检查是否有用户会话，如果有则删除相应记录
  if (ctx.session?.userId) {
    logger.info(`用户 ${ctx.session.userId} 成功注销登录中心`);
  } else {
    logger.info('没有活动的用户会话，无需特殊处理');
  }

  // 无论是否有活动会话，都清除会话并返回成功
  ctx.session = null;
  ctx.body = responseUtil.success(null, '成功注销登录中心');
};

// 注销token
const logoutToken = async (ctx: Context) => {
  const { refresh_token } = ctx.request.body;

  if (!refresh_token) {
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少刷新令牌');
    return;
  }

  // 吊销刷新令牌
  const success = await authService.revokeRefreshToken(refresh_token);

  if (success) {
    logger.info('用户成功注销');
    ctx.body = responseUtil.success(null, '成功注销');
  } else {
    logger.warn('注销失败: 无效的刷新令牌');
    ctx.status = 400;
    ctx.body = responseUtil.error('无效的刷新令牌');
  }
};

// 发送验证码
const sendVerificationCode = async (ctx: Context) => {
  const { email, purpose } = ctx.request.body;

  if (!email || !purpose) {
    ctx.status = 400;
    ctx.body = responseUtil.error('缺少邮箱地址或验证码用途');
    return;
  }

  // 验证purpose参数
  if (!['register', 'login', 'reset'].includes(purpose)) {
    ctx.status = 400;
    ctx.body = responseUtil.error('无效的验证码用途，必须是register、login或reset');
    return;
  }

  try {
    await authService.sendVerificationCode(email, purpose);
    logger.info(`成功发送验证码: ${email}, 用途: ${purpose}`);
    ctx.body = responseUtil.success(null, '验证码已发送');
  } catch (error) {
    logger.warn(`发送验证码失败: ${error.message}`);
    ctx.status = 400;
    ctx.body = responseUtil.error(error.message);
  }
};

// 使用验证码注册
const registerWithVerification = async (ctx: Context) => {
  const { email, name, verificationCode } = ctx.request.body;

  if (!email || !name || !verificationCode) {
    ctx.status = 400;
    ctx.body = responseUtil.error('邮箱、用户名和验证码都是必填项');
    return;
  }

  try {
    const userId = await authService.registerWithVerification({
      email,
      name,
      verificationCode,
    });

    logger.info(`用户通过验证码注册成功: ${userId}`);
    ctx.status = 201;
    ctx.body = responseUtil.success({ id: userId }, '注册成功', 201);
  } catch (error) {
    logger.warn(`验证码注册失败: ${error.message}`);
    ctx.status = 400;
    ctx.body = responseUtil.error(error.message);
  }
};

// 使用邮箱验证码登录
const loginWithEmailCode = async (ctx: Context) => {
  const { email, code } = ctx.request.body;

  if (!email || !code) {
    ctx.status = 400;
    ctx.body = responseUtil.error('邮箱和验证码是必填项');
    return;
  }

  try {
    const userId = await authService.loginWithEmailCode({ email, code });

    // 将用户ID存储在会话中
    ctx.session.userId = userId;

    // 调试日志 - 确认session被设置
    logger.info(`登录成功，设置session: userId=${userId}, sessionId=${ctx.session.sessionUid}`);
    logger.info(`Session内容: ${JSON.stringify(ctx.session)}`);

    logger.info(`用户通过邮箱验证码登录成功: ${userId}`);
    ctx.body = responseUtil.success({ userId }, '登录成功');
  } catch (error) {
    logger.warn(`邮箱验证码登录失败: ${error.message}`);
    ctx.status = 401;
    ctx.body = responseUtil.error(error.message, 401);
  }
};

// 获取用户信息
const getUserInfo = async (ctx: Context) => {
  const userId = ctx.session.userId;

  try {
    const userInfo = await authService.getUserInfo(userId);
    ctx.body = responseUtil.success(userInfo);
  } catch (error) {
    logger.warn(`获取用户信息失败: ${error.message}`);
    ctx.status = 404;
    ctx.body = responseUtil.error(error.message, 404);
  }
};

export default {
  authorize,
  token,
  refreshToken,
  logoutToken,
  logoutSSO,
  sendVerificationCode,
  registerWithVerification,
  loginWithEmailCode,
  getUserInfo,
};
