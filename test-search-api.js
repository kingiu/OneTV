const axios = require('axios');

async function testSearch() {
  try {
    // 1. 登录获取认证信息
    console.log('=== 登录测试 ===');
    const loginResponse = await axios.post('http://192.168.100.101:3000/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('登录响应:', loginResponse.data);
    
    // 2. 提取 cookie
    const cookie = loginResponse.headers['set-cookie']?.[0];
    if (!cookie) {
      console.error('未获取到认证 cookie');
      return;
    }
    console.log('获取到 cookie:', cookie);
    
    // 3. 测试搜索 API
    console.log('\n=== 搜索测试 ===');
    const searchResponse = await axios.get('http://192.168.100.101:3000/api/search?q=危险关系', {
      headers: {
        'Cookie': cookie
      }
    });
    
    console.log('搜索响应:', searchResponse.data);
    console.log('搜索结果数量:', searchResponse.data.results?.length || 0);
    
    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      console.log('\n前5个搜索结果:');
      searchResponse.data.results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} - ${result.source_name} (${result.year || '未知年份'})`);
      });
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testSearch();
