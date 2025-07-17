/*
 * @Description: 邮件服务
 * @Author: zby
 * @Date: 2025-07-14
 * @LastEditors: zby
 * @Reference:
 */
import nodemailer from 'nodemailer';
import logger from './logger';

// 配置邮件传输器
// 注意：这些配置项应该放在环境变量中，这里仅作示例
const transporter = nodemailer.createTransport({
  // SMTP服务器配置
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

// 发送验证码邮件
const sendVerificationCode = async (to: string, code: string, purpose: 'register' | 'login' | 'reset'): Promise<boolean> => {
  try {
    // 根据不同目的生成不同的主题和内容
    let subject = '';
    let text = '';
    let html = '';

    switch (purpose) {
      case 'register':
        subject = '【SSO认证系统】注册验证码';
        text = `您的注册验证码是: ${code}，有效期10分钟。如非您本人操作，请忽略此邮件。`;
        html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">SSO认证系统 - 注册验证码</h2>
            <p>您好，</p>
            <p>您正在注册SSO认证系统账号，验证码如下：</p>
            <div style="background-color: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px;">
              ${code}
            </div>
            <p>验证码有效期为10分钟，请及时完成注册。</p>
            <p>如非您本人操作，请忽略此邮件。</p>
            <p>谢谢！</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #777; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
          </div>
        `;
        break;

      case 'login':
        subject = '【SSO认证系统】登录验证码';
        text = `您的登录验证码是: ${code}，有效期10分钟。如非您本人操作，请忽略此邮件。`;
        html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">SSO认证系统 - 登录验证码</h2>
            <p>您好，</p>
            <p>您正在登录SSO认证系统，验证码如下：</p>
            <div style="background-color: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px;">
              ${code}
            </div>
            <p>验证码有效期为10分钟，请及时完成登录。</p>
            <p>如非您本人操作，请忽略此邮件。</p>
            <p>谢谢！</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #777; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
          </div>
        `;
        break;

      case 'reset':
        subject = '【SSO认证系统】重置密码验证码';
        text = `您的重置密码验证码是: ${code}，有效期10分钟。如非您本人操作，请忽略此邮件。`;
        html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">SSO认证系统 - 重置密码验证码</h2>
            <p>您好，</p>
            <p>您正在重置SSO认证系统的密码，验证码如下：</p>
            <div style="background-color: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px;">
              ${code}
            </div>
            <p>验证码有效期为10分钟，请及时完成密码重置。</p>
            <p>如非您本人操作，请忽略此邮件。</p>
            <p>谢谢！</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #777; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
          </div>
        `;
        break;
    }

    // 发送邮件
    const info = await transporter.sendMail({
      from: `"SSO认证系统" <${process.env.SMTP_USER || 'noreply@example.com'}>`,
      to,
      subject,
      text,
      html,
    });

    logger.info(`验证码邮件已发送: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`发送验证码邮件失败: ${error.message}`, error);
    return false;
  }
};

// 生成随机验证码
const generateVerificationCode = (length = 6): string => {
  // 只使用数字
  return Math.random()
    .toString()
    .substring(2, 2 + length);
};

export default {
  sendVerificationCode,
  generateVerificationCode,
};
