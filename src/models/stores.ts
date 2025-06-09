/*
 * @Description: 内存存储实现
 * @Author: zby
 * @Date: 2024-06-24
 * @LastEditors: zby
 * @Reference:
 */
import { UserTokenInfo, AuthCodeData } from './interfaces';
import logger from '../utils/logger';

// 用户令牌存储，同时作为活跃令牌记录和黑名单机制
class TokenStore {
  private userTokens = new Map<number, UserTokenInfo>();

  // 存储用户令牌
  set(userId: number, tokenInfo: UserTokenInfo): void {
    this.userTokens.set(userId, tokenInfo);
    logger.info(`TokenStore: 存储用户${userId}的令牌`);
  }

  // 获取用户令牌
  get(userId: number): UserTokenInfo | undefined {
    return this.userTokens.get(userId);
  }

  // 删除用户令牌
  delete(userId: number): boolean {
    logger.info(`TokenStore: 删除用户${userId}的令牌`);
    return this.userTokens.delete(userId);
  }

  // 清空所有令牌
  clear(): void {
    this.userTokens.clear();
    logger.info('TokenStore: 清空所有令牌');
  }
}

// 授权码存储
class AuthCodeStore {
  private codes = new Map<string, AuthCodeData>();

  // 存储授权码
  set(code: string, data: AuthCodeData): void {
    this.codes.set(code, data);
    logger.info(`AuthCodeStore: 生成授权码，用户ID: ${data.userId}`);
  }

  // 获取授权码数据
  get(code: string): AuthCodeData | undefined {
    return this.codes.get(code);
  }

  // 删除授权码
  delete(code: string): boolean {
    logger.info(`AuthCodeStore: 删除授权码`);
    return this.codes.delete(code);
  }

  // 清理过期的授权码
  cleanExpired(): void {
    const now = new Date();
    let expiredCount = 0;

    this.codes.forEach((data, code) => {
      if (data.expiresAt < now) {
        this.codes.delete(code);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      logger.info(`AuthCodeStore: 清理了${expiredCount}个过期授权码`);
    }
  }
}

// 导出单例实例
export const userTokenStore = new TokenStore();
export const authCodeStore = new AuthCodeStore();

// 定期清理过期授权码（每10分钟）
setInterval(
  () => {
    authCodeStore.cleanExpired();
  },
  10 * 60 * 1000,
);
