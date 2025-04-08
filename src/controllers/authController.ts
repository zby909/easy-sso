/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 15:20:27
 * @LastEditors: zby
 * @Reference:
 */
// src/controllers/authController.js
import authService from '../services/authService.ts';

const login = async ctx => {
  const { email, password } = ctx.request.body;
  const token = await authService.login(email, password);
  if (token) {
    ctx.body = { token };
  } else {
    ctx.status = 401;
    ctx.body = { error: 'Invalid credentials' };
  }
};

const register = async ctx => {
  const user = ctx.request.body;
  const userId = await authService.register(user);
  ctx.status = 201;
  ctx.body = { id: userId };
};

export default {
  login,
  register,
};
