/*
 * @Description: 系统数据接口定义
 * @Author: zby
 * @Date: 2024-06-24
 * @LastEditors: zby
 * @Reference:
 */

// 用户令牌信息
export interface UserTokenInfo {
  accessToken: string;
  refreshToken: string;
}

// 授权码数据
export interface AuthCodeData {
  userId: number;
  expiresAt: Date;
  code_challenge: string;
  code_challenge_method: string;
}

// 用户注册/创建输入
export interface UserInput {
  email: string; // 邮箱必填
  password?: string; // 密码可选
  name: string;
  verificationCode?: string; // 验证码字段
}

// 授权请求参数
export interface AuthRequest {
  redirect_uri: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

// 令牌响应格式
export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

// 新增验证码相关接口
export interface VerificationRequest {
  email: string;
  purpose: 'register' | 'login' | 'reset';
}

export interface VerificationVerifyRequest {
  email: string;
  code: string;
  purpose: 'register' | 'login' | 'reset';
}

export interface EmailLoginRequest {
  email: string;
  code: string;
}
