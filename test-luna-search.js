const fetch = require('node-fetch');

async function testLunaSearch() {
  try {
    // 首先登录获取cookie
    console.log('开始登录LunaTV...');
    const loginResponse = await fetch('http://192.168.100.101:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      console.error('登录失败:', loginResponse.status);
      return;
    }
    
    const loginCookies = loginResponse.headers.get('set-cookie');
    console.log('登录成功，获取到cookie:', loginCookies);
    
    // 测试搜索API
    console.log('\n测试搜索API...');
    const searchResponse = await fetch('http://192.168.100.101:3000/api/search?q=危险关系', {
      headers: {
        'Cookie': loginCookies
      }
    });
    
    if (!searchResponse.ok) {
      console.error('搜索失败:', searchResponse.status);
      return;
    }
    
    const searchData = await searchResponse.json();
    console.log('搜索结果:', JSON.stringify(searchData, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testLunaSearch();
