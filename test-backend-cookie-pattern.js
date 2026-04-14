// 测试后端cookie编码模式
const testBackendCookiePattern = async () => {
  console.log('=== 测试后端cookie编码模式 ===');
  
  const fetch = require('node-fetch');
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 登录获取cookie
    console.log('\n1. 登录获取cookie:');
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
    
    // 3. 检查是否是双重编码
    console.log('\n3. 检查编码模式:');
    const firstDecode = decodeURIComponent(userAuthValue);
    const secondDecode = decodeURIComponent(firstDecode);
    
    console.log('第一次解码:', firstDecode);
    console.log('第二次解码:', secondDecode);
    
    // 4. 判断编码模式
    console.log('\n4. 编码模式判断:');
    if (userAuthValue === firstDecode) {
      console.log('未编码');
    } else if (firstDecode === secondDecode) {
      console.log('单次编码');
    } else {
      console.log('双重编码');
    }
    
    // 5. 测试使用解码后的cookie
    console.log('\n5. 测试使用解码后的cookie:');
    const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
      headers: {
        'Cookie': `user_auth=${secondDecode}`
      }
    });
    
    console.log('搜索状态:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendCookiePattern();
