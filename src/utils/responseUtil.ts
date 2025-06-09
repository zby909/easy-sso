/*
 * @Description: 统一响应格式工具
 * @Author: zby
 * @Date: 2024-06-19
 * @LastEditors: zby
 * @Reference:
 */

export interface ApiResponse<T = any> {
  code: number;
  data: T | null;
  msg: string;
}

export default {
  /**
   * 成功响应
   * @param data 响应数据
   * @param msg 成功消息
   * @param code 状态码
   * @returns
   */
  success<T>(data: T, msg: string = '操作成功', code: number = 200): ApiResponse<T> {
    return {
      code,
      data,
      msg,
    };
  },

  /**
   * 错误响应
   * @param msg 错误消息
   * @param code 状态码
   * @param data 额外数据
   * @returns
   */
  error<T = null>(msg: string = '操作失败', code: number = 400, data: T | null = null): ApiResponse<T> {
    return {
      code,
      data,
      msg,
    };
  },
};
