/*
 * @Description: 重定向URL白名单
 * @Author: zby
 * @Date: 2024-06-19
 * @LastEditors: zby
 * @Reference:
 */

// 允许重定向的URL白名单
const redirectWhitelist = [
  'http://localhost:8080', // 应用A开发环境
  'http://localhost:5173', // 应用B开发环境
  // 添加其他允许的重定向URL
];

export default redirectWhitelist;
