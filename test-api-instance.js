// 由于API使用TypeScript编写，我们需要使用不同的方法来测试
const fetch = require('node-fetch');

// 测试API响应
async function testApi() {
  try {
    // 登录
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'test', password: 'test' })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login Response:', loginData);
    
    // 获取cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);
    
    // 搜索视频
    const searchResponse = await fetch('http://localhost:3000/api/search?q=逐玉', {
      headers: {
        'Cookie': cookies
      }
    });
    
    const searchData = await searchResponse.json();
    console.log('Search Response:', JSON.stringify(searchData, null, 2));
    
    // 检查第一个结果是否包含vod_play_from和vod_play_url字段
    if (searchData.results && searchData.results.length > 0) {
      const firstResult = searchData.results[0];
      console.log('First result vod_play_from:', firstResult.vod_play_from);
      console.log('First result vod_play_url:', firstResult.vod_play_url);
      console.log('First result play_sources:', firstResult.play_sources);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi();