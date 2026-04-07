// 简单的认证逻辑测试
const AsyncStorage = require('@react-native-async-storage/async-storage');

// 模拟fetch
const mockFetch = async (url, options) => {
  console.log('Mock fetch called with:', url, options);
  
  // 模拟登录请求
  if (url.includes('/api/login')) {
    return {
      ok: true,
      json: async () => ({ ok: true }),
      headers: {
        get: (name) => {
          if (name === 'Set-Cookie') {
            return 'auth_token=test_token; Path=/';
          }
          return null;
        }
      }
    };
  }
  
  // 模拟需要认证的请求
  if (url.includes('/api/test')) {
    // 检查认证头
    const headers = options.headers;
    if (headers['X-Auth-Password'] === 'test password') {
      return {
        ok: true,
        json: async () => ({ message: 'Success' }),
        headers: { get: () => null }
      };
    } else {
      return {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
        headers: { get: () => null }
      };
    }
  }
  
  return {
    ok: false,
    status: 404,
    text: async () => 'Not Found',
    headers: { get: () => null }
  };
};

// 模拟AsyncStorage
AsyncStorage.setItem = async (key, value) => {
  console.log('AsyncStorage set:', key, value);
};

AsyncStorage.getItem = async (key) => {
  console.log('AsyncStorage get:', key);
  if (key === 'mytv_login_credentials') {
    return JSON.stringify({ password: 'test password' });
  }
  return null;
};

// 测试认证逻辑
class TestApi {
  constructor() {
    this.baseURL = 'http://localhost:3000';
  }

  async buildHeaders(headers) {
    const requestHeaders = { ...headers };
    const authCookies = await AsyncStorage.getItem('authCookies');
    
    if (authCookies && !requestHeaders['Cookie']) {
      requestHeaders['Cookie'] = authCookies;
    }
    
    try {
      const credentialsStr = await AsyncStorage.getItem('mytv_login_credentials');
      if (credentialsStr) {
        const authInfo = JSON.parse(credentialsStr);
        if (authInfo.password) {
          requestHeaders['X-Auth-Password'] = authInfo.password;
        } else if (authInfo.username && authInfo.signature) {
          requestHeaders['X-Auth-Username'] = authInfo.username;
          requestHeaders['X-Auth-Signature'] = authInfo.signature;
          if (authInfo.timestamp) {
            requestHeaders['X-Auth-Timestamp'] = authInfo.timestamp.toString();
          }
        }
      }
    } catch (error) {
      console.error('Failed to add auth headers:', error);
    }
    
    return requestHeaders;
  }

  async _fetch(url, options = {}, retryCount = 0, avoidReLogin = false) {
    console.log('Fetching:', url, options);
    
    const headers = await this.buildHeaders(options.headers);
    
    try {
      const response = await mockFetch(`${this.baseURL}${url}`, {
        ...options,
        headers,
      });
      
      console.log('Response status:', response.status);
      
      // 处理 Set-Cookie 头
      const setCookie = response.headers.get('Set-Cookie');
      if (setCookie) {
        const cookieString = setCookie.split('; ')[0];
        await AsyncStorage.setItem('authCookies', cookieString);
      }
      
      if (response.status === 401 && retryCount < 1 && !avoidReLogin) {
        console.log('401 error, attempting to re-login');
        try {
          const credentialsStr = await AsyncStorage.getItem('mytv_login_credentials');
          if (credentialsStr) {
            const authInfo = JSON.parse(credentialsStr);
            let loginResponse;
            
            if (authInfo.password) {
              loginResponse = await mockFetch(`${this.baseURL}/api/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Auth-Password': authInfo.password
                },
                body: JSON.stringify({ password: authInfo.password }),
              });
            }
            
            if (loginResponse && loginResponse.ok) {
              console.log('Re-login successful, retrying original request');
              const loginSetCookie = loginResponse.headers.get('Set-Cookie');
              if (loginSetCookie) {
                const cookieString = loginSetCookie.split('; ')[0];
                await AsyncStorage.setItem('authCookies', cookieString);
              }
              return this._fetch(url, options, retryCount + 1);
            }
          }
        } catch (loginError) {
          console.warn('Auto re-login failed:', loginError);
        }
        throw new Error('UNAUTHORIZED');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async login(password) {
    try {
      const response = await this._fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      }, 0, true);
      return response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async testAuth() {
    try {
      const response = await this._fetch('/api/test');
      return response.json();
    } catch (error) {
      console.error('Test auth error:', error);
      throw error;
    }
  }
}

// 运行测试
async function runTest() {
  console.log('=== Testing Auth Logic ===');
  const api = new TestApi();
  
  try {
    // 测试登录
    console.log('\n1. Testing login...');
    const loginResult = await api.login('test password');
    console.log('Login result:', loginResult);
    
    // 测试认证
    console.log('\n2. Testing authenticated request...');
    const testResult = await api.testAuth();
    console.log('Test result:', testResult);
    
    console.log('\n=== Test completed successfully ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
