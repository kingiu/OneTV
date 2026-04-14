// 直接测试后端API
const fetch = require('node-fetch');

const testBackendDirect = async () => {
  console.log('=== 直接测试后端API ===');
  
  const baseUrl = 'https://onetv.aisxuexi.com';
  
  try {
    // 1. 直接访问搜索API，不使用认证
    console.log('\n1. 测试搜索API（无认证）:');
    const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%8D%B1%E9%99%A9%E5%85%B3%E7%B3%BB`);
    console.log('搜索状态:', searchResponse.status);
    console.log('搜索响应:', await searchResponse.json());
    
    // 2. 测试获取资源
    console.log('\n2. 测试获取资源（无认证）:');
    const resourcesResponse = await fetch(`${baseUrl}/api/search/resources`);
    console.log('资源状态:', resourcesResponse.status);
    console.log('资源响应:', await resourcesResponse.json());
    
    // 3. 测试登录
    console.log('\n3. 测试登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('登录状态:', loginResponse.status);
    console.log('登录响应:', await loginResponse.json());
    
    // 4. 获取cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('\n4. 登录Cookie:', cookies);
    
  } catch (error) {
    console.error('测试错误:', error);
  }
};

// 运行测试
testBackendDirect();
