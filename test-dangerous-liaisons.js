const http = require('http');
const querystring = require('querystring');

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
          const cookies = res.headers['set-cookie'];
          resolve({ data: JSON.parse(data), cookies });
        } catch (e) {
          resolve({ data, cookies });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testDangerousLiaisons() {
  try {
    console.log('=== 测试危险关系搜索结果 ===\n');
    
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
    console.log('登录成功，获取到 Cookie:', cookies ? '是' : '否');
    
    // 搜索危险关系
    console.log('\n2. 搜索"危险关系"...');
    const searchResponse = await makeRequest({
      method: 'GET',
      path: '/api/search?q=危险关系',
      headers: { 'Cookie': cookies.join(';') }
    });
    
    const data = searchResponse.data;
    console.log(`\n搜索结果总数: ${data.results.length}`);
    
    // 分析结果
    console.log('\n=== 详细结果分析 ===\n');
    
    const sourceMap = {};
    
    data.results.forEach((result, index) => {
      const key = `${result.source}_${result.id}_${result.title}`;
      
      if (!sourceMap[result.source]) {
        sourceMap[result.source] = [];
      }
      sourceMap[result.source].push({
        index,
        id: result.id,
        title: result.title,
        year: result.year,
        key
      });
      
      console.log(`[${index}] 来源: ${result.source_name || result.source}`);
      console.log(`    ID: ${result.id}`);
      console.log(`    标题: ${result.title}`);
      console.log(`    年份: ${result.year}`);
      console.log(`    唯一键: ${key}`);
      console.log(`    剧集数: ${result.episodes?.length || 0}`);
      console.log('');
    });
    
    // 检查重复
    console.log('\n=== 重复分析 ===\n');
    
    const allKeys = [];
    data.results.forEach((result) => {
      allKeys.push(`${result.source}_${result.id}_${result.title}`);
    });
    
    const keyCount = {};
    allKeys.forEach(key => {
      keyCount[key] = (keyCount[key] || 0) + 1;
    });
    
    const duplicates = Object.entries(keyCount).filter(([key, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log(`发现 ${duplicates.length} 个重复项:\n`);
      duplicates.forEach(([key, count]) => {
        console.log(`重复 ${count} 次: ${key}`);
      });
    } else {
      console.log('未发现重复项');
    }
    
    // 按来源统计
    console.log('\n=== 按来源统计 ===\n');
    Object.entries(sourceMap).forEach(([source, items]) => {
      console.log(`${source} (${items.length} 个):`);
      items.forEach(item => {
        console.log(`  - ${item.title} (ID: ${item.id}, Year: ${item.year})`);
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

testDangerousLiaisons();
