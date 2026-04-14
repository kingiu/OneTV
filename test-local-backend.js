// 测试本地后端API
const fetch = require('node-fetch');

const testLocalBackend = async () => {
  console.log('=== 测试本地后端API ===');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 测试健康检查
    console.log('\n1. 测试健康检查:');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    console.log('健康检查状态:', healthResponse.status);
    if (healthResponse.ok) {
      console.log('健康检查响应:', await healthResponse.json());
    } else {
      console.log('健康检查失败:', await healthResponse.text());
    }
    
    // 2. 测试搜索API
    console.log('\n2. 测试搜索API:');
    const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`);
    console.log('搜索状态:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('搜索响应:', JSON.stringify(searchData, null, 2));
    
    // 3. 测试获取资源
    console.log('\n3. 测试获取资源:');
    const resourcesResponse = await fetch(`${baseUrl}/api/search/resources`);
    console.log('资源状态:', resourcesResponse.status);
    const resourcesData = await resourcesResponse.json();
    console.log('资源响应:', JSON.stringify(resourcesData, null, 2));
    
    // 4. 测试登录
    console.log('\n4. 测试登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('登录状态:', loginResponse.status);
    console.log('登录响应:', await loginResponse.json());
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

// 运行测试
testLocalBackend();
