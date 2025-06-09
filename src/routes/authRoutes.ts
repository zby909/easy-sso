/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 15:17:23
 * @LastEditors: zby
 * @Reference:
 */
// src/routes/authRoutes.js
import Router from '@koa/router';
import authController from '../controllers/authController.ts';
import { validateRedirectUri } from '../middlewares/authMiddleware';
import redirectWhitelist from '../config/whitelist.ts';

const router = new Router({
  prefix: '/auth',
});

// 授权端点 - OAuth2授权流程入口
// 添加重定向URI验证中间件
router.get('/authorize', validateRedirectUri(redirectWhitelist), authController.authorize);

// 注册账号
router.post('/register', authController.register);

// 处理登录
router.post('/login', authController.login);

// 令牌端点 - 使用授权码获取访问令牌
router.post('/token', authController.token);

// 刷新访问令牌端点
router.post('/refresh', authController.refreshToken);

// 全局注销
router.post('/logout', authController.logout);

export default router;
