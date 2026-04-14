// 测试使用正确凭证后能否搜索到内容
const fetch = require('node-fetch');

const testSearchWithCorrectCredentials = async () => {
  console.log('=== 测试使用正确凭证后能否搜索到内容 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 使用admin登录
    console.log('1. 使用admin登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    console.log('登录状态:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.log('登录失败，退出');
      return;
    }
    
    const setCookie = loginResponse.headers.get('Set-Cookie');
    console.log('Set-Cookie:', setCookie);
    
    // 2. 提取user_auth值
    const cookieParts = setCookie.split(';');
    let userAuthValue = '';
    for (const part of cookieParts) {
      if (part.trim().startsWith('user_auth=')) {
        userAuthValue = part.trim().substring('user_auth='.length);
        break;
      }
    }
    
    // 3. 双重解码
    let decodedCookie = userAuthValue;
    try {
      decodedCookie = decodeURIComponent(userAuthValue);
      if (decodedCookie.startsWith('%')) {
        decodedCookie = decodeURIComponent(decodedCookie);
      }
    } catch (e) {
      console.log('解码失败:', e.message);
    }
    
    console.log('\n2. 解码后的cookie:');
    console.log(decodedCookie);
    
    // 4. 使用解码后的cookie搜索
    console.log('\n3. 使用解码后的cookie搜索"太平年":');
    const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${decodedCookie}`
      }
    });
    
    console.log('搜索状态:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
    console.log('搜索结果:', JSON.stringify(searchData.results, null, 2));
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testSearchWithCorrectCredentials();
