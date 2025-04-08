/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 15:17:23
 * @LastEditors: zby
 * @Reference:
 */
// src/routes/authRoutes.js
import Router from 'koa-router';
import authController from '../controllers/authController.ts';

const router = new Router({
  prefix: '/auth',
});

router.post('/login', authController.login); // 登录
router.post('/register', authController.register); // 注册

export default router;
