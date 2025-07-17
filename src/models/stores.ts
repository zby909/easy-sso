/*
 * @Description: Redis存储实现
 * @Author: zby
 * @Date: 2024-06-24
 * @LastEditors: zby
 * @Reference:
 */
import { UserTokenInfo, AuthCodeData } from './interfaces';
import logger from '../utils/logger';
import redisClient from '../utils/redis';

// 用户令牌存储，使用Redis
class TokenStore {
  private readonly prefix = 'token:';
  private readonly expiry = 60 * 60 * 24 * 7; // 7天，与refreshToken一致

  // 存储用户令牌
  async set(userId: number, tokenInfo: UserTokenInfo): Promise<void> {
    const key = this.prefix + userId;
    await redisClient.set(key, JSON.stringify(tokenInfo), 'EX', this.expiry);
    logger.info(`TokenStore: 存储用户${userId}的令牌`);
  }

  // 获取用户令牌
  async get(userId: number): Promise<UserTokenInfo | undefined> {
    const key = this.prefix + userId;
    const data = await redisClient.get(key);
    if (!data) return undefined;

    try {
      return JSON.parse(data) as UserTokenInfo;
    } catch (err) {
      logger.error(`TokenStore: 解析用户${userId}的令牌数据失败`, err);
      return undefined;
    }
  }

  // 删除用户令牌
  async delete(userId: number): Promise<boolean> {
    const key = this.prefix + userId;
    const result = await redisClient.del(key);
    const success = result === 1;
    logger.info(`TokenStore: ${success ? '成功' : '失败'}删除用户${userId}的令牌`);
    return success;
  }

  // 清空所有令牌 (谨慎使用)
  async clear(): Promise<void> {
    const keys = await redisClient.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(`TokenStore: 清空了${keys.length}个令牌`);
    }
  }
}

// 授权码存储，使用Redis
class AuthCodeStore {
  private readonly prefix = 'code:';
  private readonly expiry = 60 * 10; // 10分钟，与授权码有效期一致

  // 存储授权码
  async set(code: string, data: AuthCodeData): Promise<void> {
    const key = this.prefix + code;
    await redisClient.set(key, JSON.stringify(data), 'EX', this.expiry);
    logger.info(`AuthCodeStore: 生成授权码，用户ID: ${data.userId}`);
  }

  // 获取授权码数据
  async get(code: string): Promise<AuthCodeData | undefined> {
    const key = this.prefix + code;
    const data = await redisClient.get(key);
    if (!data) return undefined;

    try {
      return JSON.parse(data) as AuthCodeData;
    } catch (err) {
      logger.error(`AuthCodeStore: 解析授权码数据失败`, err);
      return undefined;
    }
  }

  // 删除授权码
  async delete(code: string): Promise<boolean> {
    const key = this.prefix + code;
    const result = await redisClient.del(key);
    const success = result === 1;
    logger.info(`AuthCodeStore: ${success ? '成功' : '失败'}删除授权码`);
    return success;
  }

  // 不再需要定期清理，Redis会根据设置的过期时间自动清理
}

// 验证码存储，使用Redis
class VerificationCodeStore {
  private readonly prefix = 'verificationCode:';
  private readonly expiry = 60 * 10; // 10分钟有效期

  // 存储验证码
  async set(email: string, code: string, purpose: string): Promise<void> {
    const key = `${this.prefix}${purpose}:${email}`;
    await redisClient.set(key, code, 'EX', this.expiry);
    logger.info(`VerificationCodeStore: 存储${purpose}验证码, 邮箱: ${email}`);
  }

  // 获取验证码
  async get(email: string, purpose: string): Promise<string | undefined> {
    const key = `${this.prefix}${purpose}:${email}`;
    const code = await redisClient.get(key);
    return code || undefined;
  }

  // 删除验证码
  async delete(email: string, purpose: string): Promise<boolean> {
    const key = `${this.prefix}${purpose}:${email}`;
    const result = await redisClient.del(key);
    const success = result === 1;
    logger.info(`VerificationCodeStore: ${success ? '成功' : '失败'}删除${purpose}验证码, 邮箱: ${email}`);
    return success;
  }

  // 验证验证码
  async verify(email: string, code: string, purpose: string): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV?.trim();
    logger.info(`环境变量 NODE_ENV: '${nodeEnv}', 输入验证码: '${code}'`);

    // 开发环境下支持固定验证码123456
    if (nodeEnv === 'development' && code === '123456') {
      logger.info(`验证码验证成功(开发模式): 邮箱: ${email}, 用途: ${purpose}, 验证码: ${code}`);
      return true;
    }

    const storedCode = await this.get(email, purpose);
    if (!storedCode) {
      logger.warn(`验证码验证失败: 未找到验证码 邮箱: ${email}, 用途: ${purpose}`);
      return false;
    }

    const isValid = storedCode === code;

    if (isValid) {
      // 验证成功后删除验证码，防止重复使用
      await this.delete(email, purpose);
      logger.info(`验证码验证成功: 邮箱: ${email}, 用途: ${purpose}`);
    } else {
      logger.warn(`验证码验证失败: 验证码不匹配 邮箱: ${email}, 用途: ${purpose}, 输入: ${code}, 存储: ${storedCode}`);
    }

    return isValid;
  }
}

// 导出单例实例
export const userTokenStore = new TokenStore();
export const authCodeStore = new AuthCodeStore();
export const verificationCodeStore = new VerificationCodeStore();

// 不再需要定期清理任务，Redis会自动处理过期的键
