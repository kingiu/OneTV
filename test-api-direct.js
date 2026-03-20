const fetch = require('node-fetch');

// 直接测试API获取多线路信息
const API_BASE_URL = 'https://onetv.aisxuexi.com';
const testQuery = '复仇之渊';

async function testDirectAPI() {
  try {
    console.log('=== 直接测试API获取多线路信息 ===');
    console.log('测试查询:', testQuery);
    
    // 1. 尝试登录获取认证信息
    console.log('\n1. 尝试登录...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'Wanliu33..' })
    });
    
    if (!loginResponse.ok) {
      console.log('登录失败，使用默认认证信息');
    }
    
    // 获取认证cookie
    let authCookies = 'user=eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaXNTdW5kZW50IjpmYWxzZSwidG9rZW4iOiIifQ==; Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjAsInVzZXJuYW1lIjoiIiwiaWF0IjoxNzczNTc2MTQzLCJleHAiOjE3NzQxODE5NDN9.b8cE8GzT6oF3X9s8f6q6q6q6q6q6q6q6q6q6q6q6q6q6q6';
    
    const cookies = loginResponse.headers.get('Set-Cookie');
    if (cookies) {
      authCookies = cookies;
      console.log('登录成功，获取到新的认证信息');
    }
    
    // 2. 获取所有资源
    console.log('\n2. 获取所有资源...');
    const resourcesResponse = await fetch(`${API_BASE_URL}/api/search/resources`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies
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
    
    // 2. 测试搜索每个资源
    if (resources.length > 0) {
      console.log('\n2. 测试搜索每个资源...');
      
      for (const resource of resources) {
        console.log(`\n  搜索资源: ${resource.name} (${resource.key})`);
        
        try {
          const searchResponse = await fetch(`${API_BASE_URL}/api/search/one?q=${encodeURIComponent(testQuery)}&resourceId=${encodeURIComponent(resource.key)}`, {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': authCookies
            }
          });
          
          if (!searchResponse.ok) {
            console.log(`    搜索失败: ${searchResponse.status}`);
            continue;
          }
          
          const searchData = await searchResponse.json();
          console.log(`    搜索结果: ${searchData.results ? searchData.results.length : 0} 个`);
          
          if (searchData.results && searchData.results.length > 0) {
            searchData.results.forEach((result, index) => {
              console.log(`    结果 ${index + 1}:`);
              console.log(`      标题: ${result.title}`);
              console.log(`      来源: ${result.source_name} (${result.source})`);
              console.log(`      线路数量: ${result.episodes ? result.episodes.length : 0}`);
              if (result.episodes && result.episodes.length > 0) {
                console.log(`      前3条线路: ${result.episodes.slice(0, 3).join(', ')}...`);
              }
            });
          }
        } catch (error) {
          console.log(`    搜索出错: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testDirectAPI();