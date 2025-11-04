// 测试卡券兑换功能
const { api } = require('./services/api');
const { useMembershipStore } = require('./stores/membershipStore');
const AsyncStorage = require('@react-native-async-storage/async-storage');

// 模拟AsyncStorage以便在Node环境中运行
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// 模拟fetch API
global.fetch = jest.fn();

async function testCouponRedeem() {
  console.log('开始测试卡券兑换功能...');
  
  // 测试场景1: 兑换有效的卡券码
  console.log('\n场景1: 兑换有效的卡券码');
  
  // 模拟登录状态
  AsyncStorage.getItem.mockResolvedValueOnce('test-cookie');
  
  // 模拟API响应
  const mockResponse = {
    membership: {
      userName: 'test_user',
      tier: 'premium',
      isActive: true,
      status: 'active',
      createdAt: Date.now(),
      expireTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
      daysRemaining: 30,
    }
  };
  
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  });
  
  try {
    // 调用兑换API
    const result = await api.redeemCoupon('TEST_CODE');
    console.log('API返回结果:', JSON.stringify(result, null, 2));
    
    // 验证缓存更新
    console.log('缓存是否已更新:', AsyncStorage.setItem.mock.calls.length > 0);
    if (AsyncStorage.setItem.mock.calls.length > 0) {
      console.log('缓存内容:', AsyncStorage.setItem.mock.calls[0]);
    }
    
  } catch (error) {
    console.error('场景1测试失败:', error);
  }
  
  // 重置模拟
  jest.clearAllMocks();
  
  // 测试场景2: 兑换无效的卡券码
  console.log('\n场景2: 兑换无效的卡券码');
  
  // 模拟登录状态
  AsyncStorage.getItem.mockResolvedValueOnce('test-cookie');
  
  // 模拟API错误响应
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ message: '无效的卡券码' })
  });
  
  try {
    // 调用兑换API
    const result = await api.redeemCoupon('INVALID_CODE');
    console.log('API返回结果:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('场景2测试失败:', error);
  }
  
  // 重置模拟
  jest.clearAllMocks();
  
  // 测试场景3: 网络错误
  console.log('\n场景3: 网络错误');
  
  // 模拟登录状态
  AsyncStorage.getItem.mockResolvedValueOnce('test-cookie');
  
  // 模拟网络错误
  global.fetch.mockRejectedValueOnce(new Error('Network request failed'));
  
  try {
    // 调用兑换API
    const result = await api.redeemCoupon('TEST_CODE');
    console.log('API返回结果:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('场景3测试失败:', error);
  }
  
  // 检查是否调用了多个端点尝试
  console.log('\nAPI尝试的端点数量:', global.fetch.mock.calls.length);
  if (global.fetch.mock.calls.length > 0) {
    console.log('尝试的第一个端点:', global.fetch.mock.calls[0][0]);
  }
  
  console.log('\n卡券兑换功能测试完成');
}

testCouponRedeem().catch(console.error);