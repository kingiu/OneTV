const http = require('http');

const API_URL = 'http://192.168.100.101:3000';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, API_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const cookies = res.headers['set-cookie'] || [];
          resolve({ data: JSON.parse(data), cookies: Array.isArray(cookies) ? cookies : [cookies] });
        } catch (e) {
          resolve({ data, cookies: [] });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testPlaySources() {
  try {
    console.log('=== 测试危险关系播放源 ===\n');
    
    // 登录
    console.log('1. 登录...');
    const loginResponse = await makeRequest({
      method: 'POST',
      path: '/api/login',
      headers: { 'Cookie': '' }
    }, {
      username: 'admin',
      password: 'admin123'
    });
    
    const cookies = loginResponse.cookies;
    console.log('登录成功\n');
    
    // 模拟 detailStore 的 init 流程
    console.log('2. 获取所有资源...');
    const resourcesResponse = await makeRequest({
      method: 'GET',
      path: '/api/resources',
      headers: { 'Cookie': cookies.join(';') }
    });
    
    console.log('资源响应:', JSON.stringify(resourcesResponse.data).substring(0, 200));
    const enabledResources = Array.isArray(resourcesResponse.data) ? resourcesResponse.data.filter(r => r.key === 'jsm3u8' || r.key === 'jszyapi.com') : [];
    console.log(`启用的资源: ${enabledResources.length} 个`);
    enabledResources.forEach(r => console.log(`  - ${r.key}: ${r.name}`));
    
    // 搜索
    console.log('\n3. 搜索"危险关系 2026"...');
    const searchResponse = await makeRequest({
      method: 'GET',
      path: '/api/search?q=危险关系%202026',
      headers: { 'Cookie': cookies.join(';') }
    });
    
    const searchResults = searchResponse.data.results;
    console.log(`搜索结果: ${searchResults.length} 个`);
    
    // 模拟 searchVideos 的搜索变体
    const variants = ['危险关系 2026', '危险关系 2025', '危险关系 2024', '危险关系', '危险关系2026'];
    
    console.log('\n4. 模拟 searchVideos (多个变体)...');
    const allResults = [];
    const seenIds = new Set();
    
    for (const variant of variants) {
      const variantResponse = await makeRequest({
        method: 'GET',
        path: `/api/search?q=${encodeURIComponent(variant)}`,
        headers: { 'Cookie': cookies.join(';') }
      });
      
      const variantResults = variantResponse.data.results || [];
      console.log(`  变体 "${variant}": ${variantResults.length} 个结果`);
      
      variantResults.forEach(result => {
        const uniqueKey = `${result.source}_${result.id}_${result.title}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          allResults.push(result);
        }
      });
    }
    
    console.log(`\n去重后总数: ${allResults.length}`);
    
    // 按来源分组
    const sourceMap = {};
    allResults.forEach(r => {
      if (!sourceMap[r.source]) {
        sourceMap[r.source] = [];
      }
      sourceMap[r.source].push({
        id: r.id,
        title: r.title,
        year: r.year,
        source_name: r.source_name || r.source
      });
    });
    
    console.log('\n=== 按来源分组 ===\n');
    Object.entries(sourceMap).forEach(([source, items]) => {
      console.log(`${source} (${items.length} 个):`);
      items.forEach(item => {
        console.log(`  - [${item.year}] ${item.title} (ID: ${item.id})`);
      });
    });
    
    // 检查源名称
    console.log('\n=== 源名称分析 ===\n');
    const sourceNameMap = {};
    allResults.forEach(r => {
      const sourceName = r.source_name || r.source;
      if (!sourceNameMap[sourceName]) {
        sourceNameMap[sourceName] = [];
      }
      sourceNameMap[sourceName].push({
        source: r.source,
        id: r.id,
        title: r.title,
        year: r.year
      });
    });
    
    Object.entries(sourceNameMap).forEach(([sourceName, items]) => {
      console.log(`${sourceName} (${items.length} 个):`);
      items.forEach(item => {
        console.log(`  - 来源: ${item.source}, ID: ${item.id}, 标题: ${item.title} (${item.year})`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

testPlaySources();
