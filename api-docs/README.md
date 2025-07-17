# API文档

## 文件说明

- `openapi.json` - OpenAPI 3.0格式的API文档，可直接导入Apifox、Postman等工具

## 导入方法

### Apifox导入步骤：

1. 打开Apifox
2. 点击"导入" -> "从文件导入"
3. 选择`openapi.json`文件
4. 确认导入设置
5. 完成导入

### API概览

**认证接口：**

- POST `/auth/verification/send` - 发送验证码
- POST `/auth/register` - 用户注册
- POST `/auth/login` - 用户登录
- POST `/auth/logout/center` - 注销登录中心

**OAuth 2.0接口：**

- GET `/auth/authorize` - 获取授权码
- POST `/auth/token` - 获取访问令牌
- POST `/auth/refresh` - 刷新访问令牌
- POST `/auth/logout/token` - 注销令牌

## 特性

✅ 完整的OAuth 2.0 + PKCE流程支持  
✅ 邮箱验证码认证  
✅ Session会话管理  
✅ JWT令牌支持  
✅ 详细的API文档和示例
