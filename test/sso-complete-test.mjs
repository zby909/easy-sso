import http from 'http';
import crypto from 'crypto';

let globalCookies = '';
let authCode = '';
let accessToken = '';
let refreshToken = '';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState() {
  return 'state_' + Date.now();
}

function extractCookies(response) {
  const setCookieHeaders = response.headers['set-cookie'];
  if (setCookieHeaders) {
    const sessionCookies = [];
    for (const cookieHeader of setCookieHeaders) {
      const cookieValue = cookieHeader.split(';')[0];
      if (cookieValue.startsWith('sso_sess=') || cookieValue.startsWith('sso_sess.sig=')) {
        sessionCookies.push(cookieValue);
      }
    }
    if (sessionCookies.length > 0) {
      globalCookies = sessionCookies.join('; ');
      console.log('✅ Session Cookie更新');
    }
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(globalCookies && { Cookie: globalCookies }),
        ...options.headers,
      },
    };

    const req = http.request(requestOptions, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        extractCookies(res);

        resolve({
          status: res.statusCode,
          headers: res.headers,
          json: () => Promise.resolve(JSON.parse(data)),
        });
      });
    });

    req.on('error', err => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testSSO() {
  console.log('🚀 SSO认证授权中心 - 完整功能测试');
  console.log('='.repeat(50));

  const baseURL = 'http://localhost:3000';
  const timestamp = Date.now();
  const testEmail = `362870287@qq.com`;
  const testUser = `User${timestamp}`;

  try {
    // 1. 注册验证码
    console.log('\n📧 步骤1: 发送注册验证码');
    const codeRes = await makeRequest(`${baseURL}/auth/verification/send`, {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, purpose: 'register' }),
    });
    const codeData = await codeRes.json();
    console.log(`${codeRes.status} | ${codeData.msg}`);

    // 2. 用户注册
    console.log('\n👤 步骤2: 用户注册');
    const regRes = await makeRequest(`${baseURL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        name: testUser,
        verificationCode: '123456',
      }),
    });
    const regData = await regRes.json();
    console.log(`${regRes.status} | ${regData.msg} | 用户ID: ${regData.data?.id}`);

    // 3. 登录验证码
    console.log('\n📧 步骤3: 发送登录验证码');
    const loginCodeRes = await makeRequest(`${baseURL}/auth/verification/send`, {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, purpose: 'login' }),
    });
    const loginCodeData = await loginCodeRes.json();
    console.log(`${loginCodeRes.status} | ${loginCodeData.msg}`);

    // 4. 用户登录
    console.log('\n🔐 步骤4: 用户登录');
    const loginRes = await makeRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, code: '123456' }),
    });
    const loginData = await loginRes.json();
    console.log(`${loginRes.status} | ${loginData.msg}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    // 5. OAuth授权
    console.log('\n🎫 步骤5: OAuth授权');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const authParams = new URLSearchParams({
      redirect_uri: 'http://localhost:8080',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authRes = await makeRequest(`${baseURL}/auth/authorize?${authParams}`, {
      method: 'GET',
    });
    const authData = await authRes.json();
    console.log(`${authRes.status} | ${authData.msg}`);

    if (authRes.status === 200 && authData.data?.code) {
      authCode = authData.data.code;
      console.log(`✅ 授权码: ${authCode}`);

      // 6. 获取令牌
      console.log('\n🎟️ 步骤6: 获取访问令牌');
      const tokenRes = await makeRequest(`${baseURL}/auth/token`, {
        method: 'POST',
        body: JSON.stringify({
          code: authCode,
          code_verifier: codeVerifier,
          redirect_uri: 'http://localhost:8080',
        }),
      });
      const tokenData = await tokenRes.json();
      console.log(`${tokenRes.status} | ${tokenData.msg}`);

      if (tokenRes.status === 200) {
        accessToken = tokenData.data.access_token;
        refreshToken = tokenData.data.refresh_token;
        console.log(`✅ 访问令牌: ${accessToken.substring(0, 20)}...`);
        console.log(`✅ 刷新令牌: ${refreshToken.substring(0, 20)}...`);

        // 7. 刷新令牌
        console.log('\n🔄 步骤7: 刷新访问令牌');
        const refreshRes = await makeRequest(`${baseURL}/auth/refresh`, {
          method: 'POST',
          body: JSON.stringify({
            refresh_token: refreshToken,
            access_token: accessToken,
          }),
        });
        const refreshData = await refreshRes.json();
        console.log(`${refreshRes.status} | ${refreshData.msg}`);

        // 更新令牌为新的令牌
        let currentRefreshToken = refreshToken;
        if (refreshRes.status === 200 && refreshData.data?.refresh_token) {
          currentRefreshToken = refreshData.data.refresh_token;
          console.log(`✅ 新刷新令牌: ${currentRefreshToken.substring(0, 20)}...`);
        }

        // 8. 注销令牌 - 使用最新的refresh_token
        console.log('\n🚪 步骤8: 注销令牌');
        const logoutTokenRes = await makeRequest(`${baseURL}/auth/logout/token`, {
          method: 'POST',
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });
        const logoutTokenData = await logoutTokenRes.json();
        console.log(`${logoutTokenRes.status} | ${logoutTokenData.msg}`);
      }
    }

    // 9. 注销登录中心
    console.log('\n🏠 步骤9: 注销登录中心');
    const logoutRes = await makeRequest(`${baseURL}/auth/logout/center`, {
      method: 'POST',
    });
    const logoutData = await logoutRes.json();
    console.log(`${logoutRes.status} | ${logoutData.msg}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SSO测试完成！所有功能正常');
  } catch (error) {
    console.log('\n❌ 测试失败:', error.message);
  }
}

testSSO();
