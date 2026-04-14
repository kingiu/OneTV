import { api } from './services/api';

async function testSearchAPI() {
  console.log('=== 测试 /api/search API 返回结果 ===\n');

  const query = '危险关系 2026';
  console.log(`查询: "${query}"`);
  console.log('');

  try {
    // 测试搜索变体生成
    const { resourceMatcher } = await import('./services/resourceMatcher');
    const searchVariants = resourceMatcher.generateSearchVariants(query);
    console.log(`生成的搜索变体: ${JSON.stringify(searchVariants)}`);
    console.log('');

    // 测试每个搜索变体的 API 调用
    for (const variant of searchVariants) {
      console.log(`\n=== 测试搜索变体: "${variant}" ===`);
      try {
        const url = `/api/search?q=${encodeURIComponent(variant)}`;
        console.log(`API URL: ${url}`);
        
        const response = await fetch(url);
        console.log(`响应状态: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const results = data.results || [];
          console.log(`返回结果数量: ${results.length}`);
          
          if (results.length > 0) {
            console.log('\n前5个结果:');
            results.slice(0, 5).forEach((result: any, i: number) => {
              console.log(`  ${i + 1}. ${result.title || result.vod_name} (${result.source_name || result.source}) - 年份: ${result.year || result.vod_year}`);
            });
          }
        } else {
          console.log(`API 调用失败: ${response.statusText}`);
        }
      } catch (error) {
        console.log(`API 调用出错: ${error}`);
      }
    }

    // 测试 api.searchVideos 方法
    console.log('\n\n=== 测试 api.searchVideos 方法 ===');
    const { results } = await api.searchVideos(query);
    console.log(`最终返回结果数量: ${results.length}`);
    
    if (results.length > 0) {
      console.log('\n所有结果:');
      results.forEach((result: any, i: number) => {
        console.log(`  ${i + 1}. ${result.title || result.vod_name} (${result.source_name || result.source}) - 年份: ${result.year || result.vod_year}`);
      });
    }

  } catch (error) {
    console.error('测试失败:', error);
  }

  console.log('\n=== 测试完成 ===');
}

testSearchAPI();
