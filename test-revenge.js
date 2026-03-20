// 测试脚本：验证复仇之渊的线路数据
const axios = require('axios');

async function testRevengeMultiline() {
  try {
    console.log('=== 测试复仇之渊的多线路数据 ===');
    
    // 搜索复仇之渊
    const searchResponse = await axios.get('http://localhost:3000/api/search?q=复仇之渊');
    const searchResults = searchResponse.data.results;
    
    console.log(`搜索结果数量: ${searchResults.length}`);
    
    // 遍历搜索结果
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      console.log(`\n结果 ${i + 1}:`);
      console.log('标题:', result.title);
      console.log('源:', result.source);
      console.log('源名称:', result.source_name);
      console.log('有play_sources:', !!result.play_sources);
      
      if (result.play_sources) {
        console.log('线路数量:', result.play_sources.length);
        result.play_sources.forEach((source, index) => {
          console.log(`线路 ${index + 1}: ${source.name}, 剧集数量: ${source.episodes.length}`);
        });
      } else if (result.episodes) {
        console.log('episodes数量:', result.episodes.length);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testRevengeMultiline();