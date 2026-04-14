const Api = require('./services/api').Api;

async function testSearchResults() {
  console.log('=== 测试 OneTV 前端搜索结果 ===\n');
  
  // 创建 API 实例，连接到本地 LunaTV 后端
  const api = new Api('http://192.168.100.101:3000');
  const searchQuery = '危险关系 2026';
  
  try {
    console.log(`搜索查询: ${searchQuery}`);
    console.log(`API 基础 URL: ${api.getBaseUrl()}`);
    
    // 1. 测试搜索功能
    console.log('\n1. 测试搜索功能...');
    const searchResponse = await api.searchVideos(searchQuery);
    
    console.log(`\n搜索结果统计:`);
    console.log(`总结果数量: ${searchResponse.results.length}`);
    
    if (searchResponse.results.length > 0) {
      console.log('\n前10个搜索结果:');
      searchResponse.results.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} - ${result.source_name} (${result.year || '未知年份'})`);
        console.log(`   来源: ${result.source}, ID: ${result.id}`);
        console.log(`   剧集数量: ${result.episodes ? result.episodes.length : 0}`);
        if (result.play_sources) {
          console.log(`   播放源数量: ${result.play_sources.length}`);
        }
        console.log('');
      });
    }
    
    // 2. 测试不同搜索变体
    console.log('\n2. 测试不同搜索变体...');
    const testQueries = ['危险关系', '危险关系 2026', '危险关系2026', '危險關係 2026'];
    
    for (const testQuery of testQueries) {
      console.log(`\n测试搜索: ${testQuery}`);
      const response = await api.searchVideos(testQuery);
      console.log(`结果数量: ${response.results.length}`);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSearchResults();
