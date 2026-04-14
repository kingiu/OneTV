// 测试后端用户列表
const fetch = require('node-fetch');

const testBackendUsers = async () => {
  console.log('=== 测试后端用户列表 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 使用admin登录
    console.log('1. 使用admin登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    console.log('登录状态:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.log('登录失败，退出');
      return;
    }
    
    const setCookie = loginResponse.headers.get('Set-Cookie');
    console.log('Set-Cookie:', setCookie);
    
    // 2. 获取用户列表
    console.log('\n2. 获取用户列表:');
    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: {
        'Cookie': setCookie
      }
    });
    
    console.log('用户列表状态:', usersResponse.status);
    const usersData = await usersResponse.json();
    console.log('用户列表:', JSON.stringify(usersData, null, 2));
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendUsers();
