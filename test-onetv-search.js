const http = require('http');
const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
  hostname: '192.168.100.101',
  port: 3000,
  useHttps: false,
  username: 'admin',
  password: 'admin123',
  cookiesFile: path.join(__dirname, 'cookies.txt')
};

// 发送 HTTP 请求
function sendRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const httpModule = config.useHttps ? require('https') : http;
    
    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 登录并获取cookie
async function login() {
  try {
    const postData = JSON.stringify({
      username: config.username,
      password: config.password
    });
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await sendRequest(options, postData);
    console.log('登录响应状态:', response.statusCode);
    console.log('登录响应数据:', response.data);
    console.log('Cookie:', response.headers['set-cookie']);
    
    // 保存cookie到文件
    if (response.headers['set-cookie']) {
      fs.writeFileSync(config.cookiesFile, response.headers['set-cookie'].join('\n'));
      console.log('Cookie已保存到:', config.cookiesFile);
    }
    
    return JSON.parse(response.data);
  } catch (error) {
    console.error('登录失败:', error.message);
    throw error;
  }
}

// 读取cookie
function readCookies() {
  try {
    return fs.readFileSync(config.cookiesFile, 'utf8').split('\n').filter(Boolean);
  } catch (error) {
    console.error('读取cookie失败:', error.message);
    return [];
  }
}

// 测试搜索API
async function testSearch(query, doubanId = null) {
  try {
    const cookies = readCookies();
    
    let path = `/api/search?q=${encodeURIComponent(query)}`;
    if (doubanId) {
      path += `&doubanId=${encodeURIComponent(doubanId)}`;
    }
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    console.log('测试搜索:', query);
    console.log('请求路径:', path);
    
    const response = await sendRequest(options);
    console.log('搜索响应状态:', response.statusCode);
    
    try {
      const data = JSON.parse(response.data);
      console.log('搜索结果数量:', data?.results?.length || 0);
      if (data?.results) {
        console.log('前5个结果:');
        data.results.slice(0, 5).forEach((result, index) => {
          console.log(`${index + 1}. ${result.title} (${result.year}) - ${result.source_name}`);
          console.log(`   剧集数: ${result.episodes?.length || 0}`);
          console.log(`   播放源: ${result.play_sources?.map(ps => ps.name).join(', ') || '无'}`);
        });
      }
      return data;
    } catch (e) {
      console.error('解析搜索结果失败:', e.message);
      console.error('原始响应:', response.data);
      return null;
    }
  } catch (error) {
    console.error('搜索失败:', error.message);
    throw error;
  }
}

// 主测试函数
async function main() {
  console.log('开始测试OneTV搜索功能...');
  
  try {
    // 登录
    await login();
    
    // 测试搜索危险关系
    console.log('\n=== 测试搜索: 危险关系 ===');
    await testSearch('危险关系');
    
    // 测试搜索危险关系 2026
    console.log('\n=== 测试搜索: 危险关系 2026 ===');
    await testSearch('危险关系 2026');
    
    // 测试搜索危险关系 2024
    console.log('\n=== 测试搜索: 危险关系 2024 ===');
    await testSearch('危险关系 2024');
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 执行测试
main();
