import { resourceMatcher } from './services/resourceMatcher';

function testSearchVariants() {
  console.log('=== 测试搜索变体生成 ===');
  
  const testQueries = [
    '危险关系 2026',
    '危险关系',
    '流浪地球2',
    '中餐厅 第九季'
  ];
  
  for (const query of testQueries) {
    const variants = resourceMatcher.generateSearchVariants(query);
    console.log(`查询: "${query}"`);
    console.log(`变体: ${JSON.stringify(variants)}`);
    console.log('---');
  }
}

testSearchVariants();
