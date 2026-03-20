// 简单的API测试脚本
const axios = require('axios');

// 替换为实际的API地址
const API_BASE_URL = 'http://localhost:3000';

// 测试函数
async function testAPI() {
  try {
    console.log('=== 测试API ===');
    
    // 1. 获取所有资源
    console.log('\n1. 获取所有资源...');
    const resourcesResponse = await axios.get(`${API_BASE_URL}/api/search/resources`);
    const resources = resourcesResponse.data;
    console.log(`找到 ${resources.length} 个资源:`);
    resources.forEach(resource => {
      console.log(`  - ${resource.name} (${resource.key})`);
    });
    
    // 2. 搜索"复仇之渊"
    const query = '复仇之渊';
    console.log(`\n2. 搜索"${query}"...`);
    
    for (const resource of resources) {
      try {
        console.log(`\n搜索 ${resource.name}:`);
        const searchResponse = await axios.get(`${API_BASE_URL}/api/search/one`, {
          params: {
            q: query,
            resourceId: resource.key
          }
        });
        
        const results = searchResponse.data.results;
        console.log(`  找到 ${results.length} 个结果:`);
        results.forEach((result, index) => {
          console.log(`    ${index + 1}. ${result.title} (${result.source_name})`);
          console.log(`       source: ${result.source}, id: ${result.id}`);
        });
      } catch (error) {
        console.error(`  搜索 ${resource.name} 时出错:`, error.message);
      }
    }
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testAPI();
