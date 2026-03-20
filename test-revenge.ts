import { API } from './services/api';

async function testRevenge() {
  try {
    console.log('=== 测试复仇之渊线路数据 ===');
    
    // 创建API实例
    const api = new API('http://localhost:3000'); // 假设API服务器在本地运行
    
    // 搜索复仇之渊
    const searchResults = await api.searchVideo('复仇之渊', 'tencent');
    console.log('搜索结果数量:', searchResults.results.length);
    
    // 遍历搜索结果
    for (let i = 0; i < searchResults.results.length; i++) {
      const result = searchResults.results[i];
      console.log(`\n结果 ${i + 1}:`);
      console.log('标题:', result.title);
      console.log('源:', result.source_name);
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

testRevenge();
