/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:34:43
 * @LastEditors: zby
 * @Reference:
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { UserInput, TokenResponse, EmailLoginRequest } from '../models/interfaces';
import { userTokenStore, authCodeStore, verificationCodeStore } from '../models/stores';
import logger from '../utils/logger';
import guid from '../utils/guid';
import emailService from '../utils/emailService';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
const refreshSecret = process.env.REFRESH_SECRET || 'your_refresh_secret';

// 生成授权码
const generateAuthCode = async (userId: number, code_challenge: string, code_challenge_method: string) => {
  if (!code_challenge) {
    // 强制要求PKCE参数
    logger.warn(`生成授权码失败: 缺少必需的code_challenge参数`);
    throw new Error('缺少必需的code_challenge参数，必须使用PKCE');
  }

  if (!code_challenge_method) {
    // 如果未提供code_challenge_method，默认使用S256
    code_challenge_method = 's256';
  }

  // 使用guid生成更安全的授权码
  const code = guid(24, false);

  // 授权码有效期10分钟
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // 存储授权码信息 (现在是异步的)
  await authCodeStore.set(code, {
    userId,
    expiresAt,
    code_challenge,
    code_challenge_method,
  });

  logger.info(`生成授权码: 用户ID ${userId}`);
  return code;
};

// 使用授权码交换访问令牌和刷新令牌
const exchangeCodeForToken = async (code: string, code_verifier: string): Promise<TokenResponse> => {
  const codeData = await authCodeStore.get(code);

  if (!codeData) {
    logger.warn(`授权码交换失败: 无效的授权码 ${code}`);
    throw new Error('无效的授权码');
  }

  if (codeData.expiresAt < new Date()) {
    await authCodeStore.delete(code);
    logger.warn(`授权码交换失败: 授权码已过期 ${code}`);
    throw new Error('授权码已过期');
  }

  // PKCE 校验 - 强制要求
  if (!code_verifier) {
    logger.warn('授权码交换失败: 缺少必需的code_verifier');
    throw new Error('缺少必需的code_verifier，必须使用PKCE');
  }

  let challenge;
  if (codeData.code_challenge_method.toLowerCase() === 's256') {
    challenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest()
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } else {
    logger.warn(`授权码交换失败: 不支持的方法 ${codeData.code_challenge_method}`);
    throw new Error('不支持的 code_challenge_method');
  }

  if (challenge !== codeData.code_challenge) {
    logger.warn('授权码交换失败: PKCE 校验失败');
    throw new Error('PKCE 校验失败');
  }

  // 删除使用过的授权码
  await authCodeStore.delete(code);

  const userId = codeData.userId;

  // 检查用户是否已经有有效令牌
  const existingTokens = await userTokenStore.get(userId);
  if (existingTokens) {
    // 如果用户已经有令牌，直接返回现有令牌
    // 验证刷新令牌是否过期
    try {
      jwt.verify(existingTokens.refreshToken, refreshSecret);
      // 刷新令牌有效，返回现有令牌
      logger.info(`使用现有令牌: 用户ID ${userId}`);
      return {
        access_token: existingTokens.accessToken,
        token_type: 'Bearer',
        refresh_token: existingTokens.refreshToken,
      };
    } catch (error) {
      // 如果刷新令牌已过期，生成新令牌
      logger.info(`刷新令牌已过期，生成新令牌: ${error.message}`);
    }
  }

  // 没有有效令牌，生成新令牌
  return generateTokenPair(userId);
};

// 生成访问令牌和刷新令牌对
const generateTokenPair = async (userId: number): Promise<TokenResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    logger.error(`生成令牌失败: 用户不存在 ID=${userId}`);
    throw new Error('用户不存在');
  }

  // 生成短期有效的JWT访问令牌 (15分钟)
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      type: 'access',
    },
    jwtSecret,
    { expiresIn: '15m' }, // 15分钟
  );

  // 生成长期有效的JWT刷新令牌 (7天)
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh',
      jti: guid(16, false), // 令牌唯一标识符
    },
    refreshSecret,
    { expiresIn: '7d' }, // 7天
  );

  // 存储新令牌信息 (现在是异步的)
  await userTokenStore.set(userId, { accessToken, refreshToken });

  logger.info(`为用户 ${userId} 生成新令牌对`);
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    refresh_token: refreshToken,
  };
};

// 使用刷新令牌和访问令牌获取新的访问令牌
const refreshAccessToken = async (refreshToken: string, accessToken: string): Promise<TokenResponse> => {
  try {
    // 首先验证访问令牌，即使已过期
    const accessPayload = jwt.verify(accessToken, jwtSecret, { ignoreExpiration: true }) as jwt.JwtPayload;
    if (accessPayload.type !== 'access') {
      logger.warn('刷新令牌失败: 无效的访问令牌类型');
      throw new Error('无效的访问令牌');
    }

    // 验证刷新令牌
    const refreshPayload = jwt.verify(refreshToken, refreshSecret) as jwt.JwtPayload;

    // 检查令牌类型
    if (refreshPayload.type !== 'refresh') {
      logger.warn('刷新令牌失败: 无效的刷新令牌类型');
      throw new Error('无效的刷新令牌');
    }

    // 确保访问令牌和刷新令牌属于同一用户
    if (refreshPayload.id !== accessPayload.id) {
      logger.warn('刷新令牌失败: 令牌不匹配');
      throw new Error('令牌不匹配');
    }

    const userId = refreshPayload.id;

    // 验证用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn(`刷新令牌失败: 用户不存在 ID=${userId}`);
      throw new Error('用户不存在');
    }

    // 检查刷新令牌是否是存储中的活跃令牌
    const storedTokens = await userTokenStore.get(userId);
    if (!storedTokens || storedTokens.refreshToken !== refreshToken) {
      logger.warn(`刷新令牌失败: 令牌已失效 用户ID=${userId}`);
      throw new Error('刷新令牌已失效');
    }

    // 生成新的访问令牌和刷新令牌对
    logger.info(`成功刷新令牌: 用户ID=${userId}`);
    return generateTokenPair(userId);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('刷新令牌失败: 刷新令牌已过期');
      throw new Error('刷新令牌已过期');
    }
    throw error;
  }
};

