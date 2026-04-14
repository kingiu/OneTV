// 测试后端注册API的不同参数
const fetch = require('node-fetch');

const testBackendRegisterVariants = async () => {
  console.log('=== 测试后端注册API的不同参数 ===\n');
  
  const baseUrl = 'http://192.168.100.101:3000';
  
  try {
    // 1. 尝试注册，只传username和password
    console.log('1. 尝试注册，只传username和password:');
    const register1 = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'testuser1', password: 'testpass1' })
    });
    console.log('注册状态:', register1.status);
    const data1 = await register1.json();
    console.log('注册响应:', data1);
    
    // 2. 尝试注册，传username、password和confirmPassword
    console.log('\n2. 尝试注册，传username、password和confirmPassword:');
    const register2 = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username: 'testuser2', 
        password: 'testpass2',
        confirmPassword: 'testpass2'
      })
    });
    console.log('注册状态:', register2.status);
    const data2 = await register2.json();
    console.log('注册响应:', data2);
    
    // 3. 尝试注册，传username、password和email
    console.log('\n3. 尝试注册，传username、password和email:');
    const register3 = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        username: 'testuser3', 
        password: 'testpass3',
        email: 'test3@example.com'
      })
    });
    console.log('注册状态:', register3.status);
    const data3 = await register3.json();
    console.log('注册响应:', data3);
    
  } catch (error) {
    console.error('测试错误:', error.message);
  }
};

testBackendRegisterVariants();
