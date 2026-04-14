// 测试React Native fetch的cookie编码行为
const testFetchCookieEncoding = async () => {
  console.log('=== 测试React Native fetch的cookie编码行为 ===\n');
  
  const fetch = require('node-fetch');
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
    
    // 3. 测试双重解码后的值（应用保存的值）
    console.log('\n3. 测试双重解码后的值（应用保存的值）:');
    let doubleDecodedCookie = userAuthValue;
    doubleDecodedCookie = decodeURIComponent(userAuthValue);
    if (doubleDecodedCookie.startsWith('%')) {
      doubleDecodedCookie = decodeURIComponent(doubleDecodedCookie);
    }
    console.log('双重解码后的值:', doubleDecodedCookie);
    
    // 4. 发送请求，不使用Cookie头，只发送user_auth值
    console.log('\n4. 发送请求，不使用Cookie头，只发送user_auth值:');
    const search1 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': doubleDecodedCookie
      }
    });
    console.log('搜索状态:', search1.status);
    const data1 = await search1.json();
    console.log('搜索结果:', data1.results ? data1.results.length : 0);
    
    // 5. 发送请求，使用user_auth=前缀
    console.log('\n5. 发送请求，使用user_auth=前缀:');
    const search2 = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${doubleDecodedCookie}`
      }
    });
    console.log('搜索状态:', search2.status);
    const data2 = await search2.json();
    console.log('搜索结果:', data2.results ? data2.results.length : 0);
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testFetchCookieEncoding();
