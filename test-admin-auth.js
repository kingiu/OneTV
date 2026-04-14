const http = require('http');
const fs = require('fs');
const path = require('path');

// 测试配置
const config = {
  hostname: '192.168.100.101',
  port: 3000,
  // hostname: 'onetv.aisxuexi.com',
  // port: 443,
  // useHttps: true,
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

// 获取用户信息
async function getUserInfo() {
  try {
    const cookies = readCookies();
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/user',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    const response = await sendRequest(options);
    console.log('获取用户信息响应状态:', response.statusCode);
    console.log('用户信息:', response.data);
    return JSON.parse(response.data);
  } catch (error) {
    console.error('获取用户信息失败:', error.message);
    throw error;
  }
}

// 测试搜索API
async function testSearch() {
  try {
    const cookies = readCookies();
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/search?q=危险关系',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    const response = await sendRequest(options);
    console.log('搜索响应状态:', response.statusCode);
    console.log('搜索结果:', response.data);
    
    try {
      const data = JSON.parse(response.data);
      console.log('搜索结果数量:', data?.results?.length || 0);
    } catch (e) {
      console.error('解析搜索结果失败:', e.message);
    }
    
    return response.data;
  } catch (error) {
    console.error('搜索失败:', error.message);
    throw error;
  }
}

// 测试获取配置
async function testGetConfig() {
  try {
    const cookies = readCookies();
    
    const options = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/config',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    const response = await sendRequest(options);
    console.log('配置响应状态:', response.statusCode);
    console.log('配置数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取配置失败:', error.message);
    throw error;
  }
}

// 主测试函数
async function main() {
  console.log('开始测试管理员认证...');
  
  try {
    // 登录
    await login();
    
    // 获取用户信息
    await getUserInfo();
    
    // 测试搜索
    await testSearch();
    
    // 获取配置
    await testGetConfig();
    
    console.log('测试完成!');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 执行测试
main();
