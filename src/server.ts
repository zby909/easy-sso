/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-17 11:33:04
 * @LastEditors: zby
 * @Reference:
 */
import Koa from 'koa';
import http from 'http';
import https from 'https';
import './config/env.ts';
import App from './app.ts';
import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV?.trim();
const isDev = NODE_ENV === 'development';
// 创建 Koa 实例
const app = new Koa();
let httpServer;
if (!isDev) {
  console.log('isDev https');
  httpServer = https.createServer(
    {
      key: fs.readFileSync(path.resolve('crt/server.key')),
      cert: fs.readFileSync(path.resolve('crt/server.crt')),
    },
    app.callback(),
  );
} else {
  httpServer = http.createServer(app.callback());
}

// 加载 Koa 中间件和路由配置
App(app);

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port localhost:${PORT}`);
});
