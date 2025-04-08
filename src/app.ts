/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 11:40:59
 * @LastEditors: zby
 * @Reference:
 */
// src/app.js
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
// import router from './routes/index.ts';

export default app => {
  // 添加中间件
  app.use(logger());
  app.use(bodyParser());

  // 加载路由
  // app.use(router.routes()).use(router.allowedMethods());
};
