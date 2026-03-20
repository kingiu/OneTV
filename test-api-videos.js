const fetch = require('node-fetch');

// 测试 api.searchVideos() 方法
async function testSearchVideos() {
  try {
    const response = await fetch('https://cloudtv.aisxuexi.com/api/search?q=复仇之渊');
    const data = await response.json();
    const { results } = data;
    console.log('搜索结果数量:', results.length);
    results.forEach((item, index) => {
      console.log(`\n结果 ${index}:`);
      console.log(`  source: ${item.source}`);
      console.log(`  source_name: ${item.source_name}`);
      console.log(`  title: ${item.title}`);
      console.log(`  episodes 数量: ${item.episodes.length}`);
      console.log(`  episodes: ${item.episodes}`);
    });
  } catch (error) {
    console.error('搜索失败:', error);
  }
}

testSearchVideos();