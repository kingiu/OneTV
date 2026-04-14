// 测试后端账号可能的密码
const fetch = require('node-fetch');

const testBackendAccount = async () => {
  console.log('=== 测试后端账号可能的密码 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  const testCredentials = [
    { username: '3a7ba4', password: 'auto_3a7ba4' },
    { username: '3a7ba4', password: '3a7ba4' },
    { username: '3a7ba4', password: '123456' },
    { username: '3a7ba4', password: 'admin123' },
    { username: '3a7ba4', password: '' },
  ];
  
  for (const cred of testCredentials) {
    console.log(`尝试登录: ${cred.username}/${cred.password}`);
    try {
      const loginResponse = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: cred.username, password: cred.password })
      });
      
      console.log(`  状态: ${loginResponse.status}`);
      const loginData = await loginResponse.json();
      console.log(`  响应: ${JSON.stringify(loginData)}`);
      
      if (loginResponse.ok) {
        console.log(`  ✓ 登录成功！`);
        const setCookie = loginResponse.headers.get('Set-Cookie');
        console.log(`  Set-Cookie: ${setCookie}`);
        
        // 测试搜索
        const searchResponse = await fetch(`${baseUrl}/api/search?q=%E5%A4%AA%E5%B9%B3%E5%B9%B4`, {
          headers: {
            'Cookie': setCookie
          }
        });
        console.log(`  搜索状态: ${searchResponse.status}`);
        const searchData = await searchResponse.json();
        console.log(`  搜索结果: ${searchData.results ? searchData.results.length : 0}`);
        return;
      }
    } catch (error) {
      console.log(`  错误: ${error.message}`);
    }
    console.log('');
  }
};

testBackendAccount();
