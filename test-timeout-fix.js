// 测试API超时处理
const fetch = require('node-fetch');

// 模拟API请求超时
async function testApiTimeout() {
  console.log('测试API请求超时处理...');
  
  try {
    // 使用一个不存在的API地址来模拟超时
    const url = 'https://nonexistent-api-server-12345.com/api/search?q=test';
    console.log('请求URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(url, {
      signal: controller.signal,
      timeout: 5000 // 5秒超时
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    console.log('API响应:', data);
  } catch (error) {
    console.log('捕获到错误:', error.message);
    if (error.name === 'AbortError') {
      console.log('✅ 超时处理成功：请求被正确中止');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('✅ 连接被拒绝：API服务器不可用');
    } else if (error.type === 'request-timeout') {
      console.log('✅ 请求超时：API响应超时');
    } else {
      console.log('❌ 其他错误:', error);
    }
  }
}

// 测试视频加载超时
function testVideoLoadTimeout() {
  console.log('\n测试视频加载超时处理...');
  
  // 模拟视频加载超时
  const timeoutId = setTimeout(() => {
    console.log('✅ 视频加载超时处理成功：5秒后触发超时');
  }, 5000);
  
  // 模拟视频加载成功
  setTimeout(() => {
    clearTimeout(timeoutId);
    console.log('✅ 视频加载成功：清除超时计时器');
  }, 3000);
}

testApiTimeout();
testVideoLoadTimeout();
