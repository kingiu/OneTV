const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { api } = require('./services/api');

// 模拟 AsyncStorage
const mockStorage = {};

// 替换 AsyncStorage 方法
AsyncStorage.getItem = async (key) => {
  console.log(`Getting ${key} from storage:`, mockStorage[key]);
  return mockStorage[key];
};

AsyncStorage.setItem = async (key, value) => {
  console.log(`Setting ${key} in storage:`, value);
  mockStorage[key] = value;
};

AsyncStorage.removeItem = async (key) => {
  console.log(`Removing ${key} from storage`);
  delete mockStorage[key];
};

// 测试认证头构建
const testBuildHeaders = async () => {
  console.log('\n=== Testing buildHeaders ===');
  
  // 设置测试凭证
  const testCredentials = {
    username: 'testuser',
    password: 'testpassword'
  };
  
  await AsyncStorage.setItem('mytv_login_credentials', JSON.stringify(testCredentials));
  
  // 构建头
  const headers = await api.buildHeaders();
  
  // 检查头
  console.log('Headers:', Object.fromEntries(headers));
  
  // 检查是否包含认证头
  console.log('X-Auth-Username:', headers.get('X-Auth-Username'));
  console.log('X-Auth-Password:', headers.get('X-Auth-Password'));
};

// 测试登录流程
const testLogin = async () => {
  console.log('\n=== Testing login ===');
  
  try {
    // 设置 API 基础 URL
    api.setBaseUrl('https://onetv.aisxuexi.com');
    
    // 尝试登录
    const response = await api.login('testuser', 'testpassword');
    console.log('Login response:', response);
  } catch (error) {
    console.error('Login error:', error);
  }
};

// 测试 401 处理
const test401Handling = async () => {
  console.log('\n=== Testing 401 handling ===');
  
  try {
    // 设置 API 基础 URL
    api.setBaseUrl('https://onetv.aisxuexi.com');
    
    // 设置测试凭证
    const testCredentials = {
      username: 'testuser',
      password: 'testpassword'
    };
    
    await AsyncStorage.setItem('mytv_login_credentials', JSON.stringify(testCredentials));
    
    // 尝试访问需要认证的端点
    const response = await api.getLiveSources();
    console.log('Get live sources response:', response);
  } catch (error) {
    console.error('401 handling error:', error);
  }
};

// 运行测试
const runTests = async () => {
  try {
    await testBuildHeaders();
    await testLogin();
    await test401Handling();
  } catch (error) {
    console.error('Test error:', error);
  }
};

runTests();
