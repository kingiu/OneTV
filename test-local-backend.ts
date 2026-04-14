import { Api } from './services/api';
import { resourceMatcher } from './services/resourceMatcher';

async function testLocalBackend() {
  console.log('=== 测试本地 LunaTV 后端服务 ===\n');
  
  const api = new Api('http://192.168.100.101:3000');
  const searchQuery = '危险关系 2026';
  
  try {
    console.log(`搜索: ${searchQuery}`);
    
    // 1. 测试搜索功能
    const searchResponse = await api.searchVideos(searchQuery);
    console.log(`\n搜索结果数量: ${searchResponse.results.length}`);
    
    if (searchResponse.results.length > 0) {
      console.log('\n前5个搜索结果:');
      searchResponse.results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} - ${result.source_name} (${result.year || '未知年份'})`);
      });
    }
    
    // 2. 测试详细信息获取
    if (searchResponse.results.length > 0) {
      const firstResult = searchResponse.results[0];
      console.log(`\n=== 测试获取详细信息 ===`);
      console.log(`获取 ${firstResult.title} 的详细信息...`);
      
      const detailResponse = await api.getVideoDetails(firstResult.source, firstResult.id);
      console.log('详细信息获取成功');
      console.log(`剧集数量: ${detailResponse.episodes ? detailResponse.episodes.length : 0}`);
      if (detailResponse.play_sources) {
        console.log(`播放源数量: ${detailResponse.play_sources.length}`);
      }
    }
    
    // 3. 测试匹配算法
    console.log(`\n=== 测试匹配算法 ===`);
    const testMetadata = {
      title: '危险关系',
      year: '2026',
      doubanId: '35065840'
    };
    
    if (searchResponse.results.length > 0) {
      const matchedResults = resourceMatcher.match(searchResponse.results, testMetadata);
      console.log(`匹配结果数量: ${matchedResults.length}`);
      
      if (matchedResults.length > 0) {
        console.log('\n匹配结果（按分数排序）:');
        matchedResults.slice(0, 5).forEach((match, index) => {
          console.log(`${index + 1}. ${match.result.title} - ${match.result.source_name} (分数: ${match.score})`);
        });
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testLocalBackend();