// 吊销刷新令牌
const revokeRefreshToken = async (refreshToken: string): Promise<boolean> => {
  try {
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, refreshSecret) as jwt.JwtPayload;

    // 检查令牌类型
    if (decoded.type !== 'refresh') {
      logger.warn('吊销令牌失败: 无效的令牌类型');
      return false;
    }

    const userId = decoded.id;

    // 检查是否是当前存储的活跃令牌
    const storedTokens = await userTokenStore.get(userId);
    if (!storedTokens || storedTokens.refreshToken !== refreshToken) {
      logger.warn(`吊销令牌失败: 不是活跃令牌 用户ID=${userId}`);
      return false; // 不是当前活跃令牌，可能已被撤销或替换
    }

    // 从用户令牌存储中删除
    await userTokenStore.delete(userId);
    logger.info(`成功吊销令牌: 用户ID=${userId}`);
    return true;
  } catch (error) {
    logger.warn(`吊销令牌失败: ${error.message}`);
    return false;
  }
};

// 清除令牌（用于系统维护）
const clearUserTokens = async () => {
  await userTokenStore.clear();
  logger.info('已清除所有用户令牌');
};

// 发送邮箱验证码
const sendVerificationCode = async (email: string, purpose: 'register' | 'login' | 'reset'): Promise<boolean> => {
  if (!email) {
    logger.warn('发送验证码失败: 缺少邮箱地址');
    throw new Error('缺少邮箱地址');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn(`发送验证码失败: 邮箱格式不正确 ${email}`);
    throw new Error('邮箱格式不正确');
  }

  // 生成验证码
  const code = emailService.generateVerificationCode();

  // 如果是注册验证码，先检查邮箱是否已注册
  if (purpose === 'register') {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      logger.warn(`发送注册验证码失败: 邮箱已被注册 ${email}`);
      throw new Error('此邮箱已被注册');
    }
  }

  // 如果是登录或重置密码验证码，先检查邮箱是否存在
  if (purpose === 'login' || purpose === 'reset') {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (!existingUser) {
      logger.warn(`发送${purpose === 'login' ? '登录' : '重置密码'}验证码失败: 邮箱未注册 ${email}`);
      throw new Error('此邮箱未注册');
    }
  }

  // 存储验证码
  await verificationCodeStore.set(email, code, purpose);

  // 发送验证码邮件
  const sent = await emailService.sendVerificationCode(email, code, purpose);
  if (!sent) {
    logger.error(`发送验证码邮件失败: ${email}`);
    throw new Error('发送验证码邮件失败，请稍后重试');
  }

  logger.info(`验证码已发送: ${email}, 用途: ${purpose}`);
  return true;
};

// 使用验证码注册
const registerWithVerification = async (user: UserInput): Promise<number> => {
  const { email, name, verificationCode } = user;

  if (!email || !name || !verificationCode) {
    throw new Error('邮箱、用户名和验证码都是必填项');
  }

  // 验证验证码
  const isCodeValid = await verificationCodeStore.verify(email, verificationCode, 'register');
  if (!isCodeValid) {
    logger.warn(`注册失败: 验证码无效 ${email}`);
    throw new Error('验证码无效或已过期');
  }

  // 验证通过，继续注册流程
  // 检查用户名是否已存在
  const existingUserByName = await prisma.user.findUnique({
    where: { name },
  });

  if (existingUserByName) {
    throw new Error('此用户名已被注册');
  }

  // 检查邮箱是否已存在
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUserByEmail) {
    throw new Error('此邮箱已被注册');
  }

  // 创建新用户 (无密码)
  const newUser = await prisma.user.create({
    data: {
      email,
      name,
    },
  });

  logger.info(`用户注册成功: ${newUser.id}`);
  return newUser.id;
};

// 使用邮箱验证码登录
const loginWithEmailCode = async (loginData: EmailLoginRequest): Promise<number> => {
  const { email, code } = loginData;

  if (!email || !code) {
    throw new Error('邮箱和验证码是必填项');
  }

  // 验证验证码
  const isCodeValid = await verificationCodeStore.verify(email, code, 'login');
  if (!isCodeValid) {
    logger.warn(`邮箱验证码登录失败: 验证码无效 ${email}`);
    throw new Error('验证码无效或已过期');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    logger.warn(`邮箱验证码登录失败: 用户不存在 - ${email}`);
    throw new Error('用户不存在');
  }

  // 更新用户最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info(`用户通过邮箱验证码登录成功: ${user.id}`);
  return user.id;
};

export default {
  generateAuthCode,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeRefreshToken,
  clearUserTokens,
  // 邮箱验证码相关方法
  sendVerificationCode,
  registerWithVerification,
  loginWithEmailCode,
};
