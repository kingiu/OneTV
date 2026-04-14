// 测试后端认证逻辑
const fetch = require('node-fetch');

const testBackendAuth = async () => {
  console.log('=== 测试后端认证逻辑 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 使用3a7ba4登录
    console.log('1. 使用3a7ba4登录:');
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
      
      // 2. 使用3a7ba4搜索
      console.log('\n2. 使用3a7ba4搜索"太平年":');
      const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
        headers: {
          'Cookie': setCookie
        }
      });
      
      console.log('搜索状态:', searchResponse.status);
      const searchData = await searchResponse.json();
      console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
    } else {
      // 3. 尝试使用3a7ba4直接访问需要认证的API
      console.log('\n3. 尝试使用3a7ba4直接访问需要认证的API:');
      const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`);
      
      console.log('搜索状态:', searchResponse.status);
      const searchData = await searchResponse.json();
      console.log('搜索响应:', searchData);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendAuth();
