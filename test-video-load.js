const fetch = require('node-fetch');

const API_BASE_URL = 'https://onetv.aisxuexi.com';
const testQuery = '鸭乃桥论的禁忌推理 第二季';
const username = 'admin';
const password = 'Wanliu33..';

async function login() {
  try {
    console.log('=== 登录获取认证令牌 ===');
    const loginResponse = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }
    
    // 从响应头获取cookie
    const cookies = loginResponse.headers.get('Set-Cookie');
    console.log('登录成功!');
    return {
      cookies: cookies || '',
    };
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

async function testVideoLoad() {
  try {
    const auth = await login();
    
    console.log('\n=== 测试视频加载 ===');
    console.log('测试查询:', testQuery);
    
    // 1. 获取所有资源
    console.log('\n1. 获取所有资源...');
    const resourcesResponse = await fetch(`${API_BASE_URL}/api/search/resources`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': auth.cookies
      }
    });
    
    if (!resourcesResponse.ok) {
      throw new Error(`获取资源失败: ${resourcesResponse.status}`);
    }
    
    const resources = await resourcesResponse.json();
    console.log(`获取到 ${resources.length} 个资源:`);
    resources.forEach((resource, index) => {
      console.log(`  ${index + 1}. ${resource.name} (${resource.key})`);
    });
    
    // 2. 测试搜索第一个资源
    if (resources.length > 0) {
      const firstResource = resources[0];
      console.log(`\n2. 测试搜索资源: ${firstResource.name} (${firstResource.key})`);
      
      const searchResponse = await fetch(`${API_BASE_URL}/api/search/one?q=${encodeURIComponent(testQuery)}&resourceId=${encodeURIComponent(firstResource.key)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': auth.cookies
        }
      });
      
      if (!searchResponse.ok) {
        throw new Error(`搜索失败: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      console.log(`搜索结果: ${searchData.results ? searchData.results.length : 0} 个`);
      
      if (searchData.results && searchData.results.length > 0) {
        console.log('\n3. 检查视频URL...');
        searchData.results.forEach((result, index) => {
          console.log(`\n  结果 ${index + 1}:`);
          console.log(`    标题: ${result.title}`);
          console.log(`    来源: ${result.source_name} (${result.source})`);
          console.log(`    年份: ${result.year}`);
          console.log(`    线路数量: ${result.episodes ? result.episodes.length : 0}`);
          if (result.episodes && result.episodes.length > 0) {
            console.log(`    第一条线路URL: ${result.episodes[0]}`);
            console.log(`    第二条线路URL: ${result.episodes[1] || '无'}`);
            
            // 测试视频URL是否可访问
            testVideoUrl(result.episodes[0]);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

async function testVideoUrl(url) {
  try {
    console.log(`\n  测试视频URL: ${url.substring(0, 100)}...`);
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 10000
    });
    console.log(`  URL状态: ${response.status} ${response.statusText}`);
    console.log(`  内容类型: ${response.headers.get('content-type')}`);
  } catch (error) {
    console.error(`  URL测试失败: ${error.message}`);
  }
}

testVideoLoad();
