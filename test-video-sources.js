const { api } = require('./services/api.ts');

// 测试视频源获取
const testVideoSources = async () => {
  console.log('=== 测试视频源获取 ===');
  
  try {
    // 设置 API 基础 URL
    api.setBaseUrl('https://onetv.aisxuexi.com');
    console.log('API 基础 URL 设置为:', api.getBaseUrl());
    
    // 测试后端健康状态
    console.log('\n1. 测试后端健康状态:');
    const healthResponse = await fetch(`${api.getBaseUrl()}/api/health`);
    console.log('健康检查状态:', healthResponse.status);
    console.log('健康检查响应:', await healthResponse.json());
    
    // 测试获取视频源
    console.log('\n2. 测试获取视频源:');
    const sources = await api.getLiveSources();
    console.log('视频源数量:', sources.length);
    console.log('视频源详情:', sources);
    
    // 测试获取资源
    console.log('\n3. 测试获取资源:');
    const resources = await api.getResources();
    console.log('资源数量:', resources.length);
    console.log('资源详情:', resources);
    
  } catch (error) {
    console.error('测试错误:', error);
  }
};

// 运行测试
testVideoSources();
