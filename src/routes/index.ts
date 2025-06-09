/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 15:04:48
 * @LastEditors: zby
 * @Reference:
 */
// src/routes/index.js
import Router from '@koa/router';
import authRoutes from './authRoutes.ts';

const router = new Router();

router.use(authRoutes.routes(), authRoutes.allowedMethods());

export default router;
