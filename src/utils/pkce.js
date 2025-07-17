/*
 * @Description: PKCE工具函数 - 用于OAuth 2.0授权码流程
 * @Author: zby
 * @Date: 2025-07-10
 * @LastEditors: zby
 * @Reference: https://datatracker.ietf.org/doc/html/rfc7636
 */
/**
 * 生成指定长度的随机字符串(code_verifier)
 * @param length 字符串长度，建议43-128之间，默认为43
 * @returns 随机字符串，用作code_verifier
 */
function generateCodeVerifier(length = 43) {
  // PKCE规范要求code_verifier长度在43-128之间
  if (length < 43 || length > 128) {
    throw new Error('Code verifier长度必须在43到128个字符之间');
  }
  // 可用于code_verifier的字符集
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let codeVerifier = '';
  // 使用加密安全的随机数生成器(如果可用)
  if (window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      codeVerifier += possible.charAt(randomValues[i] % possible.length);
    }
  } else {
    // 降级处理(不推荐用于生产环境)
    for (let i = 0; i < length; i++) {
      codeVerifier += possible.charAt(Math.floor(Math.random() * possible.length));
    }
  }
  return codeVerifier;
}
/**
 * 使用SHA-256算法从code_verifier生成code_challenge
 * @param codeVerifier 之前生成的code_verifier
 * @returns Promise<string> 返回base64-url编码的code_challenge
 */
async function generateCodeChallenge(codeVerifier) {
  // 确保传入的code_verifier有效
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    throw new Error('无效的code_verifier，长度必须在43到128个字符之间');
  }
  // 转换字符串为Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  // 使用SHA-256哈希函数
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  // 转换ArrayBuffer为Uint8Array
  const hashArray = new Uint8Array(hashBuffer);
  // 转换为base64字符串
  const base64Hash = btoa(String.fromCharCode(...hashArray));
  // 转换为base64url格式(符合RFC 7636规范)
  return base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * 生成PKCE所需的code_verifier和code_challenge
 * @param length code_verifier的长度，默认为43
 * @returns Promise<{codeVerifier: string, codeChallenge: string}>
 */
async function generatePKCEPair(length = 43) {
  const codeVerifier = generateCodeVerifier(length);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return {
    codeVerifier,
    codeChallenge,
  };
}
/**
 * 使用示例：
 *
 * // 方式一：一步生成PKCE对
 * async function usePKCE() {
 *   const { codeVerifier, codeChallenge } = await generatePKCEPair();
 *
 *   // 存储codeVerifier到localStorage或sessionStorage，用于后续交换token
 *   localStorage.setItem('pkce_code_verifier', codeVerifier);
 *
 *   // 在授权请求中使用codeChallenge
 *   const authUrl = `https://your-auth-server.com/authorize?response_type=code&client_id=YOUR_CLIENT_ID&code_challenge=${codeChallenge}&code_challenge_method=S256`;
 * }
 *
 * // 方式二：分步生成
 * async function usePKCEStepByStep() {
 *   // 1. 生成code_verifier
 *   const codeVerifier = generateCodeVerifier();
 *
 *   // 2. 生成code_challenge
 *   const codeChallenge = await generateCodeChallenge(codeVerifier);
 *
 *   // 3. 存储和使用...
 * }
 */
