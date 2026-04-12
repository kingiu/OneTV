// 测试认证修复
const { api } = require('./services/api');

// 模拟 AsyncStorage
const mockStorage = {
  'mytv_login_credentials': JSON.stringify({
    username: 'testuser',
    password: 'testpassword'
  })
};

// 替换 AsyncStorage 方法
const AsyncStorage = {
  getItem: async (key) => {
    console.log(`Getting ${key} from storage:`, mockStorage[key]);
    return mockStorage[key];
  },
  setItem: async (key, value) => {
    console.log(`Setting ${key} in storage:`, value);
    mockStorage[key] = value;
  },
  removeItem: async (key) => {
    console.log(`Removing ${key} from storage`);
    delete mockStorage[key];
  }
};

// 替换全局 AsyncStorage
global.AsyncStorage = AsyncStorage;

// 测试 buildHeaders 方法
const testBuildHeaders = async () => {
  console.log('\n=== Testing buildHeaders ===');
  
  // 设置 API 基础 URL
  api.setBaseUrl('https://onetv.aisxuexi.com');
  
  // 构建头
  const headers = await api.buildHeaders();
  
  // 检查头
  console.log('Headers:', Object.fromEntries(headers));
  
  // 检查是否包含认证头
  console.log('X-Auth-Username:', headers.get('X-Auth-Username'));
  console.log('X-Auth-Password:', headers.get('X-Auth-Password'));
  console.log('Cookie:', headers.get('Cookie')); // 应该为 null
};

// 运行测试
const runTests = async () => {
  try {
    await testBuildHeaders();
    console.log('\n=== Test completed successfully ===');
  } catch (error) {
    console.error('Test error:', error);
  }
};

runTests();
