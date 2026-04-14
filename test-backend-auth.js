// 测试后端API是否需要认证
const fetch = require('node-fetch');

const testBackendAuth = async () => {
  console.log('=== 测试后端API认证需求 ===');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 不使用认证直接搜索
    console.log('\n1. 不使用认证直接搜索:');
    const searchResponse1 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`);
    console.log('搜索状态:', searchResponse1.status);
    const searchData1 = await searchResponse1.json();
    console.log('搜索结果数量:', searchData1.results ? searchData1.results.length : 0);
    console.log('响应内容:', JSON.stringify(searchData1, null, 2).substring(0, 500));
    
    // 2. 使用admin登录后搜索
    console.log('\n2. 使用admin登录后搜索:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    console.log('登录状态:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应:', loginData);
    
    if (loginData.ok) {
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('登录Cookie:', cookies);
      
      const searchResponse2 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
        headers: {
          'Cookie': cookies
        }
      });
      console.log('认证后搜索状态:', searchResponse2.status);
      const searchData2 = await searchResponse2.json();
      console.log('认证后搜索结果数量:', searchData2.results ? searchData2.results.length : 0);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendAuth();
