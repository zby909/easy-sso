/*
 * @Description: 全局错误处理中间件
 * @Author: zby
 * @Date: 2024-06-24
 * @LastEditors: zby
 * @Reference:
 */
import { Context, Next } from 'koa';
import responseUtil from '../utils/responseUtil';
import logger from '../utils/logger';

/**
 * 全局错误处理中间件
 * 捕获请求处理过程中的所有错误，并返回统一格式的错误响应
 */
const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    // 记录错误日志
    logger.error(`服务器错误: ${err.message}`, {
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
    });

    // 确定响应状态码
    const status = err.status || 500;

    // 设置响应
    ctx.status = status;
    ctx.body = responseUtil.error(err.message || '服务器内部错误', status);
  }
};

export default errorHandler;
