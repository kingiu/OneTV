// 测试后端注册逻辑
const fetch = require('node-fetch');

const testBackendRegister = async () => {
  console.log('=== 测试后端注册逻辑 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 尝试注册3a7ba4账号
    console.log('1. 尝试注册3a7ba4账号:');
    const registerResponse = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: '3a7ba4', password: 'auto_3a7ba4' })
    });
    
    console.log('注册状态:', registerResponse.status);
    const registerData = await registerResponse.json();
    console.log('注册响应:', registerData);
    
    // 2. 尝试登录3a7ba4账号
    console.log('\n2. 尝试登录3a7ba4账号:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: '3a7ba4', password: 'auto_3a7ba4' })
    });
    
    console.log('登录状态:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应:', loginData);
    
    if (loginResponse.ok) {
      const setCookie = loginResponse.headers.get('Set-Cookie');
      console.log('Set-Cookie:', setCookie);
      
      // 3. 使用3a7ba4搜索
      console.log('\n3. 使用3a7ba4搜索"太平年":');
      const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
        headers: {
          'Cookie': setCookie
        }
      });
      
      console.log('搜索状态:', searchResponse.status);
      const searchData = await searchResponse.json();
      console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendRegister();
