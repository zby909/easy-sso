/*
 * @Description: Redis客户端工具
 * @Author: zby
 * @Date: 2024-06-25
 * @LastEditors: zby
 * @Reference:
 */
import Redis from 'ioredis';
import logger from './logger';

// 创建可重用的Redis客户端实例
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'sso:', // 设置键前缀，避免与其他应用冲突
  // ioredis会自动处理重连等问题
});

// 监听错误事件，便于调试
redisClient.on('error', err => {
  logger.error('Redis客户端错误:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis客户端已连接');
});

export default redisClient;
