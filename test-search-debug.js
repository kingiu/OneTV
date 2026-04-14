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
        console.log('所有结果详情:');
        data.results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title} (${result.year}) - ${result.source_name}`);
          console.log(`   剧集数: ${result.episodes?.length || 0}`);
          console.log(`   播放源: ${result.play_sources?.map(ps => ps.name).join(', ') || '无'}`);
          console.log(`   来源: ${result.source}`);
          console.log(`   年份: ${result.year}`);
          console.log(`   类型: ${result.type_name}`);
          
          // 显示播放源详情
          if (result.play_sources && result.play_sources.length > 0) {
            console.log(`   播放源详情:`);
            result.play_sources.forEach((ps, psIndex) => {
              console.log(`     ${psIndex + 1}. ${ps.name} - 剧集数: ${ps.episodes?.length || 0}`);
            });
          }
          
          // 只显示前5个结果的原始数据，避免输出过多
          if (index < 5) {
            console.log(`   原始数据: ${JSON.stringify(result, null, 2)}`);
          }
        });
        
        // 检查是否有来自极速资源的结果
        const jszyResults = data.results.filter(result => result.source === 'jszyapi.com');
        if (jszyResults.length > 0) {
          console.log('\n✅ 找到极速资源结果:');
          jszyResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.title} (${result.year}) - ${result.source_name}`);
            console.log(`   播放源: ${result.play_sources?.map(ps => ps.name).join(', ') || '无'}`);
          });
        } else {
          console.log('\n❌ 没有找到极速资源结果');
        }
        
        // 检查是否有重复的播放源
        console.log('\n=== 检查重复播放源 ===');
        const sourceCounts = {};
        data.results.forEach(result => {
          if (result.source) {
            sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
          }
        });
        
        console.log('各来源的结果数量:');
        Object.entries(sourceCounts).forEach(([source, count]) => {
          console.log(`- ${source}: ${count}个结果`);
        });
        
        // 检查同一来源下的重复标题
        const sourceTitleIds = {};
        data.results.forEach(result => {
          if (result.source && result.title && result.id) {
            if (!sourceTitleIds[result.source]) {
              sourceTitleIds[result.source] = {};
            }
            if (!sourceTitleIds[result.source][result.title]) {
              sourceTitleIds[result.source][result.title] = [];
            }
            sourceTitleIds[result.source][result.title].push(result.id);
          }
        });
        
        console.log('\n各来源下的标题重复情况:');
        Object.entries(sourceTitleIds).forEach(([source, titles]) => {
          const duplicateTitles = Object.entries(titles).filter(([title, ids]) => ids.length > 1);
          if (duplicateTitles.length > 0) {
            console.log(`- ${source}:`);
            duplicateTitles.forEach(([title, ids]) => {
              console.log(`  * ${title}: ${ids.length}次 (IDs: ${ids.join(', ')})`);
            });
          } else {
            console.log(`- ${source}: 无重复标题`);
          }
        });
        
        // 模拟去重逻辑
        console.log('\n=== 模拟去重后结果 ===');
        const seenSourceTitle = new Set();
        const deduplicatedResults = data.results.filter(result => {
          const sourceTitleKey = `${result.source}_${result.title}`;
          if (seenSourceTitle.has(sourceTitleKey)) {
            return false;
          }
          seenSourceTitle.add(sourceTitleKey);
          return true;
        });
        
        console.log(`去重后结果数量: ${deduplicatedResults.length}`);
        deduplicatedResults.forEach((result, index) => {
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
  console.log('开始测试OneTV搜索调试...');
  
  try {
    // 登录
    await login();
    
    // 测试搜索危险关系 2026
    console.log('\n=== 测试搜索: 危险关系 2026 ===');
    await testSearch('危险关系 2026');
    
    // 测试搜索危险关系（2026）
    console.log('\n=== 测试搜索: 危险关系（2026）===');
    await testSearch('危险关系（2026）');
    
    // 测试搜索危险关系
    console.log('\n=== 测试搜索: 危险关系 ===');
    await testSearch('危险关系');
    
    // 测试搜索家事法庭
    console.log('\n=== 测试搜索: 家事法庭 ===');
    await testSearch('家事法庭');
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 执行测试
main();
