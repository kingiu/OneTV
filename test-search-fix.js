const fetch = require('node-fetch');

async function testSearch() {
  console.log('=== 测试搜索 API ===\n');

  const query = '危险关系 2026';
  const variants = [query, query.replace(/\s+/g, ''), '危险关系'];
  
  console.log('搜索变体:', variants);
  
  const allResults = [];
  
  for (const variant of variants) {
    console.log(`\n搜索变体: "${variant}"`);
    
    const response = await fetch(`http://192.168.100.101:3000/api/search?q=${encodeURIComponent(variant)}`);
    const data = await response.json();
    
    console.log(`返回结果数量: ${data.results?.length || 0}`);
    
    if (data.results && data.results.length > 0) {
      allResults.push(...data.results);
      console.log(`前3个结果:`, data.results.slice(0, 3).map(r => ({
        source: r.source,
        id: r.id,
        title: r.title
      })));
    }
  }
  
  console.log(`\n合并后总结果数: ${allResults.length}`);
  
  // 模拟去重逻辑
  const seenIds = new Set();
  const deduplicatedResults = allResults.filter((r) => {
    const uniqueKey = `${r.source}_${r.id}`;
    if (seenIds.has(uniqueKey)) {
      return false;
    }
    seenIds.add(uniqueKey);
    return true;
  });
  
  console.log(`使用 source_id 去重后: ${deduplicatedResults.length}`);
  
  // 检查去重的条目
  const duplicates = allResults.filter((r) => {
    const uniqueKey = `${r.source}_${r.id}`;
    if (seenIds.has(uniqueKey)) {
      return true;
    }
    seenIds.add(uniqueKey);
    return false;
  });
  
  console.log(`被去重的条目数: ${duplicates.length}`);
  console.log(`去重示例:`, duplicates.slice(0, 5).map(r => ({
    source: r.source,
    id: r.id,
    title: r.title
  })));
}

testSearch().catch(console.error);
