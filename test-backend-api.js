// 测试后端API
const testBackendAPI = async () => {
  console.log('=== 测试后端API ===');
  
  const baseUrl = 'https://onetv.aisxuexi.com';
  let authCookie = '';
  
  try {
    // 1. 测试登录
    console.log('\n1. 测试登录:');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('登录状态:', loginResponse.status);
    
    // 获取认证cookie
    const setCookie = loginResponse.headers.get('Set-Cookie');
    if (setCookie) {
      console.log('获取到Cookie:', setCookie);
      // 提取user_auth cookie
      const cookieParts = setCookie.split(';');
      for (const part of cookieParts) {
        if (part.trim().startsWith('user_auth=')) {
          authCookie = part.trim();
          break;
        }
      }
    }
    
    // 2. 测试后端健康状态
    console.log('\n2. 测试后端健康状态:');
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      headers: {
        'Cookie': authCookie
      }
    });
    console.log('健康检查状态:', healthResponse.status);
    console.log('健康检查响应:', await healthResponse.json());
    
    // 3. 测试获取视频源
    console.log('\n3. 测试获取视频源:');
    const sourcesResponse = await fetch(`${baseUrl}/api/live/sources`, {
      headers: {
        'Cookie': authCookie
      }
    });
    console.log('视频源状态:', sourcesResponse.status);
    console.log('视频源响应:', await sourcesResponse.json());
    
    // 4. 测试获取资源
    console.log('\n4. 测试获取资源:');
    const resourcesResponse = await fetch(`${baseUrl}/api/search/resources`, {
      headers: {
        'Cookie': authCookie
      }
    });
    console.log('资源状态:', resourcesResponse.status);
    console.log('资源响应:', await resourcesResponse.json());
    
  } catch (error) {
    console.error('测试错误:', error);
  }
};

// 运行测试
testBackendAPI();
