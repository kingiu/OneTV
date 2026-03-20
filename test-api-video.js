const https = require('https');

// 测试API登录和获取视频信息
const apiUrl = 'https://onetv.aisxuexi.com';
const username = 'admin';
const password = 'Wanliu33..';
const testVideo = '复仇之渊';

console.log('Testing API login and video retrieval...');

// 登录函数
async function login() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      path: '/api/login',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        resolve(cookies);
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(JSON.stringify({ username, password }));
    req.end();
  });
}

// 获取资源函数
async function getResources(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      path: '/api/search/resources',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// 搜索视频函数
async function searchVideo(cookies, query, resourceId) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      path: `/api/search/one?q=${encodeURIComponent(query)}&resourceId=${encodeURIComponent(resourceId)}`,
      headers: {
        'Cookie': cookies.join('; ')
      }
    };

    const req = https.request(apiUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

// 测试视频URL函数
async function testVideoUrl(url) {
  return new Promise((resolve) => {
    const options = {
      method: 'HEAD',
      timeout: 5000
    };

    const req = https.request(url, options, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message });
    });

    req.on('timeout', () => {
      resolve({ status: 0, error: 'Timeout' });
    });

    req.end();
  });
}

// 主测试函数
async function main() {
  try {
    // 登录
    console.log('1. Logging in...');
    const cookies = await login();
    console.log('   Login successful, cookies obtained');

    // 获取资源
    console.log('2. Getting resources...');
    const resources = await getResources(cookies);
    console.log(`   Found ${resources.length} resources`);

    // 搜索视频
    console.log(`3. Searching for video: ${testVideo}`);
    for (const resource of resources) {
      console.log(`   Testing resource: ${resource.name} (${resource.key})`);
      const searchResult = await searchVideo(cookies, testVideo, resource.key);
      
      if (searchResult.results && searchResult.results.length > 0) {
        console.log(`   Found ${searchResult.results.length} results`);
        
        // 测试每个结果的视频URL
        for (const result of searchResult.results) {
          console.log(`   Testing result: ${result.title} (${result.source_name})`);
          console.log(`   Episodes: ${result.episodes.length} lines`);
          
          // 测试前2个线路
          for (let i = 0; i < Math.min(2, result.episodes.length); i++) {
            const videoUrl = result.episodes[i];
            console.log(`   Testing line ${i + 1}: ${videoUrl}`);
            
            const testResult = await testVideoUrl(videoUrl);
            console.log(`   Line ${i + 1} status: ${testResult.status}${testResult.error ? ` (${testResult.error})` : ''}`);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
