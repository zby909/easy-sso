/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-17 11:33:04
 * @LastEditors: zby
 * @Reference:
 */
import Koa from 'koa';
import http from 'http';
import './config/env.ts';
import App from './app.ts';

// 创建 Koa 实例
const app = new Koa();

const httpServer = http.createServer(app.callback());

// 加载 Koa 中间件和路由配置
App(app);

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port localhost:${PORT}`);
});
