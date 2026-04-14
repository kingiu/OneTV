// 测试本地后端视频源数据
const fetch = require('node-fetch');

const testBackendVideoSources = async () => {
  console.log('=== 测试本地后端视频源数据 ===');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 先登录获取认证
    console.log('\n1. 登录获取认证:');
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
    
    if (!loginData.ok) {
      console.log('登录失败，无法继续测试');
      return;
    }
    
    // 2. 获取cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('登录Cookie:', cookies);
    
    // 3. 测试搜索API
    console.log('\n2. 测试搜索API:');
    const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': cookies
      }
    });
    console.log('搜索状态:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
    console.log('搜索响应:', JSON.stringify(searchData, null, 2));
    
    // 4. 测试获取资源
    console.log('\n3. 测试获取资源:');
    const resourcesResponse = await fetch(`${baseUrl}/api/search/resources`, {
      headers: {
        'Cookie': cookies
      }
    });
    console.log('资源状态:', resourcesResponse.status);
    const resourcesData = await resourcesResponse.json();
    console.log('资源响应:', JSON.stringify(resourcesData, null, 2));
    
    // 5. 测试其他搜索关键词
    console.log('\n4. 测试其他搜索关键词:');
    const testKeywords = ['危险关系', '新闻', '电影'];
    for (const keyword of testKeywords) {
      const testResponse = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(keyword)}`, {
        headers: {
          'Cookie': cookies
        }
      });
      const testData = await testResponse.json();
      console.log(`"${keyword}" 搜索结果数量:`, testData.results ? testData.results.length : 0);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

// 运行测试
testBackendVideoSources();
