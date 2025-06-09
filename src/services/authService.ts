/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:34:43
 * @LastEditors: zby
 * @Reference:
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { UserInput, TokenResponse } from '../models/interfaces';
import { userTokenStore, authCodeStore } from '../models/stores';
import logger from '../utils/logger';
import guid from '../utils/guid';

const prisma = new PrismaClient();
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
const refreshSecret = process.env.REFRESH_SECRET || 'your_refresh_secret';

// 用户注册
const register = async (user: UserInput) => {
  const { email, password, name } = user;

  if (!password || !name) {
    throw new Error('用户名和密码是必填项');
  }

  // 检查用户名是否已存在
  const existingUserByName = await prisma.user.findUnique({
    where: { name },
  });

  if (existingUserByName) {
    throw new Error('此用户名已被注册');
  }

  // 如果提供了邮箱，检查邮箱是否已存在
  if (email) {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new Error('此邮箱已被注册');
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Insert new user record
  const newUser = await prisma.user.create({
    data: {
      email: email || null, // 如果未提供邮箱，则为null
      password: hashedPassword,
      name, // 用户名（账号）
    },
  });

  logger.info(`新用户注册成功: ${newUser.id}`);
  return newUser.id;
};

// 用户登录
const login = async (nameOrEmail: string, password: string) => {
  // 查找用户，支持使用用户名或邮箱登录
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: nameOrEmail }, { name: nameOrEmail }],
    },
  });

  if (!user) {
    logger.info(`登录失败: 用户不存在 - ${nameOrEmail}`);
    throw new Error('无效的凭据');
  }

  // 验证密码
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    logger.info(`登录失败: 密码错误 - ${nameOrEmail}`);
    throw new Error('无效的凭据');
  }

  logger.info(`用户登录成功: ${user.id}`);
  return user.id;
};

// 生成授权码
const generateAuthCode = (userId: number, code_challenge?: string, code_challenge_method?: string) => {
  // 使用guid生成更安全的授权码
  const code = guid(24, false);

  // 授权码有效期10分钟
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // 存储授权码信息
  authCodeStore.set(code, {
    userId,
    expiresAt,
    code_challenge,
    code_challenge_method,
  });

  logger.info(`生成授权码: 用户ID ${userId}`);
  return code;
};

// 使用授权码交换访问令牌和刷新令牌
const exchangeCodeForToken = async (code: string, code_verifier?: string): Promise<TokenResponse> => {
  const codeData = authCodeStore.get(code);

  if (!codeData) {
    logger.warn(`授权码交换失败: 无效的授权码 ${code}`);
    throw new Error('无效的授权码');
  }

  if (codeData.expiresAt < new Date()) {
    authCodeStore.delete(code);
    logger.warn(`授权码交换失败: 授权码已过期 ${code}`);
    throw new Error('授权码已过期');
  }

  // PKCE 校验
  if (codeData.code_challenge) {
    if (!code_verifier) {
      logger.warn('授权码交换失败: 缺少 code_verifier');
      throw new Error('缺少 code_verifier');
    }
    let challenge;
    if (!codeData.code_challenge_method || codeData.code_challenge_method.toLowerCase() === 'plain') {
      challenge = code_verifier;
    } else if (codeData.code_challenge_method.toLowerCase() === 's256') {
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
  }

  // 删除使用过的授权码
  authCodeStore.delete(code);

  const userId = codeData.userId;

  // 检查用户是否已经有有效令牌
  const existingTokens = userTokenStore.get(userId);
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

  // 存储新令牌信息
  userTokenStore.set(userId, { accessToken, refreshToken });

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
    let accessPayload;
    try {
      accessPayload = jwt.verify(accessToken, jwtSecret, { ignoreExpiration: true }) as jwt.JwtPayload;
      if (accessPayload.type !== 'access') {
        logger.warn('刷新令牌失败: 无效的访问令牌类型');
        throw new Error('无效的访问令牌');
      }
    } catch (error) {
      logger.warn(`刷新令牌失败: 无效的访问令牌格式 - ${error.message}`);
      throw new Error('无效的访问令牌格式: ' + error.message);
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
    const storedTokens = userTokenStore.get(userId);
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
const revokeRefreshToken = (refreshToken: string): boolean => {
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
    const storedTokens = userTokenStore.get(userId);
    if (!storedTokens || storedTokens.refreshToken !== refreshToken) {
      logger.warn(`吊销令牌失败: 不是活跃令牌 用户ID=${userId}`);
      return false; // 不是当前活跃令牌，可能已被撤销或替换
    }

    // 从用户令牌存储中删除
    userTokenStore.delete(userId);
    logger.info(`成功吊销令牌: 用户ID=${userId}`);
    return true;
  } catch (error) {
    logger.warn(`吊销令牌失败: ${error.message}`);
    return false;
  }
};

// 清除令牌（用于系统维护）
const clearUserTokens = () => {
  userTokenStore.clear();
  logger.info('已清除所有用户令牌');
};

export default {
  register,
  login,
  generateAuthCode,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeRefreshToken,
  clearUserTokens,
};
