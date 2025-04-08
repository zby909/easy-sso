/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 14:51:43
 * @LastEditors: zby
 * @Reference:
 */
// src/utils/logger.js
import winston from 'winston';

/*
  方法解释：
  level: 设置日志级别 这里设置了info级别
  format: 设置日志格式 这里设置了时间戳和json格式
  transports: 设置日志输出方式 这里设置了控制台输出和文件输出
  使用：
  logger.log('info', 'Hello distributed log files!');
  logger.info('Hello again distributed logs');
  logger.warn('Warning message');
  logger.error('Error message');
  logger.debug('Debugging info');
*/
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'combined.log' })],
});

export default logger;
