// 测试后端用户登录
const fetch = require('node-fetch');

const testBackendLogin = async () => {
  console.log('=== 测试后端用户登录 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 测试admin登录
    console.log('1. 测试admin登录:');
    const adminLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('登录状态:', adminLogin.status);
    const adminData = await adminLogin.json();
    console.log('响应:', adminData);
    
    // 2. 测试3a7ba4登录
    console.log('\n2. 测试3a7ba4登录:');
    const userLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: '3a7ba4', password: 'auto_3a7ba4' })
    });
    console.log('登录状态:', userLogin.status);
    const userData = await userLogin.json();
    console.log('响应:', userData);
    
    // 3. 测试auto_3a7ba4登录
    console.log('\n3. 测试auto_3a7ba4登录:');
    const autoLogin = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'auto_3a7ba4', password: 'auto_3a7ba4' })
    });
    console.log('登录状态:', autoLogin.status);
    const autoData = await autoLogin.json();
    console.log('响应:', autoData);
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendLogin();
