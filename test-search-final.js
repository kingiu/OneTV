const fetch = require('node-fetch');

async function testSearchFinal() {
  console.log('=== 测试搜索 API（最终验证）===\n');

  // 从 AsyncStorage 读取 cookie
  const cookie = '%257B%2522role%2522%253A%2522owner%2522%252C%2522username%2522%253A%2522admin%2522%252C%2522signature%2522%253A%25223a520c2fe27a7a6646e4cc72351d393819737a69b0dc17e71d7fe72af2938f87%2522%252C%2522timestamp%2522%253A1776086265332%252C%2522loginTime%2522%253A1776086265332%257D';
  
  const headers = {
    'Cookie': `user_auth=${cookie}`,
    'Content-Type': 'application/json'
  };
  
  // 搜索
  console.log('搜索 "危险关系"...');
  const searchResponse = await fetch('http://192.168.100.101:3000/api/search?q=%E5%8D%B1%E9%99%A9%E5%85%B3%E7%B3%BB', {
    headers
  });
  
  const searchData = await searchResponse.json();
  console.log(`搜索结果数量: ${searchData.results?.length || 0}`);
  
  if (searchData.results && searchData.results.length > 0) {
    // 模拟去重逻辑（使用 source_id）
    const seenIds = new Set();
    const deduplicatedResults = searchData.results.filter((r) => {
      const uniqueKey = `${r.source}_${r.id}`;
      if (seenIds.has(uniqueKey)) {
        return false;
      }
      seenIds.add(uniqueKey);
      return true;
    });
    
    console.log(`使用 source_id 去重后: ${deduplicatedResults.length}`);
    
    const sourceNames = new Set(deduplicatedResults.map(r => r.source_name));
    console.log(`去重后的源名称数量: ${sourceNames.size}`);
    console.log(`源名称列表:`, Array.from(sourceNames).join(', '));
    
    const sources = new Set(deduplicatedResults.map(r => r.source));
    console.log(`去重后的源数量: ${sources.size}`);
    console.log(`源列表:`, Array.from(sources).join(', '));
  }
}

testSearchFinal().catch(console.error);
