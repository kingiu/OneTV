// 使用3a7ba4在ADB上测试登录
const fetch = require('node-fetch');

const testLoginWith3a7ba4 = async () => {
  console.log('=== 使用3a7ba4在ADB上测试登录 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 使用3a7ba4登录
    console.log('1. 使用3a7ba4登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: '3a7ba4', password: 'auto_3a7ba4' })
    });
    
    console.log('登录状态:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应:', loginData);
    
    if (loginResponse.ok) {
      const setCookie = loginResponse.headers.get('Set-Cookie');
      console.log('\nSet-Cookie:', setCookie);
      
      // 2. 使用3a7ba4搜索"太平年"
      console.log('\n2. 使用3a7ba4搜索"太平年":');
      const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
        headers: {
          'Cookie': setCookie
        }
      });
      
      console.log('搜索状态:', searchResponse.status);
      const searchData = await searchResponse.json();
      console.log('搜索结果数量:', searchData.results ? searchData.results.length : 0);
      
      if (searchData.results && searchData.results.length > 0) {
        console.log('\n✓ 搜索成功！');
      } else {
        console.log('\n✗ 搜索失败，没有结果');
      }
    } else {
      console.log('\n登录失败，错误:', loginData.error);
    }
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testLoginWith3a7ba4();
