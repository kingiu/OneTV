const http = require('http');
const fs = require('fs');

// 测试配置
const config = {
  hostname: '192.168.100.101',
  port: 3000,
  useHttps: false,
  username: 'admin',
  password: 'admin123',
  cookiesFile: '/root/OneTV/cookies.txt'
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
async function testApiSearch(query) {
  try {
    const cookies = readCookies();
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: `/api/search?q=${encodeURIComponent(query)}`,
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    console.log('测试API搜索:', query);
    console.log('请求路径:', options.path);
    
    const response = await sendRequest(options);
    console.log('搜索响应状态:', response.statusCode);
    
    try {
      const data = JSON.parse(response.data);
      console.log('搜索结果数量:', data?.results?.length || 0);
      
      if (data?.results) {
        console.log('所有结果详情:');
        data.results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title} (${result.year}) - ${result.source_name}`);
          console.log(`   来源: ${result.source}`);
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
  console.log('开始测试OneTV API搜索...');
  
  try {
    // 测试搜索危险关系
    console.log('\n=== 测试搜索: 危险关系 ===');
    await testApiSearch('危险关系');
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 执行测试
main();
