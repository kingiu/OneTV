// 测试后端API需要的cookie格式
const fetch = require('node-fetch');

const testCookieFormat = async () => {
  console.log('=== 测试后端API需要的cookie格式 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 登录获取cookie
    console.log('1. 登录获取cookie:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    console.log('登录状态:', loginResponse.status);
    
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
    
    console.log('\n2. 提取的user_auth值:');
    console.log(userAuthValue);
    
    // 3. 测试不同格式的cookie
    console.log('\n3. 测试不同格式的cookie:');
    
    // 3.1 直接使用原始JSON（不编码）
    console.log('\n3.1 直接使用原始JSON（不编码）:');
    const jsonCookie = `user_auth=${userAuthValue}`;
    console.log('Cookie字符串:', jsonCookie);
    const search1 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': jsonCookie
      }
    });
    console.log('搜索状态:', search1.status);
    const data1 = await search1.json();
    console.log('搜索结果:', data1.results ? data1.results.length : 0);
    
    // 3.2 使用decodeURIComponent解码后发送
    console.log('\n3.2 使用decodeURIComponent解码后发送:');
    let decodedCookie = userAuthValue;
    try {
      decodedCookie = decodeURIComponent(userAuthValue);
      console.log('解码后的值:', decodedCookie);
    } catch (e) {
      console.log('解码失败:', e.message);
    }
    const search2 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${decodedCookie}`
      }
    });
    console.log('搜索状态:', search2.status);
    const data2 = await search2.json();
    console.log('搜索结果:', data2.results ? data2.results.length : 0);
    
    // 3.3 使用双重解码后发送
    console.log('\n3.3 使用双重解码后发送:');
    let doubleDecodedCookie = userAuthValue;
    try {
      doubleDecodedCookie = decodeURIComponent(userAuthValue);
      if (doubleDecodedCookie.startsWith('%')) {
        doubleDecodedCookie = decodeURIComponent(doubleDecodedCookie);
      }
      console.log('双重解码后的值:', doubleDecodedCookie);
    } catch (e) {
      console.log('解码失败:', e.message);
    }
    const search3 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${doubleDecodedCookie}`
      }
    });
    console.log('搜索状态:', search3.status);
    const data3 = await search3.json();
    console.log('搜索结果:', data3.results ? data3.results.length : 0);
    
    // 3.4 使用原始userAuthValue（双重编码）
    console.log('\n3.4 使用原始userAuthValue（双重编码）:');
    const search4 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${userAuthValue}`
      }
    });
    console.log('搜索状态:', search4.status);
    const data4 = await search4.json();
    console.log('搜索结果:', data4.results ? data4.results.length : 0);
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testCookieFormat();
