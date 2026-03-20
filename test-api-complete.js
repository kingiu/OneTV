const fetch = require('node-fetch');

// 模拟项目中的API调用方式
const API_BASE_URL = 'https://onetv.aisxuexi.com';
const testQuery = '复仇之渊';

// 测试直接搜索
async function testDirectSearch() {
  try {
    console.log('=== 测试直接搜索 API ===');
    console.log('测试查询:', testQuery);
    
    // 直接搜索
    const searchUrl = `${API_BASE_URL}/api/search?q=${encodeURIComponent(testQuery)}`;
    console.log('搜索URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'Content-Type': 'application/json',
        // 添加一些常见的浏览器头
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('响应状态:', response.status);
    
    // 尝试读取响应
    const text = await response.text();
    console.log('响应内容:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    
    // 尝试解析JSON
    try {
      const data = JSON.parse(text);
      console.log('解析成功:', data);
    } catch (e) {
      console.log('解析JSON失败:', e.message);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 测试资源列表
async function testResources() {
  try {
    console.log('\n=== 测试资源列表 API ===');
    
    const resourcesUrl = `${API_BASE_URL}/api/search/resources`;
    console.log('资源URL:', resourcesUrl);
    
    const response = await fetch(resourcesUrl, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('响应状态:', response.status);
    
    const text = await response.text();
    console.log('响应内容:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testDirectSearch();
testResources();